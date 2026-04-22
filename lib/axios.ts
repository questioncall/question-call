import axios, { AxiosError } from "axios";

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

export const axiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Request failed.";

    return Promise.reject(new Error(message));
  },
);
