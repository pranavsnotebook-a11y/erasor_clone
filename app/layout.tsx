import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "./ConvexClientProvider";
import { AuthProvider } from "./_context/AuthContext";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Erasor Clone",
  description: "Erasor.io Clone - Whiteboard & Document Editor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConvexClientProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
