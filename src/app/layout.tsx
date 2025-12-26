import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
  ? `https://${process.env.NEXT_PUBLIC_APP_URL}` 
  : "https://drop.ciphera.net";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Drop - Secure, Private & End-to-End Encrypted File Sharing by Ciphera",
    template: "%s | Drop Secure File Transfer"
  },
  description: "End-to-end encrypted file sharing. Private, secure, and open-source. Share files with confidence using AES-256-GCM encryption.",
  keywords: [
    "secure file sharing", 
    "encrypted file transfer", 
    "end-to-end encryption", 
    "privacy focused", 
    "open source", 
    "file sharing", 
    "AES-256", 
    "Ciphera"
  ],
  authors: [{ name: "Ciphera", url: "https://ciphera.net" }],
  creator: "Ciphera",
  publisher: "Ciphera",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Drop",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Drop - Secure File Sharing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@Ciphera",
  },
};

import { ThemeProvider } from "@/components/theme-provider";
import { OtpVerificationModal } from "@/components/otp-verification-modal";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} antialiased bg-background text-foreground font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <OtpVerificationModal />
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
