const http = require('http');
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { SpeechClient } = require('@google-cloud/speech');
const OpenAI = require('openai');
const axios = require('axios');
const crypto =require('crypto');

const PORT = process.env.PORT || 8080;

// --- API Client Initialization ---

// Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("CRITICAL: Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set. Exiting.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Google Cloud STT
let speechClient = null;
try {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT);
    speechClient = new SpeechClient({
        projectId: process.env.GOOGLE_PROJECT_ID,
        credentials,
    });
} catch (error) {
    console.error("Failed to initialize Google SpeechClient. STT will be disabled.", error);
}

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OpenAI_Key,
});

// ElevenLabs
const ELEVENLABS_API_KEY = process.env.ElevenLabs_Key;

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
    
    // Use a generic goodbye that doesn't rely on TTS, in case that's part of the issue
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
  if (!connectionData || !openai.apiKey) return;

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

/**
 * Starts the AI conversation by sending the initial system prompt and user message.
 * @param {string} connectionId - The unique ID for the WebSocket connection.
 */
function startConversation(connectionId) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData) return;
  
  console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Human detected (or AMD timed out). Starting conversation.`);
  setupCallTimer(connectionId);

  const decodedTopic = decodeURIComponent(connectionData.topic);
  const systemPrompt = `You are a conversational AI. Your topic is "${decodedTopic}". Embody this topic. Be natural and conversational.`;
  
  sendToOpenAI(connectionId, systemPrompt, "system");
  sendToOpenAI(connectionId, `Hello! Let's talk about ${decodedTopic}.`, "user");
}

/**
 * Sends a message to the OpenAI API for processing.
 * This is a placeholder for where you'd integrate with your LLM.
 * @param {string} connectionId - The unique ID for the WebSocket connection.
 * @param {string} message - The message to send.
 * @param {string} role - The role of the sender ('system' or 'user').
 */
function sendToOpenAI(connectionId, message, role) {
    const connectionData = activeConnections.get(connectionId);
    if (!connectionData) return;

    // In a real implementation, you would add the message to the conversation
    // history and then call handleLLM. For this placeholder, we'll just log it.
    console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Pretending to send to OpenAI [${role}]: "${message}"`);
    
    // If the role is 'user', it implies we need a response from the assistant.
    if (role === 'user') {
        handleLLM(connectionId, message);
    } else if (role === 'system') {
        // Just add system messages to history without triggering a response
        connectionData.conversationHistory.push({ role: "system", content: message });
    }
}

/**
 * Polls the database waiting for the AMD result for a given call.
 * @param {string} connectionId - The unique ID for the WebSocket connection.
 * @param {string} callSid - The Twilio Call SID to look for.
 */
async function pollForAmdResult(connectionId, callSid) {
  const maxAttempts = 10;
  const interval = 1000;

  for (let i = 0; i < maxAttempts; i++) {
    const { data: amdRecord, error } = await supabase
      .from('amd_waiting_room')
      .select('*')
      .eq('call_sid', callSid)
      .single();

    if (amdRecord) {
      console.log(`(ID: ${connectionId}, CallSID: ${callSid}) Found AMD result in DB: ${amdRecord.answered_by}. Processing now.`);
      handleAmdDetection(connectionId, amdRecord.answered_by);
      supabase.from('amd_waiting_room').delete().eq('call_sid', callSid); // Fire and forget cleanup
      return;
    }

    if (error && error.code !== 'PGRST116') {
      console.error(`(ID: ${connectionId}, CallSID: ${callSid}) Error checking AMD waiting room:`, error);
      forceEndCall(connectionId, 'Error checking AMD status.');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  console.log(`(ID: ${connectionId}, CallSID: ${callSid}) AMD result not found after ${maxAttempts} attempts. Proceeding as human.`);
  startConversation(connectionId);
}

// --- WebSocket Server ---

const server = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    } else {
        res.writeHead(404);
        res.end();
    }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const connectionId = crypto.randomUUID();
  console.log(`(ID: ${connectionId}) WebSocket connection opened.`);
  let recognizeStream = null;

  activeConnections.set(connectionId, {
    socket: ws,
    callSid: null,
    topic: 'default topic',
    conversationHistory: [],
    shouldWrapUp: false,
    shouldFinishNow: false,
    activeTTS: new Set(),
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    switch (message.event) {
      case "start":
        const { callSid, customParameters } = message.start;
        const connectionData = activeConnections.get(connectionId);
        if(connectionData) {
            connectionData.callSid = callSid;
            connectionData.topic = customParameters.topic || 'general conversation';
            console.log(`(ID: ${connectionId}) Twilio media stream started. CallSid: ${callSid}, Topic: ${connectionData.topic}`);
        }
        
        if (speechClient) {
          recognizeStream = speechClient.streamingRecognize({
            config: { encoding: 'MULAW', sampleRateHertz: 8000, languageCode: 'en-US' },
            interimResults: false,
          })
          .on('error', (error) => console.error(`(ID: ${connectionId}) STT Error:`, error))
          .on('data', (data) => {
            const transcript = data.results[0]?.alternatives[0]?.transcript || '';
            if (transcript) {
              console.log(`(ID: ${connectionId}, CallSID: ${callSid}) Final transcript: "${transcript}"`);
              stopAllTTS(connectionId);
              handleLLM(connectionId, transcript);
            }
          });
          console.log(`(ID: ${connectionId}) STT stream initialized.`);
        }
        
        pollForAmdResult(connectionId, callSid);
        break;

      case "media":
        if (recognizeStream) recognizeStream.write(message.media.payload);
        break;

      case "stop":
        console.log(`(ID: ${connectionId}) Twilio media stream stopped.`);
        cleanup();
        break;
    }
  });

  const cleanup = () => {
    console.log(`(ID: ${connectionId}) Cleaning up connection resources.`);
    clearCallTimers(connectionId);
    if (recognizeStream) recognizeStream.destroy();
    activeConnections.delete(connectionId);
  };
  
  ws.on('close', () => cleanup());
  ws.on('error', () => cleanup());
});

function handleAmdDetection(connectionId, answeredBy) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData) return;

  if (answeredBy && (answeredBy === 'machine_start' || answeredBy === 'fax')) {
    console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Machine/Fax detected ('${answeredBy}'). Ending call.`);
    forceEndCall(connectionId, "Voicemail or fax detected");
  } else {
    startConversation(connectionId);
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is listening on 0.0.0.0:${PORT}`);
});
