import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "El Aventurero",
  description: "A Latin American platformer adventure — from the Andes to the Amazon",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
