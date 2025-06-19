const http = require('http');
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { SpeechClient } = require('@google-cloud/speech');
const OpenAI = require('openai');
const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');

const PORT = process.env.PORT || 8080;
const WEBSOCKET_URL = process.env.EXTERNAL_WEBSOCKET_SERVICE_URL || `ws://localhost:${PORT}`;

// --- API Client Initialization ---

// Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("CRITICAL: Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set. Exiting.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);
console.log("Supabase client initialized.");

// Google Cloud STT
let speechClient = null;
try {
    console.log("Attempting to initialize Google SpeechClient...");
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT;
    if (!credentialsJson) {
        throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT is not set.");
    }
    const credentials = JSON.parse(credentialsJson);
    speechClient = new SpeechClient({
        projectId: process.env.GOOGLE_PROJECT_ID,
        credentials,
    });
    console.log("Google SpeechClient initialized successfully.");
} catch (error) {
    console.error("CRITICAL: Failed to initialize Google SpeechClient. STT will be disabled.", error);
}

// OpenAI
let openai;
try {
    console.log("Attempting to initialize OpenAI client...");
    const openaiApiKey = process.env.OpenAI_Key;
    if (!openaiApiKey) {
        throw new Error("OpenAI_Key is not set.");
    }
    openai = new OpenAI({
      apiKey: openaiApiKey,
    });
    console.log("OpenAI client initialized successfully.");
} catch (error) {
    console.error("CRITICAL: Failed to initialize OpenAI client.", error);
}

// ElevenLabs
const ELEVENLABS_API_KEY = process.env.ElevenLabs_Key;
if (!ELEVENLABS_API_KEY) {
    console.warn("ElevenLabs_Key is not set. TTS will be disabled.");
} else {
    console.log("ElevenLabs API key found.");
}

// --- Globals ---

const activeConnections = new Map();
const CALL_DURATION_LIMITS = {
  SOFT_WARNING: 2.5 * 60 * 1000,
  URGENT_WARNING: 2.83 * 60 * 1000,
  HARD_CUTOFF: 3 * 60 * 1000
};

// --- Core Functions ---

function setupCallTimer(connectionId) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData) return;

  const { callSid } = connectionData;

  connectionData.softWarningTimeout = setTimeout(() => {
    console.log(`(ID: ${connectionId}, CallSID: ${callSid}) 2:30 reached - adding soft wrap-up prompt`);
    connectionData.shouldWrapUp = true;
  }, CALL_DURATION_LIMITS.SOFT_WARNING);

  connectionData.urgentWarningTimeout = setTimeout(() => {
    console.log(`(ID: ${connectionId}, CallSID: ${callSid}) 2:50 reached - adding urgent finish prompt`);
    connectionData.shouldFinishNow = true;
  }, CALL_DURATION_LIMITS.URGENT_WARNING);

  connectionData.hardCutoffTimeout = setTimeout(() => {
    console.log(`(ID: ${connectionId}, CallSID: ${callSid}) 3:00 reached - ending call`);
    forceEndCall(connectionId);
  }, CALL_DURATION_LIMITS.HARD_CUTOFF);

  console.log(`(ID: ${connectionId}, CallSID: ${callSid}) Call timer started - 3 minute limit active`);
}

function clearCallTimers(connectionId) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData) return;

  clearTimeout(connectionData.softWarningTimeout);
  clearTimeout(connectionData.urgentWarningTimeout);
  clearTimeout(connectionData.hardCutoffTimeout);
  console.log(`(ID: ${connectionId}) Call timers cleared`);
}

