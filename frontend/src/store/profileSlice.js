import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getProfile, saveProfile, startSession } from '../../utils/emailAuth.js'

const getErrorMessage = (error) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'

export const loadProfile = createAsyncThunk(
  'profile/load',
  async (firebaseUser, { rejectWithValue }) => {
    try {
      await startSession(await firebaseUser.getIdToken())
      const { profile } = await getProfile()
      return profile
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const saveUserProfile = createAsyncThunk(
  'profile/save',
  async (profile, { rejectWithValue }) => {
    try {
      const result = await saveProfile(profile)
      return result.profile
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

const initialState = {
  profile: null,
  status: 'idle',
  error: null,
  loadRequestId: null,
  saveRequestId: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfile(state) {
      state.profile = null
      state.status = 'idle'
      state.error = null
      state.loadRequestId = null
      state.saveRequestId = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProfile.pending, (state, action) => {
        state.profile = null
        state.status = 'loading'
        state.error = null
        state.loadRequestId = action.meta.requestId
      })
      .addCase(loadProfile.fulfilled, (state, action) => {
        if (state.loadRequestId !== action.meta.requestId) return
        state.profile = action.payload
        state.status = action.payload ? 'ready' : 'setup'
        state.loadRequestId = null
      })
      .addCase(loadProfile.rejected, (state, action) => {
        if (state.loadRequestId !== action.meta.requestId) return
        state.profile = null
        state.status = 'error'
        state.error = action.payload || action.error.message || 'Could not load your profile.'
        state.loadRequestId = null
      })
      .addCase(saveUserProfile.pending, (state, action) => {
        state.status = 'saving'
        state.error = null
        state.saveRequestId = action.meta.requestId
      })
      .addCase(saveUserProfile.fulfilled, (state, action) => {
        if (state.saveRequestId !== action.meta.requestId) return
        state.profile = action.payload
        state.status = 'ready'
        state.saveRequestId = null
      })
      .addCase(saveUserProfile.rejected, (state, action) => {
        if (state.saveRequestId !== action.meta.requestId) return
        state.status = 'setup'
        state.error = action.payload || action.error.message || 'Could not save your profile.'
        state.saveRequestId = null
      })
  },
})

export const { clearProfile } = profileSlice.actions
export default profileSlice.reducer
