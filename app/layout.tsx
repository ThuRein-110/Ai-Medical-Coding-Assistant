import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Medical Coding Assistant",
  description: "Intelligent ICD-10 diagnosis coding assistant powered by AI. Streamline medical coding workflows with automated code suggestions, audit trails, and comprehensive case management.",
  keywords: ["medical coding", "ICD-10", "AI", "healthcare", "diagnosis coding", "medical billing"],
  authors: [{ name: "MediHack Team" }],
  openGraph: {
    title: "AI Medical Coding Assistant",
    description: "Intelligent ICD-10 diagnosis coding assistant powered by AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
