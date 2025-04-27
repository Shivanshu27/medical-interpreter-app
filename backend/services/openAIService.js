const OpenAI = require('openai');
const WebSocket = require('ws');

// Add a mock mode flag
const USE_MOCK_MODE = true; // Set to true to use mock responses instead of calling OpenAI

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.sessions = new Map();
  }
  
  /**
   * Connect to the WebSocket and establish a Realtime session
   * @param {string} sourceLanguage - Language code for source language (e.g., 'en', 'es')
   * @param {string} targetLanguage - Language code for target language (e.g., 'es', 'en')
   * @param {object} callbacks - Event callbacks
   * @returns {Promise<object>} - Session information
   */
  async connectToRealtime(sourceLanguage = 'en', targetLanguage = 'es', callbacks = {}) {
    try {
      // Generate a unique session ID for tracking
      const sessionId = `session_${Date.now()}`;
      
      if (USE_MOCK_MODE) {
        console.log(`[MOCK MODE] Creating mock session ${sessionId}`);
        
        // Store session information without creating a real WebSocket
        this.sessions.set(sessionId, {
          id: sessionId,
          sourceLanguage,
          targetLanguage,
          isConnected: true,
          isMock: true,
          callbacks: callbacks || {},
          mockAudioCount: 0
        });
        
        // Call onConnected callback immediately
        if (callbacks.onConnected) {
          setTimeout(() => callbacks.onConnected(), 500);
        }
        
        return {
          sessionId,
          sourceLanguage,
          targetLanguage
        };
      }
      
      // Real implementation for when mock mode is disabled
      // Create WebSocket connection directly
      const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';
      
      const ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });
      
      // Store session information
      this.sessions.set(sessionId, {
        id: sessionId,
        sourceLanguage,
        targetLanguage,
        isConnected: false,
        callbacks: callbacks || {},
        websocket: ws
      });
      
      const session = this.sessions.get(sessionId);
      
      // Handle WebSocket events
      ws.on('open', () => {
        console.log(`WebSocket connected for session ${sessionId}`);
        session.isConnected = true;
        
        // Configure the session immediately after connection with proper format
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
        
        if (session.callbacks.onConnected) {
          session.callbacks.onConnected();
        }
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          
          switch (message.type) {
            case 'conversation.item.created':
              if (message.content && message.content.text && session.callbacks.onTranscript) {
                const transcript = {
                  text: message.content.text,
                  isFinal: true,
                  timestamp: new Date().toISOString()
                };
                
                // Check for repeat command
                if (message.content.text.includes("COMMAND_REPEAT_PREVIOUS")) {
                  if (session.callbacks.onIntentDetected) {
                    session.callbacks.onIntentDetected([{
                      type: 'repeat',
                      value: true
                    }]);
                  }
                } else {
                  // Process normal text
                  this.translateText(
                    transcript.text,
                    session.sourceLanguage,
                    session.targetLanguage
                  ).then(translation => {
                    transcript.translation = translation;
                    
                    if (session.callbacks.onTranslation) {
                      session.callbacks.onTranslation(transcript);
                    }
                    
                    if (session.callbacks.onTranscript) {
                      session.callbacks.onTranscript(transcript);
                    }
                  });
                }
              }
              break;
              
            case 'audio':
              if (message.content && session.callbacks.onAudio) {
                session.callbacks.onAudio(Buffer.from(message.content, 'base64'));
              }
              break;
              
            case 'error':
              console.error("Realtime API error:", message);
              if (session.callbacks.onError) {
                session.callbacks.onError(new Error(message.message || 'Unknown error from OpenAI'));
              }
              break;
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
          if (session.callbacks.onError) {
            session.callbacks.onError(error);
          }
        }
      });
      
      ws.on('error', (error) => {
        console.error("WebSocket error:", error);
        if (session.callbacks.onError) {
          session.callbacks.onError(error);
        }
      });
      
      ws.on('close', () => {
        console.log(`WebSocket closed for session ${sessionId}`);
        session.isConnected = false;
        if (session.callbacks.onClose) {
          session.callbacks.onClose();
        }
      });
      
      // Return session information after setup
      return new Promise((resolve, reject) => {
        // Set timeout to reject if connection isn't established
        const timeout = setTimeout(() => {
          reject(new Error('Connection to OpenAI Realtime timed out'));
        }, 10000);
        
        // Add one-time listener for successful connection
        ws.once('open', () => {
          clearTimeout(timeout);
          resolve({
            sessionId,
            sourceLanguage,
            targetLanguage
          });
        });
        
        // Add one-time listener for connection error
        ws.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    } catch (error) {
      console.error('Error connecting to OpenAI realtime:', error);
      throw new Error(`Failed to connect to OpenAI realtime: ${error.message}`);
    }
  }
  
  /**
   * Process audio data through OpenAI session
   * @param {string} sessionId - Session ID
   * @param {Buffer|ArrayBuffer} audioData - Audio data to process
   * @returns {Promise<void>}
   */
  async processAudio(sessionId, audioData) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isConnected) {
      console.log(`Session not connected: ${sessionId}`);
      return; // Just return instead of throwing error
    }
    
    try {
      if (USE_MOCK_MODE) {
        // Increment mock audio count for this session
        session.mockAudioCount = (session.mockAudioCount || 0) + 1;
        
        // Only generate responses occasionally to avoid flooding
        // This simulates realistic processing delay and avoids duplicates
        if (session.mockAudioCount % 20 === 1) {
          console.log(`[MOCK MODE] Processing audio chunk ${session.mockAudioCount} for session ${sessionId}`);
        
          // Generate dummy response after a delay
          setTimeout(() => {
            if (!session.callbacks.onTranscript) return;
            
            // Create a mock transcript based on the source language
            let mockText, mockTranslation;
            
            if (session.sourceLanguage === 'en') {
              mockText = getMockEnglishText(session.mockAudioCount);
              mockTranslation = getMockSpanishTranslation(session.mockAudioCount);
            } else {
              mockText = getMockSpanishText(session.mockAudioCount);
              mockTranslation = getMockEnglishTranslation(session.mockAudioCount);
            }
            
            const transcript = {
              text: mockText,
              isFinal: true,
              timestamp: new Date().toISOString(),
              translation: mockTranslation
            };
            
            console.log(`[MOCK MODE] Generating transcript: "${mockText}" with translation: "${mockTranslation}"`);
            
            // Emit the mock transcript
            if (session.callbacks.onTranscript) {
              session.callbacks.onTranscript(transcript);
            }
            
            // Emit the mock translation
            if (session.callbacks.onTranslation) {
              session.callbacks.onTranslation(transcript);
            }
          }, 1500); // Simulate processing delay
        }
        
        return;
      }
      
      const audioBase64 = audioData instanceof Buffer ? 
        audioData.toString('base64') : 
        Buffer.from(audioData).toString('base64');
      
      // Send audio data as a JSON message through WebSocket
      const audioEvent = {
        type: 'audio',
        content: audioBase64
      };
      
      session.websocket.send(JSON.stringify(audioEvent));
    } catch (error) {
      console.error("Error sending audio:", error);
    }
  }
  
  /**
   * Signal end of audio input
   * @param {string} sessionId - Session ID
   */
  endAudio(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isConnected || !session.websocket) {
      return;
    }
    
    try {
      if (USE_MOCK_MODE) {
        console.log(`[MOCK MODE] Ending mock audio for session ${sessionId}`);
        // No action needed in mock mode since processAudio already handles responses
        return;
      }
      
      // Send end of audio signal through WebSocket
      const endAudioEvent = {
        type: 'end_audio'
      };
      
      session.websocket.send(JSON.stringify(endAudioEvent));
    } catch (error) {
      console.error("Error ending audio:", error);
    }
  }
  
  /**
   * Close the OpenAI session and WebSocket
   * @param {string} sessionId - Session ID
   */
  async closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    
    if (USE_MOCK_MODE) {
      console.log(`[MOCK MODE] Closing mock session ${sessionId}`);
      this.sessions.delete(sessionId);
      return;
    }
    
    // Close WebSocket if open
    if (session.websocket) {
      session.websocket.close();
    }
    
    // Remove session from memory
    this.sessions.delete(sessionId);
  }
  
  /**
   * Detect intents from text
   * @param {string} text - Text to analyze
   * @param {function} callback - Callback function
   */
  detectIntents(text, callback) {
    const detectedIntents = [];
    const lowerText = text.toLowerCase();
    
    // Check for "repeat that" intent
    if (
      lowerText.includes('repeat that') ||
      lowerText.includes('say that again') ||
      lowerText.includes('could you repeat') ||
      lowerText.includes('repita eso') ||
      lowerText.includes('repita por favor') ||
      lowerText.includes('dilo otra vez')
    ) {
      detectedIntents.push({
        type: 'repeat',
        value: true
      });
    }
    
    // Check for follow-up appointment intent
    if (
      lowerText.includes('follow up') || 
      lowerText.includes('follow-up') ||
      lowerText.includes('next appointment') ||
      lowerText.includes('schedule another') ||
      lowerText.includes('come back in') ||
      lowerText.includes('see you in') ||
      lowerText.includes('próxima cita') ||
      lowerText.includes('cita de seguimiento') ||
      lowerText.includes('volver a ver')
    ) {
      // Try to extract time period (e.g., "2 weeks")
      const timeRegex = /(\d+)\s*(day|week|month|año|día|semana|mes)/i;
      const match = lowerText.match(timeRegex);
      
      detectedIntents.push({
        type: 'follow_up',
        value: match ? `${match[1]} ${match[2]}${match[1] > 1 ? 's' : ''}` : true
      });
    }
    
    // Check for lab order intent
    if (
      lowerText.includes('lab') ||
      lowerText.includes('test') ||
      lowerText.includes('blood work') ||
      lowerText.includes('análisis') ||
      lowerText.includes('laboratorio') ||
      lowerText.includes('sangre') ||
      lowerText.includes('examen')
    ) {
      detectedIntents.push({
        type: 'lab_order',
        value: true
      });
    }
    
    callback(detectedIntents);
  }
  
  /**
   * Translate text between languages - mock implementation
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<string>} - Translated text
   */
  async translateText(text, sourceLanguage, targetLanguage) {
    if (USE_MOCK_MODE) {
      console.log(`[MOCK MODE] Mocking translation from ${sourceLanguage} to ${targetLanguage}`);
      
      // Return mock translations
      if (sourceLanguage === 'en' && targetLanguage === 'es') {
        return getMockSpanishTranslation(0, text);
      } else if (sourceLanguage === 'es' && targetLanguage === 'en') {
        return getMockEnglishTranslation(0, text);
      }
      
      // Fallback mock translation
      return `[Translation of "${text}"]`;
    }
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a professional medical interpreter. 
              Translate the following from ${sourceLanguage} to ${targetLanguage}. 
              Maintain medical terminology accurately.`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.4,
        max_tokens: 1024
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error('Failed to translate text');
    }
  }
  
  /**
   * Generate speech from text - mock implementation
   * @param {string} text - Text to convert to speech
   * @param {string} language - Language code
   * @returns {Promise<Buffer>} - Audio data
   */
  async generateSpeech(text, language) {
    if (USE_MOCK_MODE) {
      console.log(`[MOCK MODE] Mocking speech generation for: "${text}"`);
      // Return an empty buffer as mock audio data
      return Buffer.from([0, 0, 0, 0]);
    }
    
    try {
      const voice = language === 'es' ? 'coral' : 'alloy';
      
      const response = await this.openai.audio.speech.create({
        model: "tts-1",
        voice: voice,
        input: text
      });
      
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw new Error('Failed to generate speech');
    }
  }
  
  /**
   * Generate summary of the conversation
   * @param {Array} transcripts - Array of conversation transcripts
   * @returns {Promise<object>} - Summary object
   */
  async generateSummary(transcripts) {
    try {
      // Create conversation text from transcripts
      const conversationText = transcripts.map(t => 
        `${t.speaker} (${t.language === 'en' ? 'English' : 'Spanish'}): ${t.text}`
      ).join('\n');

      console.log('Generating summary for conversation:', conversationText);
      
      // Generate summary using GPT-4
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a medical scribe analyzing a conversation between a doctor and patient. 
            Create a concise summary of the conversation and identify any actions needed.
            Format your response as JSON with two keys:
            1. "text" - A paragraph summarizing the key points of the conversation
            2. "actions" - An array of strings listing detected actions such as "Schedule follow-up appointment" or "Send lab order"`
          },
          {
            role: "user",
            content: conversationText
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse and return the summary
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating summary:', error);

      // Handle specific error for model not found
      if (error.code === 'model_not_found') {
        console.warn('Falling back to mock mode due to missing model.');
        return {
          text: "This is a mock summary of the conversation.",
          actions: ["Mock action 1", "Mock action 2"]
        };
      }

      throw new Error('Failed to generate conversation summary');
    }
  }
}

