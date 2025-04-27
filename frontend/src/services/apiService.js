/**
 * Base API service for making requests to the backend
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Make an API request with default options
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
const makeRequest = async (endpoint, options = {}) => {
  try {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

/**
 * Create a new conversation session
 * @param {Object} options - Session options
 * @param {string} options.initialRole - Initial role (Doctor or Patient)
 * @returns {Promise<Object>} Session data
 */
export const createSession = async (options = {}) => {
  return makeRequest('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(options)
  });
};

/**
 * Get session details
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Session data
 */
export const getSession = async (sessionId) => {
  return makeRequest(`/api/sessions/${sessionId}`);
};

/**
 * End a conversation session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Result
 */
export const endSession = async (sessionId) => {
  return makeRequest(`/api/sessions/${sessionId}/end`, {
    method: 'PUT'
  });
};

/**
 * Get transcripts for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array>} Transcripts
 */
export const getTranscripts = async (sessionId) => {
  return makeRequest(`/api/transcripts/${sessionId}`);
};

/**
 * Generate a summary for a conversation
 * @param {string} sessionId - Session ID
 * @param {Array} transcripts - Transcript data
 * @returns {Promise<Object>} Summary data
 */
export const generateSummary = async (sessionId, transcripts) => {
  return makeRequest('/api/summary', {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      transcripts
    })
  });
};

/**
 * Get an existing summary for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Summary data
 */
export const getSummary = async (sessionId) => {
  return makeRequest(`/api/summary/${sessionId}`);
};
