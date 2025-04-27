// services/transcriptService.js
const Transcript = require('../models/Transcript');

class TranscriptService {
  /**
   * Save a transcript to the database
   * @param {string} sessionId - Session ID
   * @param {object} transcriptData - Transcript data
   * @returns {Promise<object>} - Saved transcript
   */
  static async saveTranscript(sessionId, transcriptData) {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      const transcript = new Transcript({
        sessionId,
        speaker: transcriptData.speaker,
        text: transcriptData.text,
        timestamp: transcriptData.timestamp || new Date(),
        language: transcriptData.language,
        translation: transcriptData.translation
      });
      
      await transcript.save();
      return transcript;
    } catch (error) {
      console.error('Error saving transcript:', error);
      throw new Error('Failed to save transcript');
    }
  }
  
  /**
   * Get all transcripts for a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} - Array of transcripts
   */
  static async getSessionTranscripts(sessionId) {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      const transcripts = await Transcript.find({ sessionId })
        .sort({ timestamp: 1 })
        .lean();
        
      return transcripts;
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      throw new Error('Failed to fetch transcripts');
    }
  }
  
  /**
   * Update a transcript with its translation
   * @param {string} transcriptId - Transcript ID
   * @param {string} translation - Translation text
   * @returns {Promise<object>} - Updated transcript
   */
  static async updateTranslation(transcriptId, translation) {
    try {
      if (!transcriptId || !translation) {
        throw new Error('Transcript ID and translation are required');
      }
      
      const transcript = await Transcript.findByIdAndUpdate(
        transcriptId,
        { $set: { translation } },
        { new: true }
      );
      
      if (!transcript) {
        throw new Error('Transcript not found');
      }
      
      return transcript;
    } catch (error) {
      console.error('Error updating translation:', error);
      throw new Error('Failed to update translation');
    }
  }
  
  /**
   * Delete all transcripts for a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  static async deleteSessionTranscripts(sessionId) {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      await Transcript.deleteMany({ sessionId });
    } catch (error) {
      console.error('Error deleting transcripts:', error);
      throw new Error('Failed to delete transcripts');
    }
  }
}

module.exports = TranscriptService;