import type { UserRole } from "@/models/User";

export type RegisterableRole = Extract<UserRole, "STUDENT" | "TEACHER">;

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  role: RegisterableRole;
  referralCode?: string;
};

export type RegisteredUser = {
  id: string;
  name: string;
  email: string;
  role: RegisterableRole;
};

export type RegisterResponse = {
  message: string;
  user: RegisteredUser;
};
