// ============================================
// CivilEstimator Pro — Root Layout
// ============================================

import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { ProjectProvider } from "@/context/ProjectContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "CivilEstimator Pro — AI-Powered Civil Engineering Estimation",
  description: "Professional AI-powered civil engineering estimation software with BOQ generation, material calculation, and drawing analysis. Built by Moawia Husnain.",
  keywords: "civil engineering, estimation, BOQ, bill of quantities, construction, AI, Gemini, calculator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ProjectProvider>
            <div className="app-layout">
              <Sidebar />
              <Header />
              <main className="main-content">
                {children}
              </main>
            </div>
          </ProjectProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
