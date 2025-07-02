const http = require('http');
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { SpeechClient } = require('@google-cloud/speech');
const OpenAI = require('openai');
const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');

/**
 * WebSocket Server for Real-Time AI Communication
 * 
 * This server handles real-time voice conversations between users and AI assistants.
 * It integrates multiple AI services to provide a complete voice communication experience:
 * 
 * Core Features:
 * - Real-time WebSocket connections for voice streaming
 * - Speech-to-Text (STT) using Google Cloud Speech API
 * - Text-to-Speech (TTS) using ElevenLabs API
 * - AI conversation handling using OpenAI GPT-4
 * - Call duration management and limits
 * - Integration with Supabase for data persistence
 * - Twilio integration for phone call handling
 * 
 * Architecture:
 * - WebSocket server for real-time communication
 * - HTTP server for Twilio webhook endpoints
 * - Multiple AI service integrations
 * - Call state management and cleanup
 */

const PORT = process.env.PORT || 8080;
const WEBSOCKET_URL = process.env.EXTERNAL_WEBSOCKET_SERVICE_URL || `ws://localhost:${PORT}`;

// --- API Client Initialization ---

/**
 * Supabase Client Setup
 * 
 * Initializes the Supabase client for database operations.
 * Uses service role key for elevated permissions to manage user data,
 * call records, and conversation history.
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("CRITICAL: Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set. Exiting.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);
console.log("Supabase client initialized.");

/**
 * Google Cloud Speech-to-Text Client Setup
 * 
 * Initializes the Google Cloud Speech client for converting audio to text.
 * Uses JSON credentials stored in environment variables for authentication.
 * This service is critical for understanding user speech during calls.
 */
let speechClient = null;
try {
    console.log("🔍 Attempting to initialize Google SpeechClient...");
    console.log("Environment check:", {
        hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT,
        credentialsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT ? process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT.length : 0,
        hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
        projectId: process.env.GOOGLE_PROJECT_ID || 'NOT_SET'
    });

    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT;
    if (!credentialsJson) {
        throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT is not set.");
    }
    
    let credentials;
    try {
        credentials = JSON.parse(credentialsJson);
        console.log("✅ Credentials JSON parsed successfully:", {
            hasPrivateKey: !!credentials.private_key,
            hasClientEmail: !!credentials.client_email,
            projectIdFromCredentials: credentials.project_id || 'NOT_IN_CREDENTIALS',
            clientEmail: credentials.client_email || 'NOT_SET'
        });
    } catch (parseError) {
        throw new Error(`Failed to parse credentials JSON: ${parseError.message}`);
    }

    const finalProjectId = process.env.GOOGLE_PROJECT_ID || credentials.project_id;
    console.log("🎯 Using project ID:", finalProjectId);

    speechClient = new SpeechClient({
        projectId: finalProjectId,
        credentials,
    });
    console.log("✅ Google SpeechClient initialized successfully.");
} catch (error) {
    console.error("🚨 CRITICAL: Failed to initialize Google SpeechClient. STT will be disabled.", {
        error: error.message,
        stack: error.stack
    });
}

/**
 * OpenAI Client Setup
 * 
 * Initializes the OpenAI client for AI conversation handling.
 * Uses GPT-4o-mini model for generating intelligent responses to user input.
 * This is the core AI brain of the conversation system.
 */
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

/**
 * ElevenLabs API Key Setup
 * 
 * Configures the ElevenLabs API key for Text-to-Speech functionality.
 * This service converts AI responses back to natural-sounding speech.
 * Uses a specific voice ID for consistent AI voice across conversations.
 */
const ELEVENLABS_API_KEY = process.env.ElevenLabs_Key;
if (!ELEVENLABS_API_KEY) {
    console.warn("ElevenLabs_Key is not set. TTS will be disabled.");
} else {
    console.log("ElevenLabs API key found.");
}

// --- Global State Management ---

/**
 * Active Connections Map
 * 
 * Tracks all active WebSocket connections and their associated data:
 * - WebSocket instance
 * - Call metadata (CallSID, user info)
 * - Conversation history
 * - Call timers and state flags
 * - Active TTS streams
 */
const activeConnections = new Map();

/**
 * Call Duration Limits Configuration
 * 
 * Defines time-based limits for call management:
 * - SOFT_WARNING: 2.5 minutes - gentle wrap-up prompt
 * - URGENT_WARNING: 2.83 minutes - urgent finish prompt  
 * - HARD_CUTOFF: 3 minutes - forced call termination
 */
