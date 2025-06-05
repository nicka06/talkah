import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const PORT = parseInt(Deno.env.get("PORT") || "8080"); // Fly.io will set the PORT env var

// Google Cloud STT Configuration (to be fetched from Fly.io secrets)
const GOOGLE_PROJECT_ID = Deno.env.get("GOOGLE_PROJECT_ID");
// Option 1: Content of the service account JSON key
const GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT = Deno.env.get("GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT");
// Option 2: If you mount the JSON file in your Docker image and set the path
// const GOOGLE_APPLICATION_CREDENTIALS_PATH = Deno.env.get("GOOGLE_APPLICATION_CREDENTIALS");

console.log(`WebSocket server starting on port ${PORT}...`);
if (!GOOGLE_PROJECT_ID || !GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT) {
  console.warn("Google Cloud STT environment variables (GOOGLE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS_JSON_CONTENT) are not fully set. STT will be disabled.");
}

// Store active connection details, including parameters received from Twilio's start message
const activeConnections = new Map<string, { socket: WebSocket, callSid?: string, topic?: string, twilioStreamSid?: string }>();

// --- Google STT Streaming Placeholder --- 
// In a real implementation, this would be a more sophisticated client class or set of functions
// to manage the streaming connection to Google STT for each WebSocket call.
async function handleGoogleSTT(connectionId: string, audioChunk: Uint8Array, callSid?: string) {
  // This is a placeholder. Actual implementation would involve:
  // 1. Managing a persistent streaming recognize request to Google STT for this connectionId/callSid.
  // 2. Sending audioChunk to that stream.
  // 3. Receiving transcriptions (interim and final) from Google STT.
  // 4. Forwarding transcriptions to the LLM.
  console.log(`(ID: ${connectionId}, CallSID: ${callSid}) [STT Placeholder] Received audio chunk, length: ${audioChunk.length}. Would send to Google STT.`);
  // Simulate receiving a transcript
  const simulatedTranscript = "User said: hello world"; // Placeholder
  if (audioChunk.length > 0) { // Avoid sending empty transcripts
    await handleLLM(connectionId, simulatedTranscript, callSid);
  }
}

// --- OpenAI LLM Placeholder --- 
async function handleLLM(connectionId: string, transcript: string, callSid?: string) {
  console.log(`(ID: ${connectionId}, CallSID: ${callSid}) [LLM Placeholder] Received transcript: '${transcript}'. Would send to OpenAI.`);
  const simulatedLLMResponse = "AI says: Hi there! This is a test."; // Placeholder
  await handleTTS(connectionId, simulatedLLMResponse, callSid);
}

// --- ElevenLabs TTS Placeholder --- 
async function handleTTS(connectionId: string, textToSpeak: string, callSid?: string) {
  console.log(`(ID: ${connectionId}, CallSID: ${callSid}) [TTS Placeholder] Received text: '${textToSpeak}'. Would send to ElevenLabs.`);
  const simulatedAudioPayload = "<base64_encoded_mulaw_audio_from_tts_here>"; // Placeholder
  const connectionData = activeConnections.get(connectionId);
  if (connectionData && connectionData.socket.readyState === WebSocket.OPEN && connectionData.twilioStreamSid) {
    const mediaMessage = {
      event: "media",
      streamSid: connectionData.twilioStreamSid,
      media: {
        payload: simulatedAudioPayload,
      },
    };
    // connectionData.socket.send(JSON.stringify(mediaMessage)); // Uncomment when ready to send audio back
    console.log(`(ID: ${connectionId}, CallSID: ${callSid}) [TTS Placeholder] Sent placeholder audio back to Twilio.`);
  } else {
    console.warn(`(ID: ${connectionId}, CallSID: ${callSid}) [TTS Placeholder] WebSocket not open or streamSid missing, cannot send TTS audio.`);
  }
}
// --- End Placeholders ---

