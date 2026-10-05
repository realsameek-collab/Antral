import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice.js'
import profileReducer from './profileSlice.js'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
  },
})
