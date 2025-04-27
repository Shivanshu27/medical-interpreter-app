# Medical Interpreter Application

This application facilitates real-time medical interpretation between English-speaking doctors and Spanish-speaking patients. It uses speech-to-speech translation to provide seamless communication in healthcare settings.

## Features

- Real-time speech-to-speech translation between English and Spanish
- Role-based communication (Doctor/Patient)
- Conversation transcript with translations
- Audio level visualization
- Session management
- Conversation summarization
- Intent detection (follow-up appointments, lab orders)

## Project Structure

The project consists of two main components:

- **Frontend**: React-based web application
- **Backend**: Node.js server with Socket.IO for real-time communication

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (for data persistence)
- OpenAI API key

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd /home/user/Downloads/interpreter-app/backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the backend directory with the following content:
   ```
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/medical-interpreter
   DB_NAME=medical-interpreter

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Session Configuration
   SESSION_SECRET=your_session_secret_key
   ```

4. Replace `your_openai_api_key_here` with your actual OpenAI API key.

5. Start the backend server:
   ```
   npm run dev
   ```
   
   The server will start on port 5000 (or the port specified in your .env file).

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd /home/user/Downloads/interpreter-app/frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the frontend directory with the following content:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_WS_URL=http://localhost:5000
   ```

4. Start the frontend development server:
   ```
   npm start
   ```

   The application will open in your browser at [http://localhost:3000](http://localhost:3000).

## Usage

1. When the application starts, you'll be assigned a random conversation ID or you can create a new conversation.

2. Select your role (Doctor - English or Patient - Spanish) using the role toggle.

3. Click the "Start Speaking" button and speak into your microphone. The application will:
   - Record your voice
   - Send the audio to the server
   - Process the speech and translate it
   - Display the original text and translation
   - Generate audio for the translated text

4. Click "Stop Speaking" when you're done talking.

5. The conversation transcript will display both the original speech and translations.

6. You can switch roles at any time to change between English and Spanish.

7. Generate a summary of the conversation using the summary feature.

## Testing

### Debug Tools

The application includes debug tools to help test connectivity and audio processing:

1. **Socket Connection Test**: Navigate to [http://localhost:3000/debug.html](http://localhost:3000/debug.html) to access the debug interface.

2. **Audio Socket Test**: Use [http://localhost:3000/audio-socket-test.html](http://localhost:3000/audio-socket-test.html) for testing audio processing.

### Running Automated Tests

For the frontend:
```
cd /home/user/Downloads/interpreter-app/frontend
npm test
```

For the backend:
```
cd /home/user/Downloads/interpreter-app/backend
npm test
```

## Troubleshooting

### Socket Connection Issues

- Ensure both frontend and backend servers are running
- Check that your browser allows microphone access
- Verify that the WebSocket URL in the frontend environment matches the backend server address

### Audio Capture Issues

- Make sure your microphone is enabled and working
- Check browser console for any permission-related errors
- Try using the audio test tool to isolate issues

## Development Notes

- The application uses Socket.IO for real-time communication
- Audio is processed using the Web Audio API
- For development without an OpenAI API key, the backend includes a mock mode that simulates responses

## License

MIT
