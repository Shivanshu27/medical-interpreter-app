const OpenAI = require('openai');
const WebSocket = require('ws');
const Session = require('../models/Session');

class SessionService {
  constructor() {
    this.connections = new Map();
  }
  
  /**
   * Create a new realtime session
   * @param {string} sourceLanguage - Source language code (e.g., 'en', 'es')
   * @param {string} targetLanguage - Target language code
   * @param {string} role - Current speaker role ('Doctor' or 'Patient')
   */
  async createSession(sourceLanguage, targetLanguage, role) {
    try {
      // Create a WebSocket connection to OpenAI Realtime API
      const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';
      
      const ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });
      
      // Create a promise that resolves when the connection is established
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);
        
        ws.once('open', () => {
          clearTimeout(timeout);
          
          // Configure the session immediately with proper format
          const sessionUpdate = {
            type: 'session.update',
            session: {
              instructions: `You are a professional medical interpreter. 
                Translate the following from ${sourceLanguage} to ${targetLanguage}. 
                Maintain medical terminology accurately. 
                If you detect the phrase "repeat that" or similar, respond with "COMMAND_REPEAT_PREVIOUS".`,
              modalities: ['audio', 'text'],
              voice: targetLanguage === 'es' ? 'coral' : 'alloy',
              input_audio_transcription: {
                model: 'whisper-1'
              }
            }
          };
          
          ws.send(JSON.stringify(sessionUpdate));
          resolve();
        });
        
        ws.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      // Wait for the connection to be established
      await connectionPromise;
      
      // Generate a unique ID for this session
      const sessionId = `session_${Date.now()}`;
      
      // Store the WebSocket connection
      this.connections.set(sessionId, {
        websocket: ws,
        sourceLanguage,
        targetLanguage
      });
      
      // Create database record
      const session = new Session({
        sessionId,
        sourceLanguage,
        targetLanguage,
        currentRole: role,
        startTime: new Date(),
        status: 'active'
      });
      
      await session.save();
      
      return {
        sessionId: session.sessionId,
        databaseId: session._id
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }
  
  /**
   * End an active session
   * @param {string} sessionId - Session ID
   */
  async endSession(sessionId) {
    try {
      const connection = this.connections.get(sessionId);
      
      // Close WebSocket if it exists
      if (connection && connection.websocket) {
        connection.websocket.close();
      }
      
      // Remove from connections map
      this.connections.delete(sessionId);
      
      // Update database record
      const session = await Session.findOneAndUpdate(
        { sessionId },
        { 
          status: 'completed',
          endTime: new Date()
        },
        { new: true }
      );
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error ending session:', error);
      throw new Error(`Failed to end session: ${error.message}`);
    }
  }
  
  /**
   * Switch the current role and language direction
   * @param {string} sessionId - Session ID
   */
  async switchRole(sessionId) {
    try {
      // Get the session from database
      const session = await Session.findOne({ sessionId });
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Switch languages
      const oldSource = session.sourceLanguage;
      session.sourceLanguage = session.targetLanguage;
      session.targetLanguage = oldSource;
      
      // Switch role
      session.currentRole = session.currentRole === 'Doctor' ? 'Patient' : 'Doctor';
      
      // Update database
      await session.save();
      
      // Close existing connection
      const connection = this.connections.get(sessionId);
      if (connection && connection.websocket) {
        connection.websocket.close();
      }
      
      // Create a new WebSocket connection
      const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';
      
      const ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });
      
      // Create a promise that resolves when the new connection is established
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);
        
        ws.once('open', () => {
          clearTimeout(timeout);
          
          // Configure the session immediately with proper format
          const sessionUpdate = {
            type: 'session.update',
            session: {
              instructions: `You are a professional medical interpreter. 
                Translate the following from ${session.sourceLanguage} to ${session.targetLanguage}. 
                Maintain medical terminology accurately. 
                If you detect the phrase "repeat that" or similar, respond with "COMMAND_REPEAT_PREVIOUS".`,
              modalities: ['audio', 'text'],
              voice: session.targetLanguage === 'es' ? 'coral' : 'alloy',
              input_audio_transcription: {
                model: 'whisper-1'
              }
            }
          };
          
          ws.send(JSON.stringify(sessionUpdate));
          resolve();
        });
        
        ws.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      // Wait for the connection to be established
      await connectionPromise;
      
      // Store the new WebSocket connection
      this.connections.set(sessionId, {
        websocket: ws,
        sourceLanguage: session.sourceLanguage,
        targetLanguage: session.targetLanguage
      });
      
      return {
        sessionId: session.sessionId,
        currentRole: session.currentRole,
        sourceLanguage: session.sourceLanguage,
        targetLanguage: session.targetLanguage
      };
    } catch (error) {
      console.error('Error switching role:', error);
      throw new Error(`Failed to switch role: ${error.message}`);
    }
  }
  
  /**
   * Send audio data to the session
   * @param {string} sessionId - Session ID
   * @param {Buffer|ArrayBuffer} audioData - Audio data
   */
  async sendAudio(sessionId, audioData) {
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.websocket) {
      throw new Error('Session not connected');
    }
    
    try {
      // Convert audio data to base64
      const audioBase64 = audioData instanceof Buffer ? 
        audioData.toString('base64') : 
        Buffer.from(audioData).toString('base64');
      
      // Send audio event
      const audioEvent = {
        type: 'audio',
        content: audioBase64
      };
      
      connection.websocket.send(JSON.stringify(audioEvent));
    } catch (error) {
      console.error('Error sending audio:', error);
      throw new Error(`Failed to send audio: ${error.message}`);
    }
  }
  
  /**
   * Signal end of audio input
   * @param {string} sessionId - Session ID
   */
  endAudio(sessionId) {
    const connection = this.connections.get(sessionId);
    if (!connection || !connection.websocket) {
      return;
    }
    
    try {
      // Send end audio event
      const endAudioEvent = {
        type: 'end_audio'
      };
      
      connection.websocket.send(JSON.stringify(endAudioEvent));
    } catch (error) {
      console.error('Error ending audio:', error);
    }
  }
}

module.exports = new SessionService();