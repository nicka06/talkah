require('dotenv').config();
const http = require('http');
const { WebSocket, WebSocketServer } = require('ws');
const { SpeechClient } = require('@google-cloud/speech');
const OpenAI = require('openai');
const axios = require('axios');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;

// --- API Client Initialization ---

// Google Cloud STT
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT;
let speechClient = null;
if (GOOGLE_PROJECT_ID && GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT) {
  try {
    const credentials = JSON.parse(GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT);
    speechClient = new SpeechClient({
      projectId: GOOGLE_PROJECT_ID,
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key.replace(/\\n/g, '\n'),
      },
    });
    console.log("Google SpeechClient initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Google SpeechClient:", error);
  }
} else {
  console.warn("Google Cloud STT env vars not set. STT will be disabled.");
}

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OpenAI_Key,
});
if (process.env.OpenAI_Key) {
    console.log("OpenAI Client initialized.");
} else {
    console.warn("OpenAI_Key not set. LLM will be disabled.");
}

// NOTE: We are no longer using the ElevenLabs Node.js library due to instability.
// We will make direct API calls instead.
const ELEVENLABS_API_KEY = process.env.ElevenLabs_Key;
if (ELEVENLABS_API_KEY) {
    console.log("ElevenLabs API Key found.");
} else {
    console.warn("ElevenLabs_Key not set. TTS will be disabled.");
}

// Store active connection details, including conversation history
const activeConnections = new Map();

// Call duration limits (in milliseconds)
const CALL_DURATION_LIMITS = {
  SOFT_WARNING: 2.5 * 60 * 1000,    // 2:30 - start wrapping up
  URGENT_WARNING: 2.83 * 60 * 1000, // 2:50 - finish immediately  
  HARD_CUTOFF: 3 * 60 * 1000        // 3:00 - end call
};

function setupCallTimer(connectionId) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData) return;

  const startTime = Date.now();
  connectionData.callStartTime = startTime;

  // 2:30 - Soft warning to start concluding
  connectionData.softWarningTimeout = setTimeout(() => {
    console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) 2:30 reached - adding soft wrap-up prompt`);
    connectionData.shouldWrapUp = true;
  }, CALL_DURATION_LIMITS.SOFT_WARNING);

  // 2:50 - Urgent warning to finish immediately
  connectionData.urgentWarningTimeout = setTimeout(() => {
    console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) 2:50 reached - adding urgent finish prompt`);
    connectionData.shouldFinishNow = true;
  }, CALL_DURATION_LIMITS.URGENT_WARNING);

  // 3:00 - Hard cutoff
  connectionData.hardCutoffTimeout = setTimeout(() => {
    console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) 3:00 reached - ending call`);
    endCallHard(connectionId);
  }, CALL_DURATION_LIMITS.HARD_CUTOFF);

  console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Call timer started - 3 minute limit active`);
}

function sendWarningMessage(connectionId, warningText) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData) return;

  console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Sending warning: ${warningText}`);
  
  // Add system message to conversation history
  connectionData.conversationHistory.push({ 
    role: "system", 
    content: `URGENT: ${warningText}` 
  });

  // Generate AI response to the warning
  handleLLM(connectionId, `[SYSTEM WARNING: ${warningText}]`);
}

function forceEndCall(connectionId) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData) return;

  console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Force ending call - 3 minute limit reached`);
  
  // Send a final goodbye message
  handleTTS(connectionId, "Time's up! Thanks for calling. Goodbye!").then(() => {
    // Close the WebSocket connection after the goodbye message
    setTimeout(() => {
      if (connectionData.socket && connectionData.socket.readyState === WebSocket.OPEN) {
        connectionData.socket.close(1000, "Call duration limit reached");
      }
    }, 2000); // Give 2 seconds for the goodbye message to play
  });
}

function clearCallTimers(connectionId) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData) return;

  if (connectionData.timer1) {
    clearTimeout(connectionData.timer1);
    connectionData.timer1 = null;
  }
  if (connectionData.timer2) {
    clearTimeout(connectionData.timer2);
    connectionData.timer2 = null;
  }
  if (connectionData.timer3) {
    clearTimeout(connectionData.timer3);
    connectionData.timer3 = null;
  }
  
  console.log(`(ID: ${connectionId}) Call timers cleared`);
}

// --- Core Logic ---

