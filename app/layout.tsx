import type { Metadata } from "next";

import { StoreProvider } from "@/components/providers/store-provider";

import "./globals.css";
import { Inter, DM_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const dmSansHeading = DM_Sans({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: "EduAsk",
    template: "%s | EduAsk",
  },
  description:
    "Dual-portal academic Q&A platform for students, teachers, and admins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", inter.variable, dmSansHeading.variable)}>
      <body className="min-h-full flex flex-col">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
