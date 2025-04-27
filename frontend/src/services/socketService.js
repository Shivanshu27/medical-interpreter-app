import { io } from 'socket.io-client';

let socket = null;
let isInitializing = false;

/**
 * Initialize the Socket.IO connection
 * @returns {Promise<void>}
 */
export const initializeSocket = async () => {
  return new Promise((resolve, reject) => {
    try {
      // If already initializing, wait for it
      if (isInitializing) {
        console.log("Socket initialization already in progress");
        const checkInterval = setInterval(() => {
          if (socket && socket.connected) {
            clearInterval(checkInterval);
            resolve(socket);
          }
        }, 100);
        return;
      }
      
      // If socket exists and is connected, resolve immediately
      if (socket && socket.connected) {
        console.log("Socket already connected:", socket.id);
        resolve(socket);
        return;
      }
      
      isInitializing = true;
      
      // Close any existing socket
      if (socket) {
        console.log("Closing existing socket before new connection");
        socket.disconnect();
        socket = null;
      }
      
      // Create socket connection to server
      const socketUrl = process.env.REACT_APP_WS_URL || 'http://localhost:5000';
      console.log(`Initializing socket connection to ${socketUrl}`);
      
      socket = io(socketUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      // Set up handlers
      socket.on('connect', () => {
        console.log('Socket connected successfully: ', socket.id);
        isInitializing = false;
        resolve(socket);
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        isInitializing = false;
        reject(error);
      });
      
      socket.on('session_ready', (data) => {
        console.log('Session ready:', data);
      });

      // Debug socket events
      socket.onAny((event, ...args) => {
        if (event !== 'audio_data') { // Don't log audio data events as they're too frequent
          console.log(`Socket event received: ${event}`);
        }
      });
      
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      isInitializing = false;
      reject(error);
    }
  });
};

/**
 * Get the current socket instance
 * @returns {Socket|null}
 */
export const getSocket = () => socket;

/**
 * Close the socket connection
 */
export const closeSocket = () => {
  if (socket) {
    console.log("Explicitly closing socket connection");
    socket.disconnect();
    socket = null;
  }
};

/**
 * Check if the socket is connected
 * @returns {boolean}
 */
export const isConnected = () => {
  return socket && socket.connected;
};

/**
 * Join a conversation session
 * @param {string} sessionId - Session ID to join
 * @param {string} role - User role (Doctor or Patient)
 * @returns {Promise<void>}
 */
export const joinSession = (sessionId, role) => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not initialized'));
      return;
    }
    
    socket.emit('join_session', { sessionId, role });
    
    // Listen for confirmation
    socket.once('session_joined', (response) => {
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.message || 'Failed to join session'));
      }
    });
    
    // Listen for error
    socket.once('error', (error) => {
      reject(new Error(error.message || 'Failed to join session'));
    });
  });
};

/**
 * End the current session
 * @returns {Promise<void>}
 */
export const endSession = () => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      console.log("No socket connection to end session");
      resolve({ success: true, message: 'No active session' });
      return;
    }
    
    console.log("Sending end_session event");
    socket.emit('end_session');
    
    // Listen for confirmation with timeout
    const timeout = setTimeout(() => {
      socket.off('session_ended');
      socket.off('error');
      resolve({ success: true, message: 'Session end timed out but continuing' });
    }, 3000);
    
    // Listen for confirmation
    socket.once('session_ended', (response) => {
      clearTimeout(timeout);
      console.log("Received session_ended confirmation:", response);
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.message || 'Failed to end session'));
      }
    });
    
    // Listen for error
    socket.once('error', (error) => {
      clearTimeout(timeout);
      console.error("Error ending session:", error);
      reject(new Error(error.message || 'Failed to end session'));
    });
  });
};

/**
 * Send audio data through the socket
 * @param {Float32Array} audioData - Array of audio data to send
 * @returns {boolean} - Whether the data was sent successfully
 */
export const sendAudioData = (audioData) => {
  if (!socket || !socket.connected) {
    console.warn('Cannot send audio data - socket not connected or initialized');
    return false;
  }
  
  try {
    // Create a binary message with the audio data
    // Using ArrayBuffer to ensure binary data is transmitted correctly
    socket.emit('audio_data', audioData.buffer);
    return true;
  } catch (error) {
    console.error('Error sending audio data:', error);
    return false;
  }
};