// Helper functions for mock data
function getMockEnglishText(count) {
  const mockTexts = [
    "Hello, how are you feeling today?",
    "Can you describe your symptoms?",
    "How long have you had this pain?",
    "I'm going to prescribe some medication for you.",
    "Have you had any allergies to medication?",
    "Let's schedule a follow-up appointment next week."
  ];
  
  return mockTexts[count % mockTexts.length];
}

function getMockSpanishText(count) {
  const mockTexts = [
    "Hola, ¿cómo se siente hoy?",
    "¿Puede describir sus síntomas?",
    "¿Cuánto tiempo ha tenido este dolor?",
    "Voy a recetarle algunos medicamentos.",
    "¿Ha tenido alguna alergia a medicamentos?",
    "Programemos una cita de seguimiento la próxima semana."
  ];
  
  return mockTexts[count % mockTexts.length];
}

function getMockEnglishTranslation(count, text) {
  if (text) {
    return `[English translation: ${text}]`;
  }
  
  const mockTranslations = [
    "Hello, how are you feeling today?",
    "Can you describe your symptoms?",
    "How long have you had this pain?",
    "I'm going to prescribe some medication for you.",
    "Have you had any allergies to medication?",
    "Let's schedule a follow-up appointment next week."
  ];
  
  return mockTranslations[count % mockTranslations.length];
}

function getMockSpanishTranslation(count, text) {
  if (text) {
    return `[Spanish translation: ${text}]`;
  }
  
  const mockTranslations = [
    "Hola, ¿cómo se siente hoy?",
    "¿Puede describir sus síntomas?",
    "¿Cuánto tiempo ha tenido este dolor?",
    "Voy a recetarle algunos medicamentos.",
    "¿Ha tenido alguna alergia a medicamentos?",
    "Programemos una cita de seguimiento la próxima semana."
  ];
  
  return mockTranslations[count % mockTranslations.length];
}

module.exports = OpenAIService;