serve(async (req: Request) => {
  const requestUrl = new URL(req.url); // Renamed to avoid conflict, used for all parts of request

  // Handle HTTP GET for health checks or basic info
  if (req.method === "GET" && requestUrl.pathname === "/") {
    return new Response("WebSocket server is running.", { status: 200 });
  }

  // Check for WebSocket upgrade request specifically
  if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    console.log(`Received non-WebSocket request to: ${req.method} ${requestUrl.toString()}`);
    return new Response(`This is a WebSocket server. Non-WebSocket requests to this path are not supported. Path: ${requestUrl.pathname}`, { status: 400 });
  }

  // Proceed with WebSocket upgrade
  const { socket, response } = Deno.upgradeWebSocket(req);

  // Generate a unique ID for this connection to use as a key in activeConnections
  // This is temporary until we get the streamSid or callSid from Twilio
  const connectionId = crypto.randomUUID(); 

  socket.onopen = () => {
    console.log(`WebSocket connection opened for path: ${requestUrl.pathname}. (ID: ${connectionId}) Waiting for start message from Twilio to get parameters.`);
    activeConnections.set(connectionId, { socket });
  };

  socket.onmessage = async (event) => {
    let message;
    try {
      message = JSON.parse(event.data as string);
      // console.log(`(ID: ${connectionId}) Received message from Twilio:`, JSON.stringify(message, null, 2)); // Verbose, can be enabled for deep debug

      const connectionData = activeConnections.get(connectionId);
      if (!connectionData) {
        console.error(`(ID: ${connectionId}) No connection data found for this message.`);
        return;
      }

      if (message.event === "start") {
        const twilioStreamSid = message.streamSid;
        const customParameters = message.start?.customParameters || {};
        const callSid = customParameters.callSid;
        const topic = customParameters.topic;

        console.log(`(ID: ${connectionId}) Twilio media stream started. StreamSid: ${twilioStreamSid}, CallSid: ${callSid}, Topic: ${topic}`);
        
        // Update connection data with received parameters
        connectionData.twilioStreamSid = twilioStreamSid;
        connectionData.callSid = callSid;
        connectionData.topic = topic;
        // Here you would initialize the actual Google STT stream for this connectionId/callSid
        // e.g., connectionData.sttStream = new GoogleSTTStream(connectionData.callSid, (transcript) => { handleLLM(transcript); });

      } else if (message.event === "media") {
        if (!connectionData.twilioStreamSid) {
            console.warn(`(ID: ${connectionId}) Received media before streamSid was known or STT initialized.`);
            return; 
        }
        const audioChunkBase64 = message.media.payload;
        const audioChunk = base64Decode(audioChunkBase64);
        // console.log(`(ID: ${connectionId}, CallSID: ${connectionData.callSid}) Received audio payload (length: ${audioChunk.length})`); // Already logged by placeholder
        await handleGoogleSTT(connectionId, audioChunk, connectionData.callSid); // Pass to STT handler

      } else if (message.event === "stop") {
        console.log(`(ID: ${connectionId}, StreamSID: ${connectionData.twilioStreamSid}, CallSID: ${connectionData.callSid}) Twilio media stream stopped.`);
        // Close/destroy STT stream for this connection: if (connectionData.sttStream) connectionData.sttStream.destroy();
        socket.close(1000, "Stream stopped by Twilio"); // Acknowledge stop and close from server side
        activeConnections.delete(connectionId); // Clean up
      } else if (message.event === "mark") {
        console.log(`(ID: ${connectionId}, StreamSID: ${connectionData.twilioStreamSid}, CallSID: ${connectionData.callSid}) Twilio mark event:`, message.mark);
      }
    } catch (e) {
      console.error(`(ID: ${connectionId}) Failed to parse message or handle event:`, e, "Raw message data:", event.data);
    }
  };

  socket.onerror = (error) => {
    console.error(`(ID: ${connectionId}) WebSocket error:`, error);
    // Close/destroy STT stream: if (activeConnections.get(connectionId)?.sttStream) activeConnections.get(connectionId).sttStream.destroy();
    activeConnections.delete(connectionId); // Clean up on error
  };

  socket.onclose = (event) => {
    const conn = activeConnections.get(connectionId);
    console.log(`(ID: ${connectionId}, StreamSID: ${conn?.twilioStreamSid}, CallSID: ${conn?.callSid}) WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
    // Ensure STT stream is cleaned up: if (conn?.sttStream) conn.sttStream.destroy();
    activeConnections.delete(connectionId); // Ensure cleanup
  };

  return response;
}, { port: PORT });

// Placeholder for managing active connections if needed across requests (not suitable for Deno Deploy\'s typical model without external state)
// For Fly.io, a simple in-memory Map on the server instance would work for connections handled by that instance.
// const activeConnections = new Map(); 