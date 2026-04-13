import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseEnrollment from "@/models/CourseEnrollment";
import CourseVideo from "@/models/CourseVideo";
import Transaction from "@/models/Transaction";
import User from "@/models/User";

export type CoursePurchaseMetadata = {
  courseId?: string;
  courseName?: string;
  instructorId?: string;
  pricingModel?: string;
  grossAmount?: number;
  commissionPercent?: number;
  netAmount?: number;
  studentId?: string;
};

type CompleteCoursePurchaseInput = {
  transactionDocumentId: string;
  gateway: "MANUAL" | "ESEWA";
  metaPatch?: Record<string, unknown>;
};

export type CompleteCoursePurchaseResult = {
  alreadyCompleted: boolean;
  courseId: string;
  courseName: string;
  enrollmentId: string | null;
  teacherEarnings: number;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function getCoursePurchaseMetadata(
  metadata: Record<string, unknown> | null | undefined,
): CoursePurchaseMetadata {
  return {
    courseId:
      typeof metadata?.courseId === "string" ? metadata.courseId : undefined,
    courseName:
      typeof metadata?.courseName === "string" ? metadata.courseName : undefined,
    instructorId:
      typeof metadata?.instructorId === "string"
        ? metadata.instructorId
        : undefined,
    pricingModel:
      typeof metadata?.pricingModel === "string"
        ? metadata.pricingModel
        : undefined,
    grossAmount:
      typeof metadata?.grossAmount === "number" ? metadata.grossAmount : undefined,
    commissionPercent:
      typeof metadata?.commissionPercent === "number"
        ? metadata.commissionPercent
        : undefined,
    netAmount:
      typeof metadata?.netAmount === "number" ? metadata.netAmount : undefined,
    studentId:
      typeof metadata?.studentId === "string" ? metadata.studentId : undefined,
  };
}

export async function completeCoursePurchase({
  transactionDocumentId,
  gateway,
  metaPatch = {},
}: CompleteCoursePurchaseInput): Promise<CompleteCoursePurchaseResult> {
  await connectToDatabase();

  const dbSession = await mongoose.startSession();
  let result: CompleteCoursePurchaseResult | null = null;

  try {
    await dbSession.withTransaction(async () => {
      const transaction = await Transaction.findById(transactionDocumentId).session(
        dbSession,
      );

      if (!transaction) {
        throw new Error("Transaction not found.");
      }

      if (transaction.type !== "COURSE_PURCHASE") {
        throw new Error("Only course purchase transactions can be completed.");
      }

      const metadata = getCoursePurchaseMetadata(
        (transaction.metadata ?? {}) as Record<string, unknown>,
      );

      if (!metadata.courseId || !metadata.instructorId) {
        throw new Error("Transaction metadata is incomplete.");
      }

      const [course, instructor, existingEnrollment, currentVideoCount] =
        await Promise.all([
          Course.findById(metadata.courseId).session(dbSession),
          User.findById(metadata.instructorId)
            .select("pointBalance")
            .session(dbSession),
          CourseEnrollment.findOne({
            courseId: metadata.courseId,
            studentId: transaction.userId,
          }).session(dbSession),
          CourseVideo.countDocuments({ courseId: metadata.courseId }).session(
            dbSession,
          ),
        ]);

      if (!course) {
        throw new Error("Course not found for this transaction.");
      }

      if (!instructor) {
        throw new Error("Instructor not found for this transaction.");
      }

      const grossAmount = roundCurrency(
        metadata.grossAmount ?? Number(course.price ?? transaction.amount ?? 0),
      );
      const commissionPercent = roundCurrency(metadata.commissionPercent ?? 0);
      const teacherEarnings = roundCurrency(
        metadata.netAmount ?? grossAmount * (1 - commissionPercent / 100),
      );

      if (transaction.status === "COMPLETED") {
        result = {
          alreadyCompleted: true,
          courseId: course._id.toString(),
          courseName: metadata.courseName ?? course.title,
          enrollmentId: existingEnrollment?._id?.toString() ?? null,
          teacherEarnings,
        };
        return;
      }

      if (transaction.status !== "PENDING") {
        throw new Error("Only pending transactions can be completed.");
      }

      if (
        existingEnrollment?.accessType === "PURCHASE" &&
        existingEnrollment.transactionId &&
        existingEnrollment.transactionId.toString() !== transaction._id.toString()
      ) {
        throw new Error("This student has already purchased the course.");
      }

      transaction.status = "COMPLETED";
      transaction.gateway = gateway;
      transaction.metadata = {
        courseId: course._id.toString(),
        courseName: metadata.courseName ?? course.title,
        instructorId: metadata.instructorId,
        pricingModel: metadata.pricingModel ?? course.pricingModel,
        grossAmount,
        commissionPercent,
        netAmount: teacherEarnings,
      };
      transaction.meta = {
        ...(transaction.meta ?? {}),
        ...metaPatch,
      };
      await transaction.save({ session: dbSession });

      let enrollmentId: string | null = null;

      if (existingEnrollment) {
        existingEnrollment.accessType = "PURCHASE";
        existingEnrollment.transactionId = transaction._id;
        existingEnrollment.pricePaid = grossAmount;
        existingEnrollment.totalVideoCount = Math.max(
          existingEnrollment.totalVideoCount ?? 0,
          currentVideoCount,
        );
        await existingEnrollment.save({ session: dbSession });
        enrollmentId = existingEnrollment._id.toString();
      } else {
        const [createdEnrollment] = await CourseEnrollment.create(
          [
            {
              courseId: course._id,
              studentId: transaction.userId,
              accessType: "PURCHASE",
              transactionId: transaction._id,
              pricePaid: grossAmount,
              totalVideoCount: currentVideoCount,
            },
          ],
          { session: dbSession },
        );

        course.enrollmentCount = (course.enrollmentCount ?? 0) + 1;
        await course.save({ session: dbSession });
        enrollmentId = createdEnrollment._id.toString();
      }

      instructor.pointBalance = roundCurrency(
        (instructor.pointBalance ?? 0) + teacherEarnings,
      );
      await instructor.save({ session: dbSession });

      const existingCreditTransaction = await Transaction.findOne({
        userId: metadata.instructorId,
        type: "COURSE_SALE_CREDIT",
        "metadata.courseId": course._id.toString(),
        "metadata.studentId": transaction.userId.toString(),
      }).session(dbSession);

      if (!existingCreditTransaction) {
        await Transaction.create(
          [
            {
              userId: metadata.instructorId,
              type: "COURSE_SALE_CREDIT",
              amount: teacherEarnings,
              status: "COMPLETED",
              gateway: "INTERNAL",
              metadata: {
                courseId: course._id.toString(),
                courseName: metadata.courseName ?? course.title,
                pricingModel: metadata.pricingModel ?? course.pricingModel,
                grossAmount,
                commissionPercent,
                netAmount: teacherEarnings,
                studentId: transaction.userId.toString(),
                instructorId: metadata.instructorId,
              },
            },
          ],
          { session: dbSession },
        );
      }

      result = {
        alreadyCompleted: false,
        courseId: course._id.toString(),
        courseName: metadata.courseName ?? course.title,
        enrollmentId,
        teacherEarnings,
      };
    });
  } finally {
    await dbSession.endSession();
  }

  if (!result) {
    throw new Error("Failed to complete course purchase.");
  }

  return result;
}
