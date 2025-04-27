import React from 'react';
import { useSelector } from 'react-redux';

const TranscriptPanel = () => {
  const transcripts = useSelector((state) => state.conversation.transcripts); // Access transcripts from Redux state
  console.log(transcripts);
  return (
    <div className="transcript-panel">
      <h2>Conversation History</h2>
      
      {transcripts.length === 0 ? (
        // Show empty state if no transcripts are available
        <div className="empty-state">
          No conversation yet. Start speaking to begin.
        </div>
      ) : (
        // Render a list of transcripts
        <ul className="transcript-list">
          {transcripts.map((transcript, index) => (
            <li
              key={index}
              className={`transcript-item ${transcript.isCurrentSpeaker ? 'current-speaker' : ''}`}
            >
              <div className="transcript-header">
                <span className="speaker-name">{transcript.speaker}</span> {/* Speaker's role */}
                <span className="language-tag">
                  {transcript.language === 'en' ? 'English' : 'Spanish'} {/* Language tag */}
                </span>
                <span className="timestamp">
                  {new Date(transcript.timestamp).toLocaleTimeString()} {/* Timestamp */}
                </span>
              </div>
              
              <div className="transcript-content">
                {transcript.text} {/* Transcript text */}
              </div>
              
              {transcript.translation && (
                <div className="translation">
                  <span className="translation-label">Translation:</span>
                  <span className="translation-text">{transcript.translation}</span> {/* Translation text */}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TranscriptPanel;