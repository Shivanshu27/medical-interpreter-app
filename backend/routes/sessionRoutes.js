// routes/sessionRoutes.js
const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const TranscriptService = require('../services/transcriptService');

// Create a new session
router.post('/', async (req, res) => {
  try {
    const sessionId = `session_${Date.now()}`;
    const session = new Session({
      sessionId,
      currentRole: req.body.initialRole || 'Doctor',
      status: 'active',
      startTime: new Date()
    });
    
    await session.save();
    
    res.status(201).json({
      success: true,
      sessionId: session.sessionId,
      message: 'Session created successfully'
    });
  } catch (error) {
    console.error('Failed to create session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session'
    });
  }
});

// Get session details
router.get('/:sessionId', async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Failed to get session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session'
    });
  }
});

// End a session
router.put('/:sessionId/end', async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { sessionId: req.params.sessionId, status: 'active' },
      { 
        status: 'completed',
        endTime: new Date()
      },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Active session not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Session ended successfully',
      session
    });
  } catch (error) {
    console.error('Failed to end session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end session'
    });
  }
});

// Update session role
router.put('/:sessionId/role', async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role || !['Doctor', 'Patient'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }
    
    const session = await Session.findOneAndUpdate(
      { sessionId: req.params.sessionId, status: 'active' },
      { currentRole: role },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Active session not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Session role updated',
      session
    });
  } catch (error) {
    console.error('Failed to update session role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session role'
    });
  }
});

// Delete a session and its transcripts
router.delete('/:sessionId', async (req, res) => {
  try {
    const session = await Session.findOneAndDelete({ sessionId: req.params.sessionId });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Delete all associated transcripts
    await TranscriptService.deleteSessionTranscripts(req.params.sessionId);
    
    res.status(200).json({
      success: true,
      message: 'Session and all related data deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session'
    });
  }
});

// Add an intent to a session
router.post('/:sessionId/intents', async (req, res) => {
  try {
    const { type, value } = req.body;
    
    if (!type || !['follow_up', 'lab_order', 'repeat', 'other'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid intent type'
      });
    }
    
    const session = await Session.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { 
        $push: { 
          detectedIntents: {
            type,
            value,
            detectedAt: new Date()
          }
        }
      },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Intent added successfully',
      intent: session.detectedIntents[session.detectedIntents.length - 1]
    });
  } catch (error) {
    console.error('Failed to add intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add intent'
    });
  }
});

module.exports = router;