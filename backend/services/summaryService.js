const OpenAI = require('openai');
const Session = require('../models/Session');
const Transcript = require('../models/Transcript');
const Summary = require('../models/Summary');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class SummaryService {
  /**
   * Generate a summary for a conversation
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Generated summary
   */
  async generateSummary(sessionId) {
    try {
      // Get session data
      const session = await Session.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Get all transcripts for the session
      const transcripts = await Transcript.find({ sessionId }).sort({ timestamp: 1 });
      if (transcripts.length === 0) {
        throw new Error('No transcripts found for this session');
      }

      // Format conversation for analysis
      let conversationText = "";
      transcripts.forEach(t => {
        conversationText += `${t.speaker} (${t.language === 'en' ? 'English' : 'Spanish'}): ${t.text}\n`;
      });

      // Use OpenAI to analyze and summarize the conversation
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a medical assistant analyzing a conversation between a doctor and patient.
              Generate a concise summary of the medical conversation.
              Also, identify if any of these actions are needed:
              1. Schedule follow-up appointment
              2. Send lab order
              
              Format your response as JSON with the following structure:
              {
                "summary": "Your summary text here",
                "actions": ["Action 1", "Action 2"]
              }`
          },
          {
            role: "user",
            content: conversationText
          }
        ],
        response_format: { type: "json_object" }
      });

      // Parse the response
      const result = JSON.parse(response.choices[0].message.content);
      
      // Save the summary
      const summary = new Summary({
        sessionId,
        text: result.summary,
        actions: result.actions,
        timestamp: new Date()
      });

      await summary.save();

      return {
        text: result.summary,
        actions: result.actions
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }

  /**
   * Get an existing summary for a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Summary object
   */
  async getSummary(sessionId) {
    try {
      const summary = await Summary.findOne({ sessionId })
        .sort({ timestamp: -1 });
      
      if (!summary) {
        throw new Error('No summary found for this session');
      }
      
      return {
        text: summary.text,
        actions: summary.actions
      };
    } catch (error) {
      console.error('Error fetching summary:', error);
      throw new Error(`Failed to fetch summary: ${error.message}`);
    }
  }
}

module.exports = new SummaryService();