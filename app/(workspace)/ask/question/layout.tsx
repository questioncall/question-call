import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
  title: "Ask Question",
  description: "Ask a new question inside your Question Call workspace.",
});

export default function AskQuestionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
