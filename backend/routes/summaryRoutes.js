// routes/summaryRoutes.js
const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const OpenAIService = require('../services/openAIService');
const TranscriptService = require('../services/transcriptService');

// Generate summary for a conversation
router.post('/', async (req, res) => {
  try {
    const { transcripts, sessionId } = req.body;
    
    if (!transcripts || !Array.isArray(transcripts) || transcripts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid transcripts array is required'
      });
    }
    
    // Initialize OpenAI service
    const openAIService = new OpenAIService();
    
    // Generate summary using OpenAI
    const summary = await openAIService.generateSummary(transcripts);
    
    // If sessionId is provided, update the session with the summary
    if (sessionId) {
      await Session.findOneAndUpdate(
        { sessionId },
        {
          summary: {
            text: summary.text,
            actions: summary.actions,
            generatedAt: new Date()
          }
        },
        { new: true }
      );
    }
    
    res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Failed to generate summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate summary'
    });
  }
});

// Get summary for a session
router.get('/:sessionId', async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (!session.summary) {
      // If summary doesn't exist, generate it on-the-fly
      const transcripts = await TranscriptService.getSessionTranscripts(req.params.sessionId);
      
      if (transcripts.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No transcripts available to generate summary'
        });
      }
      
      const openAIService = new OpenAIService();
      const summary = await openAIService.generateSummary(transcripts);
      
      // Update session with the new summary
      await Session.findOneAndUpdate(
        { sessionId: req.params.sessionId },
        {
          summary: {
            text: summary.text,
            actions: summary.actions,
            generatedAt: new Date()
          }
        }
      );
      
      return res.status(200).json({
        success: true,
        summary,
        generated: true
      });
    }
    
    res.status(200).json({
      success: true,
      summary: session.summary,
      generated: false
    });
  } catch (error) {
    console.error('Failed to get summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve summary'
    });
  }
});

module.exports = router;