import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moodboard",
  description: "A simple moodboard app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
