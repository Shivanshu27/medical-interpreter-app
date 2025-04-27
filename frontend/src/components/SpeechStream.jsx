import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTranscript, setIsRecording } from '../redux/conversationSlice';
import { initializeSocket, getSocket, sendAudioData } from '../services/socketService';

const SpeechStream = () => {
  const dispatch = useDispatch();
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const audioLevelRef = useRef(null); // Ref for the audio level element
  
  const { role, isRecording, lastTranslation, conversationId } = useSelector((state) => state.conversation);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Initialize socket connection when component mounts
  useEffect(() => {
    const initSocket = async () => {
      try {
        // Initialize socket connection to backend
        await initializeSocket();
        const socket = getSocket();
        
        if (socket) {
          console.log("Socket initialized successfully:", socket.id);
          setIsConnected(true);
          
          // Listen for transcription updates from server
          socket.on('transcript_update', (transcript) => {
            console.log("Received transcript:", transcript);
            dispatch(addTranscript({
              speaker: transcript.speaker || role,
              text: transcript.text,
              isCurrentSpeaker: true,
              timestamp: transcript.timestamp || new Date().toISOString(),
              language: role === 'Doctor' ? 'en' : 'es',
              translation: transcript.translation || null
            }));
          });

          // Listen for audio responses from server
          socket.on('audio_response', (data) => {
            console.log("Received audio response");
            playAudio(data.audio);
          });

          // Listen for connection status
          socket.on('connect', () => {
            console.log("Socket connected:", socket.id);
            setIsConnected(true);
          });

          socket.on('disconnect', () => {
            console.log("Socket disconnected");
            setIsConnected(false);
          });

          // Join the session
          console.log("Joining session:", conversationId);
          socket.emit('join_session', {
            sessionId: conversationId,
            role: role
          });
        }
      } catch (error) {
        console.error("Failed to initialize socket:", error);
        setError("Connection to server failed. Please try again.");
      }
    };

    initSocket();

    // Try to test connection explicitly
    setTimeout(() => {
      const socket = getSocket();
      if (socket && socket.connected) {
        console.log("Testing socket connection");
        socket.emit('test_connection', { timestamp: new Date().toISOString() });
      }
    }, 2000);

    return () => {
      // Clean up socket listeners on unmount
      const socket = getSocket();
      if (socket) {
        socket.off('transcript_update');
        socket.off('audio_response');
        socket.off('error');
        socket.off('connect');
        socket.off('disconnect');
      }
    };
  }, [conversationId, dispatch, role]);

  // Create audio context when needed
  useEffect(() => {
    const setupAudioContext = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000
        });
        console.log("Audio context created successfully");
      } catch (error) {
        console.error("Failed to create audio context:", error);
        setError("Could not access audio features. Please check your browser permissions.");
      }
    };
    
    setupAudioContext();
    
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Listen for role changes to update the session
  useEffect(() => {
    const socket = getSocket();
    if (socket && isConnected) {
      console.log(`Changing role to ${role} for conversationId ${conversationId}`);
      
      // Ensure we're in the session first
      socket.emit('join_session', { 
        sessionId: conversationId,
        role: role 
      });
      
      // Then change the role
      socket.emit('change_role', { newRole: role });
    }
  }, [role, isConnected, conversationId]);

  const toggleRecording = async () => {
    const socket = getSocket();
    if (!socket || !socket.connected) {
      setError("Not connected to server. Please refresh the page.");
      console.error("Socket not connected when attempting to record. Socket exists:", !!socket);
      return;
    }

    if (isRecording) {
      console.log('Stopping recording');
      // Stop recording
      dispatch(setIsRecording(false));
      
      // Tell the server speech has ended
      console.log('Emitting end_speech event to server');
      socket.emit('end_speech');
      
      // Stop the microphone stream
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Disconnect the audio processor
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
    } else {
      console.log('Starting recording');
      // Start recording
      dispatch(setIsRecording(true));
      
      try {
        // Get microphone access
        console.log('Requesting microphone access');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone access granted');
        streamRef.current = stream;
        
        // if (!audioContextRef.current) {
          console.log('Creating new AudioContext');
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000
          });
        // }
        
        const source = audioContextRef.current.createMediaStreamSource(stream);
        console.log('Created media stream source');
        
        // Use ScriptProcessor (more reliable across browsers)
        console.log('Setting up ScriptProcessor');
        setupScriptProcessor(source, socket);
      } catch (error) {
        console.error("Failed to start recording:", error);
        dispatch(setIsRecording(false));
        setError("Could not access microphone. Please check your permissions.");
      }
    }
  };

  const setupScriptProcessor = (source, socket) => {
    console.log('Creating ScriptProcessor');
    processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let packetCounter = 0;

    // Update audio meter periodically
    const meterInterval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      let max = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
        max = Math.max(max, dataArray[i]);
      }

      const avg = sum / bufferLength;
      const scaledLevel = Math.min(100, avg * 3);

      setAudioLevel(scaledLevel);

      // Safely update the audio level element's style
      if (audioLevelRef.current) {
        audioLevelRef.current.style.width = `${scaledLevel}%`;
        if (scaledLevel > 50) {
          audioLevelRef.current.style.backgroundColor = 'red';
        } else if (scaledLevel > 20) {
          audioLevelRef.current.style.backgroundColor = 'orange';
        } else {
          audioLevelRef.current.style.backgroundColor = 'green';
        }
      }
    }, 100);

    processorRef.current.onaudioprocess = (e) => {
      if (!socket || !socket.connected) {
        console.warn("Socket not connected in onaudioprocess");
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);

      // Check for audio activity
      let maxLevel = 0;
      for (let i = 0; i < inputData.length; i++) {
        maxLevel = Math.max(maxLevel, Math.abs(inputData[i]));
      }

      // Send audio data to server
      packetCounter++;
      const dataArray = new Float32Array(inputData);
      socket.emit('audio_data', dataArray.buffer);

      // Log occasionally
      if (packetCounter % 10 === 0) {
        console.log(`Sent audio packet #${packetCounter}, max level: ${maxLevel.toFixed(3)}`);
      }
    };

    source.connect(processorRef.current);
    processorRef.current.connect(audioContextRef.current.destination);

    console.log('ScriptProcessor setup complete');

    // Cleanup interval on unmount
    return () => clearInterval(meterInterval);
  };

  const handleRepeatCommand = () => {
    const socket = getSocket();
    if (socket && lastTranslation) {
      socket.emit('repeat_translation', {
        sessionId: conversationId,
        translationId: lastTranslation.id
      });
    }
  };

  const playAudio = (audioData) => {
    try {
      if (!audioContextRef.current) return;
      
      // Create an audio buffer from the incoming data
      const arrayBuffer = new Uint8Array(audioData).buffer;
      
      // Decode the audio data
      audioContextRef.current.decodeAudioData(arrayBuffer, (buffer) => {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start();
      }, (error) => {
        console.error("Error decoding audio data:", error);
      });
    } catch (error) {
      console.error("Failed to play audio:", error);
    }
  };

  // Add this function to directly test socket communication
  const testSocketCommunication = () => {
    const socket = getSocket();
    if (!socket) {
      console.error("Cannot test socket communication - socket not initialized");
      return;
    }
    
    console.log("Testing socket communication...");
    socket.emit("test_connection", { timestamp: new Date().toISOString() });
    
    // Listen for response
    socket.once("test_response", (data) => {
      console.log("Received test response:", data);
    });
  };

  // Call this function when component mounts
  useEffect(() => {
    // Wait a bit to make sure socket is initialized
    const timer = setTimeout(() => {
      testSocketCommunication();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="speech-stream-container">
      <button 
        onClick={toggleRecording}
        className={`recording-button ${isRecording ? 'recording' : ''}`}
        disabled={!isConnected}
      >
        {isRecording ? 'Stop Speaking' : 'Start Speaking'}
      </button>
      
      {isRecording && (
        <div className="recording-indicators">
          <div className="recording-indicator">
            Recording as {role} ({role === 'Doctor' ? 'English' : 'Spanish'})
          </div>
          <div className="audio-meter">
            <div className="audio-level" ref={audioLevelRef}></div>
          </div>
        </div>
      )}
      
      {!isConnected && (
        <div className="connection-status error">
          Not connected to server
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default SpeechStream;