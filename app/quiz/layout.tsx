import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
  title: "Quiz Sessions",
  description: "Private quiz routes for signed-in learners.",
});

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
