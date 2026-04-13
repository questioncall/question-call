import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type UploadJob = {
  id: string;
  filename: string;
  title: string;
  progressPercent: number;
  status: "UPLOADING" | "PROCESSING" | "READY" | "ERROR";
  error?: string;
};

type UploadState = {
  jobs: Record<string, UploadJob>;
};

const initialState: UploadState = {
  jobs: {},
};

const uploadSlice = createSlice({
  name: "upload",
  initialState,
  reducers: {
    addUploadJob(
      state,
      action: PayloadAction<{ id: string; filename: string; title: string }>,
    ) {
      state.jobs[action.payload.id] = {
        id: action.payload.id,
        filename: action.payload.filename,
        title: action.payload.title,
        progressPercent: 0,
        status: "UPLOADING",
      };
    },
    updateUploadProgress(
      state,
      action: PayloadAction<{ id: string; progress: number }>,
    ) {
      const job = state.jobs[action.payload.id];
      if (job) {
        job.progressPercent = action.payload.progress;
      }
    },
    completeUpload(state, action: PayloadAction<string>) {
      const job = state.jobs[action.payload];
      if (job) {
        job.progressPercent = 100;
        job.status = "READY";
      }
    },
    failUpload(
      state,
      action: PayloadAction<{ id: string; error: string }>,
    ) {
      const job = state.jobs[action.payload.id];
      if (job) {
        job.status = "ERROR";
        job.error = action.payload.error;
      }
    },
    setUploadProcessing(state, action: PayloadAction<string>) {
      const job = state.jobs[action.payload];
      if (job) {
        job.progressPercent = 100;
        job.status = "PROCESSING";
      }
    },
    clearUploadJob(state, action: PayloadAction<string>) {
      delete state.jobs[action.payload];
    },
  },
});

export const {
  addUploadJob,
  updateUploadProgress,
  completeUpload,
  failUpload,
  setUploadProcessing,
  clearUploadJob,
} = uploadSlice.actions;

export default uploadSlice.reducer;
