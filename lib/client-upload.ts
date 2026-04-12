import axios from "axios";

export type UploadProgressSnapshot = {
  loaded: number;
  total: number | null;
  percent: number;
};

type UploadProgressHandler = (progress: UploadProgressSnapshot) => void;

type MultipartRequestOptions = {
  onProgress?: UploadProgressHandler;
};

type UploadFileOptions = MultipartRequestOptions & {
  fields?: Record<string, string>;
  url?: string;
};

type ApiErrorShape = {
  error?: string;
  message?: string;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getRequestErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorShape | undefined;
    return data?.error || data?.message || error.message || "Request failed.";
  }

  return error instanceof Error ? error.message : "Request failed.";
}

export async function postMultipartWithProgress<T>(
  url: string,
  formData: FormData,
  options: MultipartRequestOptions = {},
) {
  try {
    const response = await axios.post<T>(url, formData, {
      withCredentials: true,
      headers: {
        Accept: "application/json",
      },
      onUploadProgress: (event) => {
        const total = typeof event.total === "number" && event.total > 0 ? event.total : null;
        const percent = total ? clampPercent((event.loaded / total) * 100) : 0;
        options.onProgress?.({
          loaded: event.loaded,
          total,
          percent,
        });
      },
    });

    options.onProgress?.({
      loaded: 1,
      total: 1,
      percent: 100,
    });

    return response.data;
  } catch (error) {
    throw new Error(getRequestErrorMessage(error));
  }
}

export async function uploadFileViaServer<T extends { secure_url: string }>(
  file: File,
  options: UploadFileOptions = {},
) {
  const formData = new FormData();
  formData.append("file", file);

  if (options.fields) {
    for (const [key, value] of Object.entries(options.fields)) {
      formData.append(key, value);
    }
  }

  return postMultipartWithProgress<T>(options.url || "/api/upload", formData, {
    onProgress: options.onProgress,
  });
}

export async function getVideoDurationSeconds(file: File) {
  return new Promise<number>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.preload = "metadata";

    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();

      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Could not read the selected video's duration."));
        return;
      }

      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read the selected video's duration."));
    };

    video.src = objectUrl;
  });
}
