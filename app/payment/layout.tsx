import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
  title: "Payments",
  description: "Private payment verification and transaction status pages.",
});

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
