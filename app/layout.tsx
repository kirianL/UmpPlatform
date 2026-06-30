import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { Inter, JetBrains_Mono, Pirata_One, Geist } from "next/font/google";
import "../styles/globals.css";
import MobileHeader from "@/components/MobileHeader";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import ConvexClientProvider from "@/components/ConvexClientProvider";
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
};

export const metadata: Metadata = {
  title: "UmpPlatform",
  description:
    "Plataforma de gestión para productora audiovisual — personal, finanzas, clientes, inventario y calendario.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={cn("h-full", "antialiased", inter.variable, jetbrainsMono.variable, pirataOne.variable, "font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-grayscale-1 text-grayscale-12">
        <ThemeProvider>
          <ConvexClientProvider>
            <div className="root">
              <Sidebar />
              <MobileHeader />
              <main className="min-h-screen xl:pl-56">
                <ViewTransition enter="page-enter" exit="page-exit">
                  {children}
                </ViewTransition>
              </main>
            </div>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
