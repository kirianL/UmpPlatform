import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { Inter, JetBrains_Mono, Pirata_One } from "next/font/google";
import "../styles/globals.css";
import MobileHeader from "@/components/MobileHeader";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";

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
      className={`${inter.variable} ${jetbrainsMono.variable} ${pirataOne.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-grayscale-1 text-grayscale-12">
        <ThemeProvider>
          <div className="root">
            <div style={{ viewTransitionName: "sidebar" }}>
              <Sidebar />
            </div>
            <div style={{ viewTransitionName: "mobile-header" }}>
              <MobileHeader />
            </div>
            <main className="min-h-screen xl:pl-56">
              <ViewTransition enter="page-enter" exit="page-exit">
                {children}
              </ViewTransition>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
