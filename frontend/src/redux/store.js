import { configureStore } from '@reduxjs/toolkit';
import conversationReducer from './conversationSlice';

const store = configureStore({
  reducer: {
    conversation: conversationReducer,
  },
});

export default store;
