import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './App.css';
import RoleToggle from './components/RoleToggle';
import SpeechStream from './components/SpeechStream';
import TranscriptPanel from './components/TranscriptPanel';
import SummaryPanel from './components/SummaryPanel';
import { setSummary, startNewConversation } from './redux/conversationSlice';
import { generateSummary } from './services/apiService';
import { initializeSocket, closeSocket, endSession as endSocketSession } from './services/socketService';

function App() {
  const dispatch = useDispatch();
  const [showingSummary, setShowingSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Add a ref to track mounted state
  const isMounted = useRef(true);
  
  const { transcripts, isRecording, conversationId } = useSelector((state) => state.conversation);

  // Track component mounted state
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initialize socket connection when app loads
  useEffect(() => {
    const init = async () => {
      try {
        await initializeSocket();
      } catch (err) {
        console.error("Failed to connect to server:", err);
        setError("Connection to server failed. Please refresh the page.");
      }
    };

    init();

    // Clean up when component unmounts
    return () => {
      closeSocket();
    };
  }, []);

  const handleGenerateSummary = async () => {
    if (transcripts.length === 0) {
      setError("No conversation to summarize yet.");
      return;
    }
    
    if (isRecording) {
      setError("Please stop recording before generating a summary.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // End the current session
      await endSocketSession();
      
      // Generate summary from the backend
      const response = await generateSummary(conversationId, transcripts);
      
      if (response.success && response.summary) {
        dispatch(setSummary(response.summary));
        setShowingSummary(true);
      } else {
        throw new Error("Failed to generate summary");
      }
    } catch (error) {
      console.error("Failed to generate summary:", error);
      setError("Failed to generate summary. Please try again.");
      
      // Create a fallback summary if the API call fails
      dispatch(setSummary({
        text: "Unable to generate a summary of the conversation at this time.",
        actions: [
          "Please try again later"
        ]
      }));
      setShowingSummary(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStartNewSession = async () => {
    if (isRecording) {
      setError("Please stop recording before starting a new conversation.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      console.log("Starting new conversation flow");
      
      // First update Redux state
      dispatch(startNewConversation());
      
      // Then handle socket reconnection
      try {
        // End previous session
        console.log("Ending previous session");
        await endSocketSession();
        console.log("Session ended successfully");
        
        // Close the socket completely
        closeSocket();
        console.log("Socket closed");
        
        // Wait a moment before reconnecting
        console.log("Waiting before reconnecting...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reconnect socket
        console.log("Initializing new socket connection");
        await initializeSocket();
        console.log("Socket initialized successfully");
        
        if (isMounted.current) {
          setShowingSummary(false);
          setError(null);
        }
      } catch (error) {
        console.error("Socket reconnection error:", error);
        if (isMounted.current) {
          setError("Connection issues. Please refresh the page if problems persist.");
        }
      }
    } catch (error) {
      console.error("Failed during new conversation setup:", error);
      if (isMounted.current) {
        setError("Failed to start a new conversation. Please refresh the page.");
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="app-container">
      {/* Header section */}
      <header className="app-header">
        <h1>Medical Interpreter</h1>
        <div className="header-actions">
          {/* Button to start a new conversation */}
          <button 
            onClick={handleStartNewSession}
            disabled={isRecording || isLoading}
            className="new-conversation-button"
          >
            {isLoading ? 'Working...' : 'New Conversation'}
          </button>
        </div>
      </header>
      
      {/* Main content section */}
      <main className="app-main">
        <div className="control-panel">
          <RoleToggle />
          <SpeechStream />
          
          {/* Button to generate a summary of the conversation */}
          <button 
            onClick={handleGenerateSummary}
            disabled={transcripts.length === 0 || isRecording || isLoading}
            className="generate-summary-button"
          >
            {isLoading ? 'Generating...' : 'End Conversation & Generate Summary'}
          </button>
          
          {error && <div className="error-message">{error}</div>}
        </div>
        
        {/* Conditionally render the summary panel or transcript panel */}
        {showingSummary ? (
          <SummaryPanel onBack={() => setShowingSummary(false)} /> 
        ) : (
          <TranscriptPanel />
        )}
      </main>
    </div>
  );
}

export default App;