function forceEndCall(connectionId, reason = "Call duration limit reached") {
    const connectionData = activeConnections.get(connectionId);
    if (!connectionData) return;

    console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Force ending call. Reason: ${reason}`);
    
    if (connectionData.socket && connectionData.socket.readyState === WebSocket.OPEN) {
        connectionData.socket.close(1000, reason);
    }
}

function stopAllTTS(connectionId) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData || !connectionData.activeTTS) return;

  const activeCount = connectionData.activeTTS.size;
  if (activeCount > 0) {
    console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Stopping ${activeCount} active TTS streams due to user speech`);
    connectionData.activeTTS.clear();
    if (connectionData.interruptTTS) {
      connectionData.interruptTTS();
    }
  }
}

async function handleLLM(connectionId, transcript) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData || !openai) return;

  connectionData.conversationHistory.push({ role: "user", content: transcript });

  let modifiedMessages = [...connectionData.conversationHistory];
  if (connectionData.shouldFinishNow) {
    modifiedMessages.push({ role: "system", content: "URGENT: You have only 10 seconds left. End the conversation immediately with a brief, polite goodbye." });
    connectionData.shouldFinishNow = false;
  } else if (connectionData.shouldWrapUp) {
    modifiedMessages.push({ role: "system", content: "The call is approaching its time limit. Start wrapping up the conversation naturally." });
    connectionData.shouldWrapUp = false;
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
          if (sentence) handleTTS(connectionId, sentence);
          sentenceBuffer = sentenceBuffer.substring(sentenceEndIndex + 1);
        }
      }
    }
    if (sentenceBuffer.trim()) handleTTS(connectionId, sentenceBuffer.trim());
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
    if (!connectionData || !ELEVENLABS_API_KEY || !textToSpeak) return;

    const ttsId = crypto.randomUUID();
    connectionData.activeTTS.add(ttsId);

    console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Streaming to ElevenLabs: "${textToSpeak}"`);
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'}/stream?output_format=ulaw_8000`;

    try {
        const response = await axios.post(url, { text: textToSpeak }, {
            headers: { 'xi-api-key': ELEVENLABS_API_KEY },
            responseType: 'stream'
        });

        const stream = response.data;
        stream.on('data', (chunk) => {
            if (connectionData.activeTTS.has(ttsId) && connectionData.socket.readyState === WebSocket.OPEN) {
                const message = JSON.stringify({
                    event: "media",
                    streamSid: connectionData.streamSid,
                    media: { payload: chunk.toString('base64') }
                });
                connectionData.socket.send(message);
            } else {
                stream.destroy();
            }
        });

        await new Promise((resolve, reject) => {
            stream.on('end', resolve);
            stream.on('error', reject);
        });

    } catch (error) {
        console.error(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) ElevenLabs error:`, error.response ? error.response.status : error.message);
    } finally {
        if (connectionData.activeTTS.has(ttsId)) {
          console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Finished streaming TTS for: "${textToSpeak}"`);
          connectionData.activeTTS.delete(ttsId);
        }
    }
}

function startConversation(connectionId) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData) return;

  console.log(
    `(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Starting conversation.`
  );
  setupCallTimer(connectionId);

  const decodedTopic = decodeURIComponent(connectionData.topic);
  const systemPrompt = `You are a conversational voice AI. Your primary goal is to have a natural, engaging, spoken conversation. Adhere to the following rules at all times:
1.  **One Thought Per Turn:** Respond with only one or two sentences at a time. Your goal is a fast-paced, back-and-forth conversation. Do not deliver long monologues. Wait for the user to speak before continuing.
2.  **Use Simple, Spoken Language:** Write as if you were speaking. Avoid complex vocabulary, long sentences, and formal language. Your tone should be friendly and natural.
3.  **Absolutely No Lists or Formatting:** Never use bullet points, numbered lists, or any markdown formatting. All responses must be in simple, plain paragraphs.
4.  **Be an Active Listener:** Pay close attention to the user's questions and the words they use. Adapt your response to their input and sound like you are genuinely engaged in the dialogue.
5.  **Your Topic:** The central theme of our conversation is "${decodedTopic}". Weave this topic into the conversation naturally, don't just state facts about it.`;
  
  sendToOpenAI(connectionId, systemPrompt, "system");

  const firstUserMessage = `Hello! Let's talk about ${decodedTopic}.`;
  
  console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Pretending to send to OpenAI [user]: "${firstUserMessage}"`);
  handleLLM(connectionId, firstUserMessage);
}

function sendToOpenAI(connectionId, message, role) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData) return;

  if (role === 'user') {
    handleLLM(connectionId, message);
  } else {
    connectionData.conversationHistory.push({ role: "system", content: message });
  }
}

// --- TwiML Generation ---

function getGatherTwiML(serverUrl) {
    const actionUrl = new URL('/twilio-voice', serverUrl.replace('ws://', 'http://').replace('wss://', 'https://')).href;
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" timeout="5" numDigits="1" action="${actionUrl}" method="POST">
    <Say>Hello. To speak with our AI assistant, Talkah, please press 1.</Say>
  </Gather>
  <Say>We did not receive any input. Goodbye.</Say>
  <Hangup/>
</Response>`;
}

