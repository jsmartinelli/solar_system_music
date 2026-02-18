import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solar System Music Sequencer",
  description: "Create music by placing planets around a star",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
