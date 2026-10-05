import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {
  getPolicies,
  getConsentStatus,
  acceptAccountPolicies,
  authorizeTarget as authorizeTargetApi,
  updateTargetScopes as updateTargetScopesApi,
  revokeTargetAuthorization as revokeTargetApi,
  setDisabledCapabilities as setDisabledCapabilitiesApi,
} from '../../utils/consentApi.js'

const getErrorMessage = (error) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'

// Load the policy documents and the user's current consent state together.
export const loadConsent = createAsyncThunk(
  'consent/load',
  async (_arg, { rejectWithValue }) => {
    try {
      const [policies, status] = await Promise.all([getPolicies(), getConsentStatus()])
      return { policies, status }
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const acceptAccount = createAsyncThunk(
  'consent/acceptAccount',
  async (_arg, { getState, rejectWithValue }) => {
    try {
      const versions = getState().consent.policies?.versions?.account
      await acceptAccountPolicies(versions)
      return await getConsentStatus()
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const authorizeTarget = createAsyncThunk(
  'consent/authorizeTarget',
  async (authorization, { rejectWithValue }) => {
    try {
      const { authorization: created } = await authorizeTargetApi(authorization)
      return created
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const updateTargetScopes = createAsyncThunk(
  'consent/updateTargetScopes',
  async ({ id, scopes }, { rejectWithValue }) => {
    try {
      const { authorization } = await updateTargetScopesApi(id, scopes)
      return authorization
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const revokeTarget = createAsyncThunk(
  'consent/revokeTarget',
  async (id, { rejectWithValue }) => {
    try {
      await revokeTargetApi(id)
      return id
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

// Turn a capability off (or back on) account-wide. `disabled` is the full list.
export const setDisabledCapabilities = createAsyncThunk(
  'consent/setDisabledCapabilities',
  async (disabled, { rejectWithValue }) => {
    try {
      const res = await setDisabledCapabilitiesApi(disabled)
      return res.disabledCapabilities
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

const initialState = {
  policies: null, // { accountDocuments, targetAuthorization, scopes, versions }
  account: null, // { accepted, missing, acceptedVersions, status }
  authorizations: [],
  status: 'idle', // idle | loading | ready | error
  error: null,
  accepting: false,
}

const consentSlice = createSlice({
  name: 'consent',
  initialState,
  reducers: {
    clearConsent() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadConsent.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadConsent.fulfilled, (state, action) => {
        state.policies = action.payload.policies
        state.account = action.payload.status.account
        state.authorizations = action.payload.status.authorizations
        state.status = 'ready'
      })
      .addCase(loadConsent.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload || 'Could not load policies.'
      })
      .addCase(acceptAccount.pending, (state) => {
        state.accepting = true
        state.error = null
      })
      .addCase(acceptAccount.fulfilled, (state, action) => {
        state.account = action.payload.account
        state.authorizations = action.payload.authorizations
        state.accepting = false
      })
      .addCase(acceptAccount.rejected, (state, action) => {
        state.accepting = false
        state.error = action.payload || 'Could not record your acceptance.'
      })
      .addCase(authorizeTarget.fulfilled, (state, action) => {
        state.authorizations = [
          action.payload,
          ...state.authorizations.filter((a) => a.id !== action.payload.id),
        ]
      })
      .addCase(updateTargetScopes.fulfilled, (state, action) => {
        state.authorizations = state.authorizations.map((a) =>
          a.id === action.payload.id ? action.payload : a,
        )
      })
      .addCase(revokeTarget.fulfilled, (state, action) => {
        state.authorizations = state.authorizations.filter((a) => a.id !== action.payload)
      })
      .addCase(setDisabledCapabilities.pending, (state, action) => {
        // Optimistic: reflect the toggle immediately.
        if (state.account) state.account.disabledCapabilities = action.meta.arg
      })
      .addCase(setDisabledCapabilities.fulfilled, (state, action) => {
        if (state.account) state.account.disabledCapabilities = action.payload
      })
      .addCase(setDisabledCapabilities.rejected, (state, action) => {
        state.error = action.payload || 'Could not update capabilities.'
      })
  },
})

export const { clearConsent } = consentSlice.actions
export default consentSlice.reducer
