import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
export const metadata: Metadata = {
  title: "Buckeye Baton — Lessons worth sharing",
  description:
    "Connect OSU project teams through the lessons they leave behind.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
