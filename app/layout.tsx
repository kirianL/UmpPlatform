import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { Inter, JetBrains_Mono, Pirata_One, Geist } from "next/font/google";
import { headers } from "next/headers";
import "../styles/globals.css";
import MobileHeader from "@/components/MobileHeader";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import PwaRegister from "@/components/PwaRegister";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
});

const pirataOne = Pirata_One({
  variable: "--font-pirata-one",
  subsets: ["latin"],
  weight: ["400"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
  ],
};

export const metadata: Metadata = {
  title: "UmpPlatform",
  description:
    "Plataforma de gestión para productora audiovisual — personal, finanzas, clientes, inventario y calendario.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UmpPlatform",
  },
  icons: {
    icon: [
      { url: "/ICO-UMP/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/ICO-UMP/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/ICO-UMP/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/ICO-UMP/favicon-128x128.png", sizes: "128x128", type: "image/png" },
    ],
    apple: [
      { url: "/ICO-UMP/favicon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isLoginPage = pathname === "/login";

  return (
    <html
      lang="es"
      className={cn("h-full", "antialiased", inter.variable, jetbrainsMono.variable, pirataOne.variable, "font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-grayscale-1 text-grayscale-12">
        <ThemeProvider>
          <PwaRegister />
          <ConvexClientProvider>
            {isLoginPage ? (
              children
            ) : (
              <div className="root">
                <Sidebar />
                <MobileHeader />
                <main className="min-h-screen xl:pl-56">
                  <ViewTransition enter="page-enter" exit="page-exit">
                    {children}
                  </ViewTransition>
                </main>
              </div>
            )}
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
