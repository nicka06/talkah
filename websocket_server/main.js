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

// --- Core Logic ---

async function handleLLM(connectionId, transcript) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData || !openai.apiKey) {
    console.log(`(ID: ${connectionId}) LLM skipped: Connection data or API key missing.`);
    return;
  }

  // Add user's message to history
  connectionData.conversationHistory.push({ role: "user", content: transcript });
  console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Sending to OpenAI:`, transcript);

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o", // Or another suitable model
      messages: connectionData.conversationHistory,
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
      }
    }
    
    if (fullResponse) {
       console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Received from OpenAI:`, fullResponse);
       // Add AI's response to history
       connectionData.conversationHistory.push({ role: "assistant", content: fullResponse });
       await handleTTS(connectionId, fullResponse);
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

  console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Sending to ElevenLabs: "${textToSpeak}"`);

  const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel's Voice ID
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=ulaw_8000`;
  
  try {
    const response = await axios.post(url, {
        text: textToSpeak,
        model_id: "eleven_turbo_v2",
    }, {
        headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'audio/mulaw'
        },
        responseType: 'arraybuffer' // Get the response as a raw buffer
    });

    const audioBase64 = Buffer.from(response.data, 'binary').toString('base64');
    
    if (connectionData.socket.readyState === WebSocket.OPEN && connectionData.twilioStreamSid) {
      const mediaMessage = JSON.stringify({
        event: "media",
        streamSid: connectionData.twilioStreamSid,
        media: {
          payload: audioBase64,
        },
      });
      connectionData.socket.send(mediaMessage);
      console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Sent TTS audio to Twilio.`);
    }

  } catch (error) {
    console.error(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) ElevenLabs error:`, error.response ? error.response.data : error.message);
  }
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

          // Setup conversation
          const decodedTopic = decodeURIComponent(topic);
          const systemPrompt = `You are a conversational AI. The topic is "${decodedTopic}". Guide the user through a 10-minute conversation on this topic. Be engaging and ask open-ended questions. At 9 minutes 50 seconds, provide a wrap-up prompt.`;
          connectionData.conversationHistory.push({ role: "system", content: systemPrompt });

          const initialGreeting = `Hello! Let's talk about ${decodedTopic}. What are your initial thoughts on it?`;
          connectionData.conversationHistory.push({ role: "assistant", content: initialGreeting });
          await handleTTS(connectionId, initialGreeting);
          
          if (speechClient) {
            console.log(`(ID: ${connectionId}) Initializing STT stream.`);
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
                console.error(`(ID: ${connectionId}) STT Error:`, err);
                if (ws.readyState === ws.OPEN) ws.close(1011, "STT Error");
            })
            .on('data', (data) => {
                const result = data.results[0];
                if (result && result.alternatives[0] && result.isFinal) {
                  const transcript = result.alternatives[0].transcript.trim();
                  if (transcript) {
                     handleLLM(connectionId, transcript);
                  }
                }
            });
            console.log(`(ID: ${connectionId}) STT stream ready.`);
          }
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