function getConnectTwiML(callSid, topic) {
  const encodedTopic = encodeURIComponent(topic);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${WEBSOCKET_URL}">
      <Parameter name="callSid" value="${callSid}"/>
      <Parameter name="topic" value="${encodedTopic}"/>
    </Stream>
  </Connect>
</Response>`;
}

function getHangupTwiML(message) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${message}</Say>
  <Hangup/>
</Response>`;
}

// --- HTTP & WebSocket Server ---

const server = http.createServer(async (req, res) => {
  const { url, method } = req;
  const requestUrl = new URL(url, `http://${req.headers.host}`);

  if (requestUrl.pathname === '/health' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else if (requestUrl.pathname === '/twilio-voice' && method === 'POST') {
     try {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            const params = querystring.parse(body);
            const callSid = params.CallSid;
            const digits = params.Digits;

            console.log(`HTTP: Request received for CallSid: ${callSid}, Digits: ${digits}`);

            if (!digits) {
                console.log(`HTTP: No digits for ${callSid}. Playing welcome message.`);
                res.writeHead(200, { 'Content-Type': 'application/xml' });
                res.end(getGatherTwiML(WEBSOCKET_URL));
            } else if (digits === '1') {
                console.log(`HTTP: User pressed 1 for ${callSid}. Connecting to WebSocket.`);
                const { data, error } = await supabase
                    .from('calls')
                    .select('topic')
                    .eq('twilio_call_sid', callSid)
                    .single();
                
                if (error || !data) {
                    console.error(`HTTP: Error fetching topic for ${callSid}:`, error);
                    res.writeHead(200, { 'Content-Type': 'application/xml' });
                    res.end(getHangupTwiML('An error occurred. Please try again later.'));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/xml' });
                    res.end(getConnectTwiML(callSid, data.topic));
                }
            } else {
                console.log(`HTTP: User pressed invalid digits '${digits}' for ${callSid}.`);
                res.writeHead(200, { 'Content-Type': 'application/xml' });
                res.end(getHangupTwiML('You have pressed an invalid key. Goodbye.'));
            }
        });
    } catch (error) {
        console.error('HTTP: Error in /twilio-voice handler:', error);
        res.writeHead(500, { 'Content-Type': 'application/xml' });
        res.end(getHangupTwiML('An internal server error occurred.'));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);
    
    // Only handle WebSocket upgrade requests for the root path
    if (pathname === '/') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        // For other paths, you can choose to destroy the socket or handle them differently
        socket.destroy();
    }
});

