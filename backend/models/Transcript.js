// models/Transcript.js
const mongoose = require('mongoose');

const transcriptSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  speaker: {
    type: String,
    required: true,
    enum: ['Doctor', 'Patient']
  },
  text: {
    type: String,
    required: true
  },
  translation: {
    type: String,
    default: null
  },
  language: {
    type: String,
    required: true,
    enum: ['en', 'es']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isCurrentSpeaker: {
    type: Boolean,
    default: false
  }
});

// Index for efficient queries
transcriptSchema.index({ sessionId: 1, timestamp: 1 });

const Transcript = mongoose.model('Transcript', transcriptSchema);

module.exports = Transcript;