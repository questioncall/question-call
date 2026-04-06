import { axiosInstance } from "@/lib/axios";
import type {
  RegisterPayload,
  RegisterResponse,
} from "@/store/features/auth/types";

export async function registerUserRequest(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  const { data } = await axiosInstance.post<RegisterResponse>(
    "/auth/register",
    payload,
  );

  return data;
}
