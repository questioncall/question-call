import type { Metadata } from "next";
import Script from "next/script";

import { StoreProvider } from "@/components/providers/store-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PageLoadingBar } from "@/components/shared/page-loading-bar";

import "./globals.css";
import { Inter, DM_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_DESCRIPTION, SITE_URL } from "@/lib/constants";

const dmSansHeading = DM_Sans({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: ["education", "Q&A", "courses", "learning platform", "student help"],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    images: [
      {
        url: "/apple-icon.png", // Fallback to icon; ideally a dedicated og-image.png in /public
        width: 1200,
        height: 630,
        alt: `${APP_NAME} Platform`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ["/apple-icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("h-full antialiased", "font-sans", inter.variable, dmSansHeading.variable)}>
      <body className="min-h-full flex flex-col">
        <PageLoadingBar />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoreProvider>
            <TooltipProvider delayDuration={0}>
              {children}
            </TooltipProvider>
          </StoreProvider>
        </ThemeProvider>
        <Toaster position="top-right" richColors closeButton />
        <Script
          src="https://widget.cloudinary.com/v2.0/global/all.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
