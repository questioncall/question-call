import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
  title: "Authentication",
  description: "Sign-in and sign-up flows for Question Call accounts.",
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
