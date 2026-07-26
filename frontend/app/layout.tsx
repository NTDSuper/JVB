import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import TopBar from "@/components/TopBar";
import ChatWidget from "@/components/ChatWidget";
import { AuthProvider } from "@/auth/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import Providers from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SuperMart - Supermarket Management",
  description:
    "Modern supermarket management system with product browsing, cart, orders and admin features",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* FOUC prevention: apply theme before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('supermart_theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="app-body">
        <Providers>
          <ThemeProvider>
            <AuthProvider>
              <TopBar />
              <main className="app-main">{children}</main>
              <ChatWidget />
            </AuthProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}