const CALL_DURATION_LIMITS = {
  SOFT_WARNING: 2.5 * 60 * 1000,
  URGENT_WARNING: 2.83 * 60 * 1000,
  HARD_CUTOFF: 3 * 60 * 1000
};

// --- Core Call Management Functions ---

/**
 * Sets up call duration timers for a connection
 * 
 * Creates three timers to manage call duration:
 * 1. Soft warning at 2:30 - suggests wrapping up
 * 2. Urgent warning at 2:50 - strongly suggests ending
 * 3. Hard cutoff at 3:00 - forces call termination
 * 
 * @param {string} connectionId - Unique identifier for the connection
 */
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

/**
 * Clears all call duration timers for a connection
 * 
 * Called when a call ends normally to prevent timer-based call termination.
 * 
 * @param {string} connectionId - Unique identifier for the connection
 */
function clearCallTimers(connectionId) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData) return;

  clearTimeout(connectionData.softWarningTimeout);
  clearTimeout(connectionData.urgentWarningTimeout);
  clearTimeout(connectionData.hardCutoffTimeout);
  console.log(`(ID: ${connectionId}) Call timers cleared`);
}

/**
 * Forces the termination of a call
 * 
 * Called when call duration limits are exceeded or other critical issues occur.
 * Closes the WebSocket connection and logs the reason for termination.
 * 
 * @param {string} connectionId - Unique identifier for the connection
 * @param {string} reason - Reason for forced call termination
 */
function forceEndCall(connectionId, reason = "Call duration limit reached") {
    const connectionData = activeConnections.get(connectionId);
    if (!connectionData) return;

    console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Force ending call. Reason: ${reason}`);
    
    if (connectionData.socket && connectionData.socket.readyState === WebSocket.OPEN) {
        connectionData.socket.close(1000, reason);
    }
}

/**
 * Stops all active Text-to-Speech streams for a connection
 * 
 * Called when user speech is detected to prevent AI from talking over the user.
 * Clears all active TTS streams and interrupts any currently playing audio.
 * 
 * @param {string} connectionId - Unique identifier for the connection
 */
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

/**
 * Handles AI conversation processing using OpenAI
 * 
 * Processes user transcripts through OpenAI GPT-4o-mini to generate intelligent responses.
 * Manages conversation history and applies time-based prompts for call management.
 * Streams responses sentence-by-sentence for natural conversation flow.
 * 
 * @param {string} connectionId - Unique identifier for the connection
 * @param {string} transcript - User's speech converted to text
 */
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

/**
 * Handles Text-to-Speech conversion using ElevenLabs
 * 
 * Converts AI text responses to natural-sounding speech using ElevenLabs API.
 * Streams audio data back to the client for real-time playback.
 * Manages TTS stream lifecycle and cleanup.
 * 
 * @param {string} connectionId - Unique identifier for the connection
 * @param {string} textToSpeak - Text to convert to speech
 */
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

/**
 * Starts a new conversation for a connection
 * 
 * Initializes the conversation with system prompts and begins the AI interaction.
 * Sets up call timers and sends the initial greeting to start the conversation flow.
 * 
 * @param {string} connectionId - Unique identifier for the connection
 */
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

/**
 * Sends messages to OpenAI for processing
 * 
 * Routes user messages to the LLM handler and system messages to conversation history.
 * Manages the flow of messages between user input and AI processing.
 * 
 * @param {string} connectionId - Unique identifier for the connection
 * @param {string} message - Message content to send
 * @param {string} role - Role of the message sender ('user' or 'system')
 */
function sendToOpenAI(connectionId, message, role) {
  const connectionData = activeConnections.get(connectionId);
  if (!connectionData) return;

  if (role === 'user') {
    handleLLM(connectionId, message);
  } else {
    connectionData.conversationHistory.push({ role: "system", content: message });
  }
}

// --- TwiML Generation Functions ---

/**
 * Generates TwiML for call gathering (DTMF input)
 * 
 * Creates TwiML markup for collecting user input via phone keypad.
 * Used when users call in and need to press a key to connect to the AI.
 * 
 * @param {string} serverUrl - Base URL of the server for action endpoints
 * @returns {string} TwiML markup for gathering user input
 */
function getGatherTwiML(serverUrl) {
    // Convert WebSocket URL to HTTP URL for Twilio webhook
    let httpUrl = serverUrl;
    if (httpUrl.startsWith('ws://')) {
        httpUrl = httpUrl.replace('ws://', 'http://');
    } else if (httpUrl.startsWith('wss://')) {
        httpUrl = httpUrl.replace('wss://', 'https://');
    }
    
    // Ensure we have a proper base URL
    if (!httpUrl.startsWith('http://') && !httpUrl.startsWith('https://')) {
        httpUrl = 'https://' + httpUrl;
    }
    
    const actionUrl = `${httpUrl}/twilio-voice`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" timeout="5" numDigits="1" action="${actionUrl}" method="POST">
    <Say>Hello. To speak with our AI assistant, Talkah, please press 1.</Say>
  </Gather>
  <Say>We did not receive any input. Goodbye.</Say>
  <Hangup/>
</Response>`;
}

