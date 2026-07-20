import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  weight: "variable",
});

export const metadata: Metadata = {
  title: "Haru",
  description: "Un carnet pour avancer un jour à la fois.",
  applicationName: "Haru",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Haru",
  },
  icons: {
    icon: [
      { url: "/icon-192-v4.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512-v4.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon-v4.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${nunitoSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
