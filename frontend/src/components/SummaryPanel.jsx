import React from 'react';
import { useSelector } from 'react-redux';

const SummaryPanel = ({ onBack }) => {
  const summary = useSelector((state) => state.conversation.summary); // Access summary from Redux state
  const transcripts = useSelector((state) => state.conversation.transcripts); // Access transcripts from Redux state
  
  const exportSummary = () => {
    // Create a text version of the summary
    let summaryText = "MEDICAL CONVERSATION SUMMARY\n\n";
    summaryText += `Date: ${new Date().toLocaleDateString()}\n\n`;
    summaryText += `${summary.text}\n\n`;
    summaryText += "DETECTED ACTIONS:\n";
    summary.actions.forEach(action => {
      summaryText += `- ${action}\n`; // Add detected actions
    });
    summaryText += "\nFULL TRANSCRIPT:\n\n";
    transcripts.forEach(t => {
      summaryText += `${t.speaker} (${t.language === 'en' ? 'English' : 'Spanish'}): ${t.text}\n`; // Add transcript text
      if (t.translation) {
        summaryText += `Translation: ${t.translation}\n`; // Add translation if available
      }
      summaryText += '\n';
    });
    
    // Create and download the file
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-conversation-${new Date().toISOString().slice(0, 10)}.txt`; // File name with date
    a.click();
    URL.revokeObjectURL(url); // Revoke the object URL
  };

  return (
    <div className="summary-panel">
      <div className="summary-header">
        <h2>Conversation Summary</h2>
        <button onClick={onBack} className="back-button">
          Back to Conversation
        </button>
      </div>
      
      {summary ? (
        <div className="summary-content">
          <div className="summary-text">
            <h3>Summary</h3>
            <p>{summary.text}</p> {/* Display summary text */}
          </div>
          
          <div className="detected-actions">
            <h3>Detected Actions:</h3>
            <ul>
              {summary.actions.map((action, index) => (
                <li key={index} className="action-item">
                  {action} {/* Display detected actions */}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="summary-actions">
            <button onClick={exportSummary} className="export-button">
              Export Summary {/* Button to export the summary */}
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-summary">
          <p>No summary available yet.</p> {/* Show empty state if no summary */}
        </div>
      )}
    </div>
  );
};

export default SummaryPanel;