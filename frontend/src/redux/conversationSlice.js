import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  role: 'Doctor', // Default role (English speaker)
  transcripts: [], // Stores conversation transcripts
  summary: null, // Stores conversation summary
  isRecording: false, // Recording state
  conversationId: new Date().getTime().toString(), // Unique ID for the conversation
  lastTranslation: null, // Store last translation for repeat functionality
};

const conversationSlice = createSlice({
  name: 'conversation',
  initialState,
  reducers: {
    toggleRole: (state) => {
      state.role = state.role === 'Doctor' ? 'Patient' : 'Doctor';
    },
    addTranscript: (state, action) => {
      const transcript = action.payload;
      
      // Mark previous transcripts as not current speaker
      state.transcripts = state.transcripts.map(t => ({
        ...t,
        isCurrentSpeaker: false
      }));
      
      // Add new transcript
      state.transcripts.push(transcript);
      
      // Store last translation for repeat functionality
      if (transcript.translation) {
        state.lastTranslation = transcript;
      }
    },
    setSummary: (state, action) => {
      state.summary = action.payload;
    },
    setIsRecording: (state, action) => {
      state.isRecording = action.payload;
    },
    startNewConversation: (state) => {
      state.transcripts = [];
      state.summary = null;
      state.conversationId = new Date().getTime().toString();
      state.lastTranslation = null;
    },
    setLastTranslation: (state, action) => {
      state.lastTranslation = action.payload;
    },
  },
});

export const { 
  toggleRole, 
  addTranscript, 
  setSummary, 
  setIsRecording,
  startNewConversation,
  setLastTranslation
} = conversationSlice.actions;

export default conversationSlice.reducer;