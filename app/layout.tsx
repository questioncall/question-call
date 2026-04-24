import type { Metadata, Viewport } from "next";
import Script from "next/script";

import { PWAProvider } from "@/components/providers/pwa-provider";
import { StoreProvider } from "@/components/providers/store-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PageLoadingBar } from "@/components/shared/page-loading-bar";

import "./globals.css";
import { Inter, DM_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { SITE_URL } from "@/lib/site-url";
import { absoluteUrl } from "@/lib/seo";

const dmSansHeading = DM_Sans({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  keywords: [
    "Question Call",
    "Question Call Nepal",
    "online learning Nepal",
    "student help Nepal",
    "ask expert teachers online",
    "live doubt solving",
    "online courses Nepal",
    "quiz learning platform",
    "class 11 and 12 learning",
    "entrance preparation Nepal",
  ],
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
        url: "/logo.png",
        width: 676,
        height: 369,
        alt: `${APP_NAME} Platform`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ["/logo.png"],
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1f766e" },
    { media: "(prefers-color-scheme: dark)", color: "#16211d" },
  ],
  colorScheme: "light dark",
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: APP_NAME,
  url: SITE_URL,
  description: APP_DESCRIPTION,
  logo: absoluteUrl("/logo.png"),
  image: absoluteUrl("/logo.png"),
  sameAs: [],
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
          <PWAProvider />
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
        <Script
          id="organization-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData),
          }}
        />
      </body>
    </html>
  );
}
