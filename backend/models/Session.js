// models/Session.js
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  currentRole: {
    type: String,
    enum: ['Doctor', 'Patient'],
    default: 'Doctor'
  },
  summary: {
    text: String,
    actions: [String],
    generatedAt: Date
  },
  detectedIntents: [{
    type: {
      type: String,
      enum: ['follow_up', 'lab_order', 'repeat', 'other']
    },
    value: mongoose.Schema.Types.Mixed,
    detectedAt: {
      type: Date,
      default: Date.now
    }
  }]
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;