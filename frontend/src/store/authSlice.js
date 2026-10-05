import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null,
  status: 'checking',
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthUser(state, action) {
      state.user = action.payload
      state.status = action.payload ? 'authenticated' : 'unauthenticated'
    },
  },
})

export const { setAuthUser } = authSlice.actions
export default authSlice.reducer
