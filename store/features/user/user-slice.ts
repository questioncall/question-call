import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { DEFAULT_CALL_SETTINGS, type UserCallSettings } from "@/lib/call-settings";

type UserProfileState = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  userImage?: string;
  isHydrated: boolean;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "EXPIRED" | "NONE" | null;
  subscriptionEnd: string | null;
  pendingManualPayment: boolean;
  questionsAsked: number;
  questionsRemaining: number | null;
  maxQuestions: number;
  baseMaxQuestions: number;
  bonusQuestions: number;
  referralCode: string | null;
  planSlug: string | null;
  callSettings: UserCallSettings;
};

type UserProfileUpdate = Partial<Omit<UserProfileState, "callSettings">> & {
  callSettings?: Partial<UserCallSettings>;
};

const initialState: UserProfileState = {
  id: "",
  name: "",
  email: "",
  username: "",
  role: "STUDENT",
  userImage: "",
  isHydrated: false,
  subscriptionStatus: null,
  subscriptionEnd: null,
  pendingManualPayment: false,
  questionsAsked: 0,
  questionsRemaining: null,
  maxQuestions: 0,
  baseMaxQuestions: 0,
  bonusQuestions: 0,
  referralCode: null,
  planSlug: null,
  callSettings: DEFAULT_CALL_SETTINGS,
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
      state.subscriptionStatus = action.payload.subscriptionStatus;
      state.subscriptionEnd = action.payload.subscriptionEnd;
      state.pendingManualPayment = action.payload.pendingManualPayment;
      state.questionsAsked = action.payload.questionsAsked;
      state.questionsRemaining = action.payload.questionsRemaining;
      state.maxQuestions = action.payload.maxQuestions;
      state.baseMaxQuestions = action.payload.baseMaxQuestions;
      state.bonusQuestions = action.payload.bonusQuestions;
      state.referralCode = action.payload.referralCode;
      state.planSlug = action.payload.planSlug;
      state.callSettings = action.payload.callSettings;
      state.isHydrated = true;
    },
    updateProfile(state, action: PayloadAction<UserProfileUpdate>) {
      if (action.payload.id !== undefined) state.id = action.payload.id;
      if (action.payload.name !== undefined) state.name = action.payload.name;
      if (action.payload.email !== undefined) state.email = action.payload.email;
      if (action.payload.userImage !== undefined) state.userImage = action.payload.userImage;
      if (action.payload.username !== undefined) state.username = action.payload.username;
      if (action.payload.role !== undefined) state.role = action.payload.role;
      if (action.payload.subscriptionStatus !== undefined) state.subscriptionStatus = action.payload.subscriptionStatus;
      if (action.payload.subscriptionEnd !== undefined) state.subscriptionEnd = action.payload.subscriptionEnd;
      if (action.payload.pendingManualPayment !== undefined) state.pendingManualPayment = action.payload.pendingManualPayment;
      if (action.payload.questionsAsked !== undefined) state.questionsAsked = action.payload.questionsAsked;
      if (action.payload.questionsRemaining !== undefined) state.questionsRemaining = action.payload.questionsRemaining;
      if (action.payload.maxQuestions !== undefined) state.maxQuestions = action.payload.maxQuestions;
      if (action.payload.baseMaxQuestions !== undefined) state.baseMaxQuestions = action.payload.baseMaxQuestions;
      if (action.payload.bonusQuestions !== undefined) state.bonusQuestions = action.payload.bonusQuestions;
      if (action.payload.referralCode !== undefined) state.referralCode = action.payload.referralCode;
      if (action.payload.planSlug !== undefined) state.planSlug = action.payload.planSlug;
      if (action.payload.callSettings !== undefined) {
        state.callSettings = {
          ...state.callSettings,
          ...action.payload.callSettings,
        };
      }
    },
    clearProfile(state) {
      state.id = "";
      state.name = "";
      state.email = "";
      state.username = "";
      state.role = "STUDENT";
      state.userImage = "";
      state.isHydrated = false;
      state.subscriptionStatus = null;
      state.subscriptionEnd = null;
      state.pendingManualPayment = false;
      state.questionsAsked = 0;
      state.questionsRemaining = null;
      state.maxQuestions = 0;
      state.baseMaxQuestions = 0;
      state.bonusQuestions = 0;
      state.referralCode = null;
      state.planSlug = null;
      state.callSettings = DEFAULT_CALL_SETTINGS;
    },
  },
});

export const { setProfile, updateProfile, clearProfile } = userSlice.actions;

export default userSlice.reducer;
