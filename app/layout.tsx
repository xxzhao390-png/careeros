import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { requireChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareerOS AI｜个人求职与知识成长工作台",
  description: "记录岗位、理解知识、推进秋招，把每天接触的信息变成长期资产。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthenticatedWorkspace>{children}</AuthenticatedWorkspace>
      </body>
    </html>
  );
}

async function AuthenticatedWorkspace({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireChatGPTUser("/");
  return children;
}
