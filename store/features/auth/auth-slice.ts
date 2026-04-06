import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { registerUserRequest } from "@/lib/api/auth";
import type { RegisterPayload, RegisteredUser } from "@/store/features/auth/types";

type RequestStatus = "idle" | "pending" | "succeeded" | "failed";

type AuthState = {
  registerStatus: RequestStatus;
  registerError: string | null;
};

const initialState: AuthState = {
  registerStatus: "idle",
  registerError: null,
};

export const registerUser = createAsyncThunk<
  RegisteredUser,
  RegisterPayload,
  { rejectValue: string }
>("auth/registerUser", async (payload, { rejectWithValue }) => {
  try {
    const response = await registerUserRequest(payload);
    return response.user;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create the account.";

    return rejectWithValue(message);
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthState(state) {
      state.registerStatus = "idle";
      state.registerError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.registerStatus = "pending";
        state.registerError = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.registerStatus = "succeeded";
        state.registerError = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.registerStatus = "failed";
        state.registerError =
          action.payload || "Unable to create the account.";
      });
  },
});

export const { clearAuthState } = authSlice.actions;

export default authSlice.reducer;
