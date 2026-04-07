import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type UserProfileState = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  userImage?: string;
  isHydrated: boolean;
};

const initialState: UserProfileState = {
  id: "",
  name: "",
  email: "",
  username: "",
  role: "STUDENT",
  userImage: "",
  isHydrated: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<Omit<UserProfileState, "isHydrated">>) {
      state.id = action.payload.id;
      state.name = action.payload.name || "";
      state.email = action.payload.email || "";
      state.username = action.payload.username || "";
      state.role = action.payload.role;
      state.userImage = action.payload.userImage || "";
      state.isHydrated = true;
    },
    updateProfile(state, action: PayloadAction<Partial<UserProfileState>>) {
      if (action.payload.name !== undefined) state.name = action.payload.name;
      if (action.payload.userImage !== undefined) state.userImage = action.payload.userImage;
      if (action.payload.username !== undefined) state.username = action.payload.username;
    },
    clearProfile(state) {
      state.id = "";
      state.name = "";
      state.email = "";
      state.username = "";
      state.role = "STUDENT";
      state.userImage = "";
      state.isHydrated = false;
    },
  },
});

export const { setProfile, updateProfile, clearProfile } = userSlice.actions;

export default userSlice.reducer;