/**
 * Generates TwiML for connecting to WebSocket stream
 * 
 * Creates TwiML markup that connects the phone call to the WebSocket server
 * for real-time voice streaming. Sets up the media stream and conversation topic.
 * 
 * @param {string} callSid - Twilio Call SID for the current call
 * @param {string} topic - Conversation topic for the AI assistant
 * @returns {string} TwiML markup for WebSocket connection
 */
function getConnectTwiML(callSid, topic) {
    const encodedTopic = encodeURIComponent(topic);
    // Properly escape the URL for XML - ampersands must be &amp; in XML
    const websocketUrl = `${WEBSOCKET_URL}?callSid=${callSid}&topic=${encodedTopic}`;
    const xmlEscapedUrl = websocketUrl.replace(/&/g, '&amp;');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${xmlEscapedUrl}" />
  </Connect>
</Response>`;
}

/**
 * Generates TwiML for call hangup with message
 * 
 * Creates TwiML markup for ending a call with a farewell message.
 * Used when calls end normally or due to errors.
 * 
 * @param {string} message - Message to speak before hanging up
 * @returns {string} TwiML markup for call termination
 */
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
                const gatherTwiML = getGatherTwiML(WEBSOCKET_URL);
                console.log(`🔍 DEBUG: Generated Gather TwiML:`, gatherTwiML);
                res.writeHead(200, { 'Content-Type': 'application/xml' });
                res.end(gatherTwiML);
            } else if (digits === '1') {
                console.log(`HTTP: User pressed 1 for ${callSid}. Connecting to WebSocket.`);
                
                // Add retry logic with longer timeout for database lookup
                let data = null;
                let error = null;
                let retries = 3;
                
                for (let i = 0; i < retries; i++) {
                    console.log(`🔍 DEBUG: Database lookup attempt ${i + 1} for CallSid: ${callSid}`);
                    const result = await supabase
                        .from('calls')
                        .select('topic')
                        .eq('twilio_call_sid', callSid)
                        .single();
                    
                    data = result.data;
                    error = result.error;
                    
                    if (data && !error) {
                        console.log(`✅ DEBUG: Found call record on attempt ${i + 1}:`, data);
                        break;
                    }
                    
                    console.log(`❌ DEBUG: Attempt ${i + 1} failed:`, error);
                    if (i < retries - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
                    }
                }
                
                if (error || !data) {
                    console.error(`HTTP: Final error fetching topic for ${callSid} after ${retries} attempts:`, error);
                    // Use a simple message without special characters that might cause XML parsing issues
                    const hangupTwiML = getHangupTwiML('Goodbye');
                    console.log(`🔍 DEBUG: Generated Hangup TwiML:`, hangupTwiML);
                    res.writeHead(200, { 'Content-Type': 'application/xml' });
                    res.end(hangupTwiML);
                } else {
                    const connectTwiML = getConnectTwiML(callSid, data.topic);
                    console.log(`🔍 DEBUG: Generated Connect TwiML:`, connectTwiML);
                    console.log(`🔍 DEBUG: WEBSOCKET_URL env var:`, WEBSOCKET_URL);
                    console.log(`🔍 DEBUG: CallSid:`, callSid);
                    console.log(`🔍 DEBUG: Topic:`, data.topic);
                    res.writeHead(200, { 'Content-Type': 'application/xml' });
                    res.end(connectTwiML);
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
            console.log(`🎤 (ID: ${connectionId}) Creating STT stream with config:`, {
              encoding: 'MULAW',
              sampleRateHertz: 8000,
              languageCode: 'en-US',
              model: 'telephony',
              projectId: process.env.GOOGLE_PROJECT_ID || 'NOT_SET'
            });

            recognizeStream = speechClient
              .streamingRecognize({
                config: {
                  encoding: 'MULAW',
                  sampleRateHertz: 8000,
                  languageCode: 'en-US',
                  model: 'telephony',
                  enableAutomaticPunctuation: true,
                },
                interimResults: true,
              })
              .on('error', (error) => {
                  console.error(`🚨 (ID: ${connectionId}, CallSID: ${callSid}) STT Error:`, {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    stack: error.stack
                  });
                  if(error.code === 11) {
                     console.error(`⏰ (ID: ${connectionId}) STT stream timed out. Closing connection.`);
                      forceEndCall(connectionId, "STT idle timeout");
                  }
              })
              .on('data', (data) => {
                console.log(`📥 (ID: ${connectionId}, CallSID: ${callSid}) STT received data:`, {
                  hasResults: !!data.results,
                  resultsLength: data.results ? data.results.length : 0,
                  firstResult: data.results && data.results[0] ? {
                    hasAlternatives: !!data.results[0].alternatives,
                    alternativesLength: data.results[0].alternatives ? data.results[0].alternatives.length : 0,
                    isFinal: data.results[0].isFinal,
                    stability: data.results[0].stability
                  } : null
                });

                if (data.results && data.results[0] && data.results[0].alternatives[0]) {
                  const transcript = data.results[0].alternatives[0].transcript.trim();
                  const isFinal = data.results[0].isFinal;
                  const confidence = data.results[0].alternatives[0].confidence;
                  
                  console.log(`🎯 (ID: ${connectionId}, CallSID: ${callSid}) Transcript:`, {
                    text: transcript,
                    isFinal,
                    confidence,
                    length: transcript.length
                  });
                  
                  if (isFinal) {
                    console.log(`✅ (ID: ${connectionId}, CallSID: ${callSid}) Final transcript: "${transcript}"`);
                    sendToOpenAI(connectionId, transcript, 'user');
                  } else if (transcript.length > 0) {
                    // Interim result - stop TTS immediately but don't send to OpenAI yet
                    console.log(`⚡ (ID: ${connectionId}, CallSID: ${callSid}) Interim speech detected, stopping TTS: "${transcript}"`);
                    stopAllTTS(connectionId);
                  }
                } else {
                  console.log(`❌ (ID: ${connectionId}, CallSID: ${callSid}) STT data received but no transcript found`);
                }
              })
              .on('end', () => {
                console.log(`🔚 (ID: ${connectionId}, CallSID: ${callSid}) STT stream ended`);
              })
              .on('close', () => {
                console.log(`🔒 (ID: ${connectionId}, CallSID: ${callSid}) STT stream closed`);
              });

            console.log(`✅ (ID: ${connectionId}) STT stream initialized successfully.`);
            connectionData.recognizeStream = recognizeStream;
          } catch(err) {
            console.error(`💥 (ID: ${connectionId}) Failed to create STT stream:`, {
              error: err.message,
              stack: err.stack,
              code: err.code
            });
            forceEndCall(connectionId, "STT initialization failed");
          }
        } else {
            console.error(`❌ (ID: ${connectionId}) speechClient is not initialized. STT will not work.`);
        }
        break;
      }
      case 'media': {
        const audioData = msg.media.payload;
        const timestamp = msg.media.timestamp;
        
        // Debug audio packet info
        console.log(`🎵 (ID: ${connectionId}) Audio packet received:`, {
          payloadLength: audioData ? audioData.length : 0,
          timestamp: timestamp,
          hasRecognizeStream: !!recognizeStream,
          recognizeStreamReadable: recognizeStream ? !recognizeStream.destroyed : false
        });

        if (recognizeStream && !recognizeStream.destroyed) {
          try {
            recognizeStream.write(audioData);
            console.log(`📤 (ID: ${connectionId}) Audio data sent to STT stream (${audioData.length} bytes)`);
          } catch (error) {
            console.error(`🚨 (ID: ${connectionId}) Error writing to STT stream:`, {
              error: error.message,
              destroyed: recognizeStream.destroyed,
              writable: recognizeStream.writable
            });
          }
        } else {
          if (!recognizeStream) {
            console.warn(`⚠️ (ID: ${connectionId}) No recognizeStream available for audio data`);
          } else if (recognizeStream.destroyed) {
            console.warn(`⚠️ (ID: ${connectionId}) recognizeStream is destroyed, cannot write audio`);
          }
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
