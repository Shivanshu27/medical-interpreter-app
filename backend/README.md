# Medical Interpreter Backend

This is the backend server for the Medical Interpreter application, designed to facilitate communication between English-speaking clinicians and Spanish-speaking patients.

## Features

- Real-time speech-to-speech translation between English and Spanish
- Special command handling (e.g., "repeat that")
- Conversation summarization
- Intent detection (follow-up appointments, lab orders)
- Transcript storage and retrieval

## Architecture

The backend is built with:
- Express.js for the REST API
- Socket.io for real-time communication
- MongoDB for data storage
- OpenAI's Realtime API for speech processing and translation

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   PORT=5000
   CLIENT_URL=http://localhost:3000
   MONGODB_URI=mongodb://localhost:27017/medical-interpreter
   OPENAI_API_KEY=your_openai_api_key
   SESSION_SECRET=your_session_secret
   ```
4. Start the server:
   ```
   npm run dev
   ```

## API Endpoints

### Session Management
- `POST /api/sessions` - Create a new conversation session
- `GET /api/sessions/:sessionId` - Get session details
- `PUT /api/sessions/:sessionId/end` - End a conversation session
- `PUT /api/sessions/:sessionId/role` - Update session role
- `DELETE /api/sessions/:sessionId` - Delete a session and its data

### Transcripts
- `POST /api/transcripts` - Add a new transcript
- `GET /api/transcripts/:sessionId` - Get all transcripts for a session
- `PUT /api/transcripts/:transcriptId/translation` - Update transcript translation
- `DELETE /api/transcripts/:transcriptId` - Delete a transcript

### Summary
- `POST /api/summary` - Generate a summary for transcripts
- `GET /api/summary/:sessionId` - Get summary for a session

## Socket.io Events

### Client to Server
- `join_session` - Join a conversation session
- `audio_data` - Send audio data for processing
- `end_speech` - Signal end of speech input
- `change_role` - Change the current speaker role
- `end_session` - End the session

### Server to Client
- `transcript_update` - Send transcription results
- `audio_response` - Send synthesized audio response
- `intent_detected` - Notify of detected intent
- `error` - Send error messages

## License
MIT