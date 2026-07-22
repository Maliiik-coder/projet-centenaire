import type { Metadata, Viewport } from "next";
import { Bangers, Nunito_Sans } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { AppDataSessionProvider } from "@/features/session/AppDataSessionProvider";
import { HARU_THEME_BOOTSTRAP_SCRIPT } from "@/lib/themePreference";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  weight: "variable",
});

const bangers = Bangers({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-bangers",
  weight: "400",
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
  themeColor: "#FFF8E9",
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
    <html
      lang="fr"
      className={`${nunitoSans.variable} ${bangers.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: HARU_THEME_BOOTSTRAP_SCRIPT }}
          id="haru-theme-bootstrap"
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <ServiceWorkerRegistration />
        <AppDataSessionProvider>{children}</AppDataSessionProvider>
      </body>
    </html>
  );
}
