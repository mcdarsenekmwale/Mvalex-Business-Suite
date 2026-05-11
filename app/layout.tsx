// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { auth } from "@/lib/auth";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { EventProvider } from "@/lib/providers/EventProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mvalex Business Suite - Professional Business Tools",
  description:
    "Generate business cards, invoices, and AI-powered logos. Professional business identity tools for modern enterprises.",
    // app/layout.tsx
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/favicon.svg",
        color: "#667eea",
      },
    ],
  },
  manifest: "/site.webmanifest",
  keywords: [
    "business cards",
    "invoice generator",
    "logo generator",
    "AI logo",
    "business tools",
    "SaaS",
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers session={session}>
          <EventProvider>
            {children}
          </EventProvider>
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}

