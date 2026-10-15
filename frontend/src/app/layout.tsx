import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "money-keeper",
  description: "가계부",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
