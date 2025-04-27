# Medical Interpreter App Guide

## Overview

This application provides real-time translation services for medical conversations between English and Spanish speakers. It uses OpenAI's language models for transcription, translation, and text-to-speech to facilitate seamless communication in medical settings.

## System Architecture

### Frontend to Backend Flow

1. **Frontend Initialization**
   - `initializeSocket()` connects to backend via WebSockets
   - Sets up UI components (RoleToggle, SpeechStream, TranscriptPanel)

2. **Session Creation**
   - User joins a session with a role (Doctor or Patient)
   - Frontend emits `join_session` event to backend

3. **Audio Processing**
   - User starts speaking (`SpeechStream` component)
   - Audio is sent to backend via `audio_data` events
   - Backend processes audio and returns transcriptions/translations

4. **Conversation Flow**
   - Patient speaks Spanish → Spanish audio → English text/audio response
   - Doctor speaks English → English audio → Spanish text/audio response

## Detailed Component Flow

### Frontend to Backend

1. **Frontend Initialization**
   - `App.js` → `initializeSocket()` → `socketService.js`
   - Socket connection established to `ws://localhost:5000`

2. **Session Management**
   - `joinSession()` → Socket `emit('join_session')` → `socketHandler.js` (`socket.on('join_session')`)
   - Backend creates `Session` record and initializes `OpenAIService`

3. **Audio Streaming**
   - `startRecording()` → `AudioContext` processing → Socket `emit('audio_data')` → `socketHandler.js` (`socket.on('audio_data')`)
   - Backend forwards to `openAIService.processAudio()`

4. **Role Switching**
   - `toggleRole()` action → Socket `emit('change_role')` → `socketHandler.js` (`socket.on('change_role')`)
   - Creates new OpenAI session with reversed language direction

### Backend Processing

1. **Audio Processing**
   - `socketHandler.js` receives audio → `openAIService.processAudio()`
   - Audio sent to OpenAI Realtime API via WebSocket

2. **Transcription & Translation**
   - OpenAI returns transcript → `ws.on('message')` handler processes it
   - `openAIService.translateText()` called to translate between languages
   - Results emitted back to frontend via `emit('transcript_update')`

3. **Audio Response**
   - `openAIService.generateSpeech()` creates audio from translated text
   - Audio sent back via `emit('audio_response')`

4. **Session Completion**
   - `endSession()` → Socket `emit('end_session')` → `socketHandler.js` (`socket.on('end_session')`)
   - `openAIService.closeSession()` and session marked as completed in database

5. **Summary Generation**
   - `generateSummary()` API call → `/api/summary` endpoint → `openAIService.generateSummary()`
   - Creates conversation summary with key points and actions

## Key Components

### Frontend
- `App.js` - Main application container
- `socketService.js` - WebSocket connection management
- `SpeechStream.jsx` - Audio recording and processing
- `TranscriptPanel.jsx` - Display conversation

### Backend
- `socketHandler.js` - Socket.io event management
- `openAIService.js` - OpenAI API integration
- `sessionService.js` - Session management
- Database models (`Session.js`, `Transcript.js`, `Summary.js`)

## Debugging Tips

1. **WebSocket Connection Issues**
   - Check browser console for connection errors
   - Verify backend server is running on the expected port
   - Confirm CORS settings if applicable

2. **Audio Processing Problems**
   - Check microphone permissions in browser
   - Monitor browser console for audio recording errors
   - Verify audio format compatibility

3. **OpenAI API Issues**
   - Check API key validity and environment variables
   - Monitor rate limits and quota usage
   - Examine response errors in server logs

4. **Translation Quality**
   - Review system prompts in `openAIService.js`
   - Adjust temperature and model parameters as needed
   - Consider domain-specific terminology improvements

## Mock Mode

The application includes a mock mode (`USE_MOCK_MODE` flag in `openAIService.js`) that simulates OpenAI responses without making actual API calls. This is useful for development and testing without consuming API credits.

## Improvement Opportunities

1. **Speech Recognition Enhancement**
   - Implement noise filtering
   - Add speaker diarization for multi-party conversations
   - Optimize audio streaming for lower latency

2. **Translation Improvements**
   - Create domain-specific medical translation models
   - Add support for additional languages
   - Implement context-aware translation

3. **UI Enhancements**
   - Develop mobile-responsive design
   - Add visual indicators for speaker roles
   - Implement accessibility features

4. **Performance Optimizations**
   - Implement caching for frequent translations
   - Add offline mode capabilities
   - Optimize audio processing for lower latency