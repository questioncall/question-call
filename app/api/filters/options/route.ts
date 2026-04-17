import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Question from "@/models/Question";
import Course from "@/models/Course";

// Set standard cache revalidation time (1 hour = 3600 seconds)
// We cache this heavily because historical distinct database values don't change by the minute.
export const revalidate = 3600;

export async function GET() {
  try {
    await connectToDatabase();

    // Run aggregations across both primary collections in parallel
    const [
      questionSubjects,
      questionStreams,
      questionLevels,
      courseSubjects,
      courseStreams,
      courseLevels,
    ] = await Promise.all([
      Question.distinct("subject", { status: { $ne: "DRAFT" } }),
      Question.distinct("stream", { status: { $ne: "DRAFT" } }),
      Question.distinct("level", { status: { $ne: "DRAFT" } }),
      Course.distinct("subject"),
      Course.distinct("stream"),
      Course.distinct("level"),
    ]);

    // Merge & deduplicate, ensuring we filter out empty strings/nulls
    const normalize = (arr1: any[], arr2: any[]) => {
      const merged = [...arr1, ...arr2];
      const validStrings = merged
        .filter((item) => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim());
      // Return a sorted duplicate-free array
      return Array.from(new Set(validStrings)).sort((a, b) => a.localeCompare(b));
    };

    const subjects = normalize(questionSubjects, courseSubjects);
    const streams = normalize(questionStreams, courseStreams);
    const levels = normalize(questionLevels, courseLevels);

    return NextResponse.json({
      subjects,
      streams,
      levels,
    });
  } catch (error) {
    console.error("[GET /api/filters/options]", error);
    return NextResponse.json(
      { error: "Failed to fetch dynamic filter options." },
      { status: 500 }
    );
  }
}
