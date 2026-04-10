import "server-only";

import { cache } from "react";

import { connectToDatabase } from "@/lib/mongodb";
import User, { type UserRole } from "@/models/User";
import { getUserHandle } from "@/lib/user-paths";

type DirectoryUser = {
  _id: { toString(): string } | string;
  name: string;
  email: string;
  username?: string | null;
  role: UserRole;
  points?: number;
  pointBalance?: number;
  totalAnswered?: number;
  overallScore?: number;
  createdAt?: Date | string;
  bio?: string;
  userImage?: string;
  skills?: string[];
  interests?: string[];
  totalAsked?: number;
  teacherModeVerified?: boolean;
};

export type PublicDirectoryUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  points: number;
  pointBalance: number;
  totalAnswered: number;
  overallScore: number;
  createdAt?: Date | string;
  bio?: string;
  userImage?: string;
  skills?: string[];
  interests?: string[];
  totalAsked?: number;
  teacherModeVerified?: boolean;
};

const publicDirectorySelect =
  "name email username role points pointBalance totalAnswered overallScore overallRatingSum overallRatingCount createdAt bio userImage skills interests totalAsked teacherModeVerified";

function mapDirectoryUser(user: DirectoryUser): PublicDirectoryUser {
  const id = typeof user._id === "string" ? user._id : user._id.toString();

  return {
    id,
    name: user.name,
    email: user.email,
    username: getUserHandle({
      id,
      name: user.name,
      email: user.email,
      username: user.username,
    }),
    role: user.role,
    points: user.points ?? 0,
    pointBalance: user.pointBalance ?? 0,
    totalAnswered: user.totalAnswered ?? 0,
    overallScore: user.overallScore ?? 0,
    createdAt: user.createdAt,
    bio: user.bio,
    userImage: user.userImage,
    skills: user.skills || [],
    interests: user.interests || [],
    totalAsked: user.totalAsked ?? 0,
    teacherModeVerified: user.teacherModeVerified ?? false,
  };
}

export async function generateUniqueUsername(input: {
  name?: string | null;
  email?: string | null;
  id?: string | null;
}) {
  await connectToDatabase();

  const baseHandle = getUserHandle(input);
  let candidate = baseHandle;
  let counter = 1;

  while (await User.exists({ username: candidate })) {
    candidate = `${baseHandle}_${counter}`;
    counter += 1;
  }

  return candidate;
}

export const getPublicUserByUsername = cache(async (username: string) => {
  const normalizedUsername = getUserHandle({ username });

  await connectToDatabase();

  const directUser = (await User.findOne({ username: normalizedUsername })
    .select(publicDirectorySelect)
    .lean()) as DirectoryUser | null;

  if (directUser) {
    return mapDirectoryUser(directUser);
  }

  const fallbackUsers = (await User.find({ role: { $in: ["STUDENT", "TEACHER"] } })
    .select(publicDirectorySelect)
    .lean()) as DirectoryUser[];

  const fallbackUser = fallbackUsers.find((user) => {
    return mapDirectoryUser(user).username === normalizedUsername;
  });

  return fallbackUser ? mapDirectoryUser(fallbackUser) : null;
});

export function getLeaderboardScore(user: PublicDirectoryUser) {
  return user.totalAnswered * 5 + user.points * 2 + user.overallScore * 25;
}

export const getLeaderboardProfiles = cache(async () => {
  await connectToDatabase();

  const users = (await User.find({ role: { $in: ["STUDENT", "TEACHER"] } })
    .select(publicDirectorySelect)
    .lean()) as DirectoryUser[];

  return users
    .map(mapDirectoryUser)
    .sort((left, right) => getLeaderboardScore(right) - getLeaderboardScore(left));
});