async function handleLLM(connectionId, transcript) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData || !openai.apiKey) {
    console.log(`(ID: ${connectionId}) LLM skipped: Connection data or API key missing.`);
    return;
  }

  // Add user's message to history
  connectionData.conversationHistory.push({ role: "user", content: transcript });

  // Check if we need to inject time-based prompts
  let modifiedMessages = [...connectionData.conversationHistory];
  
  if (connectionData.shouldFinishNow) {
    // 2:50 - Urgent finish prompt
    modifiedMessages.push({
      role: "system", 
      content: "URGENT: You have only 10 seconds left in this call. End the conversation immediately with a brief, polite goodbye. Do not start new topics or ask questions."
    });
    connectionData.shouldFinishNow = false; // Only inject once
    console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Injected urgent finish prompt`);
  } else if (connectionData.shouldWrapUp) {
    // 2:30 - Soft wrap-up prompt
    modifiedMessages.push({
      role: "system", 
      content: "The call is approaching its time limit. Begin wrapping up the conversation naturally. Start concluding your current topic and prepare for a polite goodbye within the next 30 seconds."
    });
    connectionData.shouldWrapUp = false; // Only inject once
    console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Injected soft wrap-up prompt`);
  }

  console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Sending to OpenAI:`, transcript);

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: modifiedMessages,
      stream: true,
    });

    let sentenceBuffer = "";
    let fullResponse = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        sentenceBuffer += content;
        
        const sentenceEndIndex = sentenceBuffer.search(/[.!?]/);
        if (sentenceEndIndex !== -1) {
          const sentence = sentenceBuffer.substring(0, sentenceEndIndex + 1).trim();
          if (sentence) {
            // Don't await. This lets TTS start for the first sentence 
            // while the LLM works on the next one.
            handleTTS(connectionId, sentence).catch(error => {
              console.error(`(ID: ${connectionId}) TTS error for sentence:`, error.message);
            }); 
          }
          sentenceBuffer = sentenceBuffer.substring(sentenceEndIndex + 1);
        }
      }
    }

    // Send any remaining text in the buffer
    if (sentenceBuffer.trim()) {
      handleTTS(connectionId, sentenceBuffer.trim()).catch(error => {
        console.error(`(ID: ${connectionId}) TTS error for remaining buffer:`, error.message);
      });
    }

    if (fullResponse) {
       console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Full response from OpenAI:`, fullResponse);
       connectionData.conversationHistory.push({ role: "assistant", content: fullResponse });
    }

  } catch (error) {
    console.error(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) OpenAI error:`, error);
  }
}

async function handleTTS(connectionId, textToSpeak) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData || !ELEVENLABS_API_KEY) {
    console.log(`(ID: ${connectionId}) TTS skipped: Connection data or API key missing.`);
    return;
  }

  console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Streaming to ElevenLabs: "${textToSpeak}"`);

  const voiceId = "EXAVITQu4vr4xnSDxMaL"; // Sarah's Voice ID
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=ulaw_8000`;
  
  // Return a promise that resolves when the stream is finished
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios.post(url, {
          text: textToSpeak,
      }, {
          headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json',
              'Accept': 'audio/mulaw'
          },
          responseType: 'stream',
          timeout: 10000 // 10 second timeout
      });

      response.data.on('data', (chunk) => {
        try {
          if (connectionData.socket.readyState === WebSocket.OPEN && connectionData.twilioStreamSid) {
            const audioBase64 = chunk.toString('base64');
            const mediaMessage = JSON.stringify({
              event: "media",
              streamSid: connectionData.twilioStreamSid,
              media: {
                payload: audioBase64,
              },
            });
            connectionData.socket.send(mediaMessage);
          }
        } catch (error) {
          console.error(`(ID: ${connectionId}) Error sending audio data:`, error.message);
        }
      });

      response.data.on('end', () => {
        console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Finished streaming TTS for: "${textToSpeak}"`);
        resolve();
      });

      response.data.on('error', (err) => {
        console.error(`(ID: ${connectionId}) ElevenLabs stream error:`, err.message);
        resolve(); // Resolve instead of reject to prevent crashes
      });

    } catch (error) {
      console.error(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) ElevenLabs error:`, error.response ? error.response.status : error.message);
      resolve(); // Resolve instead of reject to prevent crashes
    }
  });
}

// --- WebSocket Server ---

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket server is running.');
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const connectionId = crypto.randomUUID();
  console.log(`(ID: ${connectionId}) WebSocket connection opened.`);
  activeConnections.set(connectionId, { socket: ws, conversationHistory: [] });

  let recognizeStream = null;

  ws.on('message', async (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
      const connectionData = activeConnections.get(connectionId);
      if (!connectionData) return;

      switch (message.event) {
        case 'start':
          const { streamSid, customParameters } = message.start;
          const { callSid, topic, languageCode = 'en-US' } = customParameters;
          
          console.log(`(ID: ${connectionId}) Twilio media stream started. SID: ${streamSid}, CallSid: ${callSid}`);
          
          connectionData.twilioStreamSid = streamSid;
          connectionData.callSid = callSid;

          // Setup 3-minute call timer
          setupCallTimer(connectionId);

          // Setup conversation
          const decodedTopic = decodeURIComponent(topic);
          const systemPrompt = `You are a conversational AI that embodies and acts on the given topic directly. Topic: "${decodedTopic}". Instead of asking questions about the topic, immediately start acting, speaking, or behaving according to what the topic describes. If it's a character or persona, become that character. If it's a style of speaking, use that style. If it's an activity or subject, dive right into it. Be natural and conversational while fully embodying the topic throughout the conversation.`;
          connectionData.conversationHistory.push({ role: "system", content: systemPrompt });

          // Generate an appropriate initial response based on the topic
          let initialGreeting;
          const topicLower = decodedTopic.toLowerCase();
          
          if (topicLower.includes('pirate')) {
            initialGreeting = "Ahoy there, matey! Welcome aboard me ship!";
          } else if (topicLower.includes('shakespeare') || topicLower.includes('elizabethan')) {
            initialGreeting = "Hark! Good morrow to thee, fair friend!";
          } else if (topicLower.includes('robot') || topicLower.includes('ai')) {
            initialGreeting = "GREETINGS, HUMAN. INITIATING CONVERSATION PROTOCOL.";
          } else if (topicLower.includes('southern') || topicLower.includes('cowboy')) {
            initialGreeting = "Well howdy there, partner! Nice to make your acquaintance!";
          } else if (topicLower.includes('meditation') || topicLower.includes('zen')) {
            initialGreeting = "Take a deep breath... Let's find peace together in this moment.";
          } else if (topicLower.includes('coach') || topicLower.includes('motivational')) {
            initialGreeting = "Hey there, champion! Ready to unlock your potential? Let's go!";
          } else {
            // Default: try to embody the topic directly
            initialGreeting = `Hello! I'm ready to dive into ${decodedTopic} with you right now!`;
          }
          
          connectionData.conversationHistory.push({ role: "assistant", content: initialGreeting });
          
          // SPEED OPTIMIZATION: Start STT immediately, don't wait for TTS
          if (speechClient) {
            console.log(`(ID: ${connectionId}) Initializing STT stream.`);
            try {
              recognizeStream = speechClient.streamingRecognize({
                config: {
                  encoding: 'MULAW',
                  sampleRateHertz: 8000,
                  languageCode: languageCode,
                  profanityFilter: false,
                  enableAutomaticPunctuation: true,
                },
                interimResults: true,
              })
              .on('error', (err) => {
                  console.error(`(ID: ${connectionId}) STT Error:`, err.message);
                  // Don't close WebSocket on STT error, just log it
                  if (recognizeStream) {
                    recognizeStream.destroy();
                    recognizeStream = null;
                  }
              })
              .on('data', (data) => {
                  try {
                    const result = data.results[0];
                    if (result && result.alternatives[0] && result.isFinal) {
                      const transcript = result.alternatives[0].transcript.trim();
                      if (transcript) {
                         handleLLM(connectionId, transcript);
                      }
                    }
                  } catch (error) {
                    console.error(`(ID: ${connectionId}) STT data processing error:`, error.message);
                  }
              });
              console.log(`(ID: ${connectionId}) STT stream ready.`);
            } catch (error) {
              console.error(`(ID: ${connectionId}) Failed to initialize STT:`, error.message);
            }
          }
          
          // Start initial greeting TTS (non-blocking)
          handleTTS(connectionId, initialGreeting).catch(error => {
            console.error(`(ID: ${connectionId}) Initial TTS error:`, error.message);
          });
          break;

        case 'media':
          if (recognizeStream) {
            recognizeStream.write(Buffer.from(message.media.payload, 'base64'));
          }
          break;
        
        case 'stop':
          console.log(`(ID: ${connectionId}) Twilio media stream stopped.`);
          if (recognizeStream) {
            recognizeStream.destroy();
            recognizeStream = null;
          }
          ws.close(1000, "Stream stopped");
          break;
      }
    } catch (err) {
      console.error(`(ID: ${connectionId}) Error processing message:`, err);
    }
  });

  const cleanup = () => {
      console.log(`(ID: ${connectionId}) Cleaning up connection.`);
      if (recognizeStream) {
        recognizeStream.destroy();
        recognizeStream = null;
      }
      // Clear all call timers
      clearCallTimers(connectionId);
      activeConnections.delete(connectionId);
  }

  ws.on('close', (code, reason) => {
    console.log(`(ID: ${connectionId}) WebSocket closed. Code: ${code}, Reason: ${reason}`);
    cleanup();
  });

  ws.on('error', (err) => {
    console.error(`(ID: ${connectionId}) WebSocket error:`, err);
    cleanup();
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server listening on port ${PORT}`);
}); 