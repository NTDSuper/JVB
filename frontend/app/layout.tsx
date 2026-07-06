import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import TopBar from "@/components/TopBar";
import ProtectedRoute from "@/components/ProtectedRouter";
import ChatWidget from "@/components/ChatWidget";
import { AuthProvider } from "@/auth/contexts/AuthContext";
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
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="app-body">
        <Providers>
          <AuthProvider>
            <ProtectedRoute>
              <TopBar />
              <main className="app-main">{children}</main>
              <ChatWidget />
            </ProtectedRoute>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}