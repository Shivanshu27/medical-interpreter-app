// socket/socketHandler.js
const OpenAIService = require('../services/openAIService');
const TranscriptService = require('../services/transcriptService');
const Session = require('../models/Session');

module.exports = (io) => {
  // Store active services
  const openAIServices = new Map();
  
  // Handle binary data properly
  io.engine.on("connection", (rawSocket) => {
    // Enable receiving binary data
    rawSocket.binaryType = "arraybuffer";
    console.log(`DEBUG: Socket engine connection established with binary type: ${rawSocket.binaryType}`);
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    let currentSessionId = null;
    
    // Track audio data statistics
    let audioStats = {
      chunks: 0,
      totalBytes: 0,
      lastChunkTime: null
    };
    
    // Add test handler
    socket.on('test_connection', (data) => {
      console.log(`Received test connection from ${socket.id}:`, data);
      socket.emit('test_response', { 
        success: true, 
        message: 'Server received your test connection',
        timestamp: new Date().toISOString()
      });
    });
    
    // Add handlers for socket.io events
    socket.onAny((event, ...args) => {
      if (event !== 'audio_data') { // Don't log audio data events as they're too frequent
        console.log(`DEBUG: Socket event '${event}' received from ${socket.id}`);
      }
    });
    
    // Handle joining a session
    socket.on('join_session', async ({ sessionId, role }) => {
      try {
        if (!sessionId) {
          throw new Error('Session ID is required');
        }
        
        currentSessionId = sessionId;
        socket.join(sessionId);
        console.log(`Client ${socket.id} joined session ${sessionId}`);
        
        // Check if session exists or create it
        let sessionRecord = await Session.findOne({ sessionId });
        
        if (!sessionRecord) {
          // Create a new session if it doesn't exist
          sessionRecord = new Session({
            sessionId,
            currentRole: role,
            status: 'active',
            startTime: new Date()
          });
          await sessionRecord.save();
        }
        
        // Initialize OpenAI service if not exists
        if (!openAIServices.has(sessionId)) {
          const sourceLanguage = role === 'Doctor' ? 'en' : 'es';
          const targetLanguage = role === 'Doctor' ? 'es' : 'en';
          
          const openAIService = new OpenAIService();
          
          try {
            // Use the new connectToRealtime method instead of createSession
            const session = await openAIService.connectToRealtime(sourceLanguage, targetLanguage, {
              onConnected: () => {
                socket.emit('session_ready', { ready: true });
              },
              onTranscript: (transcript) => {
                // Emit to all clients in the session
                io.to(sessionId).emit('transcript_update', {
                  ...transcript,
                  speaker: role
                });
                
                // Save to database if it's a final transcript
                if (transcript.isFinal) {
                  TranscriptService.saveTranscript(sessionId, {
                    speaker: role,
                    text: transcript.text,
                    language: sourceLanguage,
                    translation: transcript.translation,
                    timestamp: new Date()
                  });
                }
              },
              onTranslation: async (transcript) => {
                try {
                  // Generate speech from the translation
                  const speech = await openAIService.generateSpeech(
                    transcript.translation, 
                    targetLanguage
                  );
                  
                  // Send the audio to the client
                  io.to(sessionId).emit('audio_response', {
                    audio: speech.buffer,
                    text: transcript.translation
                  });
                } catch (error) {
                  console.error('Error generating speech:', error);
                  socket.emit('error', { message: 'Failed to generate speech' });
                }
              },
              onIntentDetected: (intents) => {
                // Send intent notifications to clients
                io.to(sessionId).emit('intent_detected', intents);
                
                // Save intents to the session
                intents.forEach(async (intent) => {
                  try {
                    await Session.findOneAndUpdate(
                      { sessionId },
                      { 
                        $push: { 
                          detectedIntents: {
                            type: intent.type,
                            value: intent.value,
                            detectedAt: new Date()
                          }
                        }
                      }
                    );
                  } catch (error) {
                    console.error('Error saving intent:', error);
                  }
                });
              },
              onError: (error) => {
                console.error('OpenAI session error:', error);
                socket.emit('error', { message: error.message });
              },
              onClose: () => {
                console.log(`OpenAI WebSocket closed for session ${sessionId}`);
              }
            });
            
            openAIServices.set(sessionId, {
              service: openAIService,
              openAISessionId: session.sessionId,
              currentRole: role,
              sourceLanguage,
              targetLanguage
            });
            
            console.log(`Created new OpenAI session for ${sessionId}`);
          } catch (error) {
            console.error('Error creating OpenAI session:', error);
            socket.emit('error', { message: `Failed to connect to OpenAI: ${error.message}` });
            return;
          }
        }
        
        // Send back confirmation
        socket.emit('session_joined', { 
          sessionId,
          role,
          success: true
        });

        // Store session ID in socket object for persistence
        socket.currentSessionId = sessionId;
        currentSessionId = sessionId;
      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('error', { message: `Failed to join session: ${error.message}` });
      }
    });
    
    // Handle audio data from client
    socket.on('audio_data', async (data) => {
      try {
        // Add simple validation and debug info
        if (!data) {
          console.log('DEBUG: Received empty audio data');
          return;
        }
        
        // Log occasionally to avoid flooding logs
        if (Math.random() < 0.01) {
          console.log(`DEBUG: Received audio data chunk, size: ${data instanceof ArrayBuffer ? data.byteLength : 'not ArrayBuffer'} bytes`);
        }
        
        // Update audio statistics
        audioStats.chunks++;
        audioStats.totalBytes += data instanceof ArrayBuffer ? data.byteLength : 0;
        audioStats.lastChunkTime = new Date();
        
        // Log audio stats periodically (every 50 chunks)
        if (audioStats.chunks % 50 === 0) {
          console.log(`Audio stats for ${socket.id}: received ${audioStats.chunks} chunks, ${audioStats.totalBytes} bytes total`);
        }
        
        // Use the session ID stored in the socket object for persistence
        currentSessionId = socket.currentSessionId || currentSessionId;
        
        if (!currentSessionId) {
          console.log('DEBUG: Received audio but no active session');
          return; // Just return instead of throwing error for better UX
        }
        
        console.log(`DEBUG: Received audio data for session ${currentSessionId}, size: ${data instanceof ArrayBuffer ? data.byteLength : 'not ArrayBuffer'}`);
        
        const sessionData = openAIServices.get(currentSessionId);
        if (!sessionData) {
          console.log('DEBUG: Session service not found for', currentSessionId);
          return; // Just return instead of throwing error
        }
        
        // Process the binary audio data
        if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
          console.log('DEBUG: Processing valid audio data');
          await sessionData.service.processAudio(
            sessionData.openAISessionId,
            data
          );
          console.log('DEBUG: Audio processing complete');
        } else {
          console.log('DEBUG: Invalid audio data format:', typeof data);
        }
      } catch (error) {
        console.error('Error processing audio:', error);
        socket.emit('error', { message: `Failed to process audio: ${error.message}` });
      }
    });
    
    // Signal end of speech
    socket.on('end_speech', async () => {
      try {
        // Use the session ID stored in the socket object for persistence
        currentSessionId = socket.currentSessionId || currentSessionId;
        
        if (!currentSessionId) {
          console.log('DEBUG: Received end_speech but no active session');
          return;
        }
        
        console.log(`DEBUG: Ending speech for session ${currentSessionId}`);
        
        const sessionData = openAIServices.get(currentSessionId);
        if (sessionData) {
          console.log('DEBUG: Calling endAudio on service');
          sessionData.service.endAudio(sessionData.openAISessionId);
          console.log('DEBUG: endAudio call complete');
        } else {
          console.log('DEBUG: Session service not found for end_speech');
        }
      } catch (error) {
        console.error('Error ending speech:', error);
      }
    });
    
    // Change speaker role
    socket.on('change_role', async ({ newRole }) => {
      try {
        // Use the session ID stored in the socket object for persistence
        currentSessionId = socket.currentSessionId || currentSessionId;
        
        if (!currentSessionId) {
          throw new Error('No active session');
        }
        
        console.log(`Changing role to ${newRole} for session ${currentSessionId}`);
        
        // Initialize the OpenAI service if it doesn't exist for this session
        if (!openAIServices.has(currentSessionId)) {
          const sourceLanguage = newRole === 'Doctor' ? 'en' : 'es';
          const targetLanguage = newRole === 'Doctor' ? 'es' : 'en';
          
          const openAIService = new OpenAIService();
          
          try {
            // Use the new connectToRealtime method
            const session = await openAIService.connectToRealtime(sourceLanguage, targetLanguage, {
              // Same callbacks as above
              onConnected: () => {
                socket.emit('role_updated', { 
                  role: newRole,
                  ready: true
                });
              },
              onTranscript: (transcript) => {
                io.to(currentSessionId).emit('transcript_update', {
                  ...transcript,
                  speaker: newRole
                });
                
                if (transcript.isFinal) {
                  TranscriptService.saveTranscript(currentSessionId, {
                    speaker: newRole,
                    text: transcript.text,
                    language: sourceLanguage,
                    translation: transcript.translation,
                    timestamp: new Date()
                  });
                }
              },
              // Other callbacks similar to join_session
              onError: (error) => {
                console.error('OpenAI session error:', error);
                socket.emit('error', { message: error.message });
              }
            });
            
            openAIServices.set(currentSessionId, {
              service: openAIService,
              openAISessionId: session.sessionId,
              currentRole: newRole,
              sourceLanguage,
              targetLanguage
            });
            
            // Update role in database
            await Session.findOneAndUpdate(
              { sessionId: currentSessionId },
              { currentRole: newRole }
            );
            
            return;
          } catch (error) {
            console.error('Error creating OpenAI session:', error);
            socket.emit('error', { message: `Failed to connect to OpenAI: ${error.message}` });
            return;
          }
        }
        
        const sessionData = openAIServices.get(currentSessionId);
        if (!sessionData) {
          throw new Error('Session service not found');
        }
        
        // Update role in database
        await Session.findOneAndUpdate(
          { sessionId: currentSessionId },
          { currentRole: newRole }
        );
        
        // Close existing OpenAI session
        await sessionData.service.closeSession(sessionData.openAISessionId);
        
        // Create new session with reversed language settings
        const sourceLanguage = newRole === 'Doctor' ? 'en' : 'es';
        const targetLanguage = newRole === 'Doctor' ? 'es' : 'en';
        
        // Use the new connectToRealtime method
        const session = await sessionData.service.connectToRealtime(sourceLanguage, targetLanguage, {
          onConnected: () => {
            socket.emit('role_updated', { 
              role: newRole,
              ready: true
            });
          },
          onTranscript: (transcript) => {
            io.to(currentSessionId).emit('transcript_update', {
              ...transcript,
              speaker: newRole
            });
            
            if (transcript.isFinal) {
              TranscriptService.saveTranscript(currentSessionId, {
                speaker: newRole,
                text: transcript.text,
                language: sourceLanguage,
                translation: transcript.translation,
                timestamp: new Date()
              });
            }
          },
          // Other callbacks similar to the ones above
        });
        
        // Update session data
        sessionData.openAISessionId = session.sessionId;
        sessionData.currentRole = newRole;
        sessionData.sourceLanguage = sourceLanguage;
        sessionData.targetLanguage = targetLanguage;
        
      } catch (error) {
        console.error('Error changing role:', error);
        socket.emit('error', { message: `Failed to change role: ${error.message}` });
      }
    });
    
    // End session
    socket.on('end_session', async () => {
      try {
        // Use the session ID stored in the socket object for persistence
        currentSessionId = socket.currentSessionId || currentSessionId;
        
        if (!currentSessionId) {
          return;
        }
        
        const sessionData = openAIServices.get(currentSessionId);
        if (sessionData) {
          await sessionData.service.closeSession(sessionData.openAISessionId);
          openAIServices.delete(currentSessionId);
          
          // Update session in database
          await Session.findOneAndUpdate(
            { sessionId: currentSessionId },
            { 
              status: 'completed',
              endTime: new Date()
            }
          );
          
          console.log(`Closed session ${currentSessionId}`);
          
          socket.emit('session_ended', { 
            sessionId: currentSessionId,
            success: true
          });
          
          // Clear the session ID from the socket object
          socket.currentSessionId = null;
          currentSessionId = null;
        }
      } catch (error) {
        console.error('Error ending session:', error);
        socket.emit('error', { message: `Failed to end session: ${error.message}` });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}. Audio stats: Received ${audioStats.chunks} chunks, ${audioStats.totalBytes} bytes total.`);
      // We keep the session active since the user might refresh the page
    });
  });
};