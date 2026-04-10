import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import Question from "@/models/Question";
import Answer from "@/models/Answer";
import User from "@/models/User";
import { BookOpenIcon, CheckCircleIcon, UserIcon } from "lucide-react";
import mongoose from "mongoose";

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  await connectToDatabase();

  // Force loading User models to ensure population works
  User.findOne({}).exec();

  const question = await Question.findById(id)
    .populate("askerId", "name username userImage")
    .populate("acceptedById", "name username userImage")
    .populate("answerId")
    .lean();

  if (!question) {
    notFound();
  }

  let answer = question.answerId as any;
  if (!answer && question.status === "SOLVED") {
    // Fallback: Manually query if it's solved but `answerId` wasn't explicitly linked.
    answer = await Answer.findOne({ questionId: question._id, isPublic: true }).lean();
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpenIcon className="size-6 text-primary" />
            {question.title}
          </h1>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${question.status === "SOLVED" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"}`}>
            {question.status}
          </span>
        </div>
        
        <div className="prose prose-sm md:prose-base dark:prose-invert mb-6 whitespace-pre-wrap max-w-none text-foreground border-b border-border pb-6 leading-relaxed">
          {question.body}
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
           {question.subject && <span className="rounded-full bg-muted px-3 py-1 font-medium">{question.subject}</span>}
           {question.level && <span className="rounded-full bg-muted px-3 py-1 font-medium">{question.level}</span>}
           <span className="flex items-center gap-1.5 ml-auto font-medium">
             <UserIcon className="size-4 text-primary"/> Asker: {question.askerId?.name || "Unknown"}
           </span>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
           <CheckCircleIcon className="size-6 text-primary" />
           Solution
        </h2>

        {answer ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
             {answer.content ? (
               <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                 {answer.content}
               </div>
             ) : (
                <p className="text-muted-foreground italic">No text content provided.</p>
             )}
             
             {answer.mediaUrls && answer.mediaUrls.length > 0 && (
               <div className="mt-6 border-t border-primary/10 pt-6">
                 <p className="font-semibold mb-3 text-sm text-primary uppercase">Attached Media</p>
                 <div className="flex flex-col gap-4">
                   {answer.mediaUrls.map((url: string, i: number) => {
                      const isVideo = url.match(/\.(mp4|webm|ogg)$/i) || url.includes("video/upload");
                      return (
                        <div key={i} className="flex flex-col gap-2">
                          {isVideo ? (
                            <video src={url} controls className="rounded-lg max-w-full h-auto border border-border shadow object-contain max-h-[600px]" />
                          ) : (
                            <img src={url} alt="Answer Media" className="rounded-lg max-w-full h-auto border border-border shadow object-contain max-h-[600px]" />
                          )}
                        </div>
                      );
                   })}
                 </div>
               </div>
             )}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/10 p-10 text-center text-muted-foreground">
            {question.status === "SOLVED" 
              ? "This question is solved but the answer is private or unavailable."
              : "No solution has been submitted for this question yet."}
          </div>
        )}
      </div>
    </div>
  );
}
