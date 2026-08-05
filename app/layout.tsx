import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { FamilyProvider } from "@/lib/family-context";
import { ToastProvider } from "@/lib/toast-context";
import { DialogProvider } from "@/lib/dialog-context";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import ThemeProvider from "@/components/ThemeProvider";
import AppVersion from "@/components/AppVersion";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Family Quest",
  description: "Rodinná to-do & XP aplikace",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Family Quest",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#f59e0b",
  // Lets content use env(safe-area-inset-*) to avoid the iPhone notch/Dynamic
  // Island and home-indicator area — essential in standalone PWA mode, where
  // there's no browser chrome to naturally push content out of the way.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ToastProvider>
            <DialogProvider>
              <ServiceWorkerRegistration />
              <AuthProvider>
                <FamilyProvider>{children}</FamilyProvider>
              </AuthProvider>
            </DialogProvider>
          </ToastProvider>
        </ThemeProvider>
        <AppVersion className="pointer-events-none fixed top-[calc(env(safe-area-inset-top)+4px)] right-2 z-50 text-[10px] text-zinc-400" />
      </body>
    </html>
  );
}
