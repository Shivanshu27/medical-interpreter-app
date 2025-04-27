// routes/transcriptRoutes.js
const express = require('express');
const router = express.Router();
const TranscriptService = require('../services/transcriptService');
const Transcript = require('../models/Transcript');

// Add a new transcript
router.post('/', async (req, res) => {
  try {
    const { sessionId, speaker, text, language, translation } = req.body;
    
    if (!sessionId || !speaker || !text || !language) {
      return res.status(400).json({
        success: false,
        message: 'Missing required transcript data'
      });
    }
    
    const transcript = await TranscriptService.saveTranscript(sessionId, {
      speaker,
      text,
      language,
      translation,
      timestamp: new Date()
    });
    
    res.status(201).json({
      success: true,
      transcript
    });
  } catch (error) {
    console.error('Failed to save transcript:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save transcript'
    });
  }
});

// Get all transcripts for a session
router.get('/:sessionId', async (req, res) => {
  try {
    const transcripts = await TranscriptService.getSessionTranscripts(req.params.sessionId);
    
    res.status(200).json({
      success: true,
      transcripts
    });
  } catch (error) {
    console.error('Failed to fetch transcripts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transcripts'
    });
  }
});

// Update transcript translation
router.put('/:transcriptId/translation', async (req, res) => {
  try {
    const { translation } = req.body;
    
    if (!translation) {
      return res.status(400).json({
        success: false,
        message: 'Translation text is required'
      });
    }
    
    const transcript = await TranscriptService.updateTranslation(
      req.params.transcriptId,
      translation
    );
    
    res.status(200).json({
      success: true,
      transcript
    });
  } catch (error) {
    console.error('Failed to update translation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update translation'
    });
  }
});

// Delete a transcript
router.delete('/:transcriptId', async (req, res) => {
  try {
    const result = await Transcript.findByIdAndDelete(req.params.transcriptId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Transcript not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Transcript deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete transcript:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transcript'
    });
  }
});

module.exports = router;