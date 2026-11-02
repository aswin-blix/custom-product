import type { Metadata } from "next";
import "./globals.css";
import { googleFontsHref } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Custom Products – Design Maker",
  description: "Design all-over print products with a browser-based product designer.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={googleFontsHref()} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
