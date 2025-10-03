import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from '@/lib/query-provider';
import { FontProvider } from '@/contexts/FontContext';
import LayoutContent from '@/components/LayoutContent';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Artist Rentals",
  description: "Find and list rental spaces for artists",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const isBuildTime = !publishableKey || publishableKey.includes('placeholder')

  const content = (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/Cerial.ttf"
          as="font"
          type="font/ttf"
          crossOrigin=""
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <QueryProvider>
          <FontProvider>
            <LayoutContent>
              {children}
            </LayoutContent>
          </FontProvider>
        </QueryProvider>
      </body>
    </html>
  )

  // During build or when no valid key, don't wrap with ClerkProvider
  if (isBuildTime) {
    return content
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {content}
    </ClerkProvider>
  );
}
