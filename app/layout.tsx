import type { Metadata } from "next";
import "./globals.css";
import "./dark.css";

export const metadata: Metadata = {
  title: "GRE Studio | Your complete GRE workspace",
  description: "Practice essays, explore memory palaces, and take 50 timed GRE-style mock tests in one focused workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