wss.on('connection', (socket, req) => {
  const connectionId = crypto.randomUUID();
  console.log(`(ID: ${connectionId}) WebSocket connection opened.`);
  
  const connectionData = {
    socket,
    callSid: null,
    streamSid: null,
    topic: 'general conversation',
    conversationHistory: [],
    activeTTS: new Set(),
    isFirstPacket: true,
    recognizeStream: null,
    interruptTTS: null,
    shouldWrapUp: false,
    shouldFinishNow: false,
    softWarningTimeout: null,
    urgentWarningTimeout: null,
    hardCutoffTimeout: null,
  };
  activeConnections.set(connectionId, connectionData);

  let recognizeStream = null;

  socket.on('message', (message) => {
    const msg = JSON.parse(message);

    switch (msg.event) {
      case 'connected': {
        const { protocol, version } = msg;
        console.log(`(ID: ${connectionId}) Twilio media stream connected. Protocol: ${protocol}, Version: ${version}`);
        break;
      }
      case 'start': {
        const { start } = msg;
        const { callSid, streamSid, customParameters } = start;
        
        if (connectionData) {
          connectionData.callSid = callSid;
          connectionData.streamSid = streamSid;
          connectionData.topic = 
            (customParameters && customParameters.topic) || "general conversation";
          console.log(
            `(ID: ${connectionId}) Twilio media stream started. CallSid: ${callSid}, StreamSid: ${streamSid}, Topic: ${connectionData.topic}`
          );
          startConversation(connectionId);
        }

        if (speechClient) {
          try {
            recognizeStream = speechClient
              .streamingRecognize({
                config: {
                  encoding: 'MULAW',
                  sampleRateHertz: 8000,
                  languageCode: 'en-US',
                  model: 'telephony',
                  enableAutomaticPunctuation: true,
                },
                interimResults: false,
              })
              .on('error', (error) => {
                  console.error(`(ID: ${connectionId}, CallSID: ${callSid}) STT Error:`, error);
                  if(error.code === 11) {
                     console.error(`(ID: ${connectionId}) STT stream timed out. Closing connection.`);
                      forceEndCall(connectionId, "STT idle timeout");
                  }
              })
              .on('data', (data) => {
                if (data.results && data.results[0] && data.results[0].alternatives[0]) {
                  const transcript = data.results[0].alternatives[0].transcript.trim();
                  console.log(`(ID: ${connectionId}, CallSID: ${callSid}) Final transcript: "${transcript}"`);
                  stopAllTTS(connectionId);
                  sendToOpenAI(connectionId, transcript, 'user');
                }
              });

            console.log(`(ID: ${connectionId}) STT stream initialized successfully.`);
            connectionData.recognizeStream = recognizeStream;
          } catch(err) {
            console.error(`(ID: ${connectionId}) Failed to create STT stream:`, err);
            forceEndCall(connectionId, "STT initialization failed");
          }
        } else {
            console.error(`(ID: ${connectionId}) speechClient is not initialized. STT will not work.`);
        }
        break;
      }
      case 'media': {
        if (recognizeStream) {
          recognizeStream.write(msg.media.payload);
        }
        break;
      }
      case 'stop': {
        console.log(`(ID: ${connectionId}) Twilio media stream stopped.`);
        const cleanup = () => {
          console.log(`(ID: ${connectionId}) Cleaning up connection resources.`);
          clearCallTimers(connectionId);
          if (recognizeStream) {
              recognizeStream.destroy();
          }
          activeConnections.delete(connectionId);
        };
        setTimeout(cleanup, 500);
        break;
      }
    }
  });

  socket.on('close', (code, reason) => {
    console.log(`(ID: ${connectionId}) WebSocket connection closed. Code: ${code}, Reason: ${reason}`);
    const cleanup = () => {
      console.log(`(ID: ${connectionId}) Cleaning up connection resources.`);
      clearCallTimers(connectionId);
      if (recognizeStream) {
          recognizeStream.destroy();
      }
      activeConnections.delete(connectionId);
    };
    setTimeout(cleanup, 500);
  });

  socket.on('error', (error) => {
    console.error(`(ID: ${connectionId}) WebSocket error:`, error);
  });
});

server.listen(PORT, () => {
    console.log(`🚀 Server is listening on port ${PORT}`);
});
