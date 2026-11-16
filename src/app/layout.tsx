import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "공부품앗이 | Gongbu Pumasi",
  description: "KAIST 학생들의 공부 도움 교환 · A study help exchange for KAIST students.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
