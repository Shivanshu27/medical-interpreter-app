const mongoose = require('mongoose');

const SummarySchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  actions: [{
    type: String
  }],
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Summary', SummarySchema);  