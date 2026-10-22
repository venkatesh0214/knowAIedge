import type { Metadata } from "next";
import "./globals.css";
export const dynamic="force-dynamic";
export const metadata: Metadata = { title: "knowAIedge — Your daily edge in AI knowledge", description: "Explore AI news, tools, coding, robotics and research with clear summaries and original sources.", icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] } };
export default async function Layout({children}: {children: React.ReactNode}) {return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`try{var t=localStorage.getItem("knowaiedge-theme");document.documentElement.dataset.theme=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light"}catch{document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}`}}/></head><body>{children}</body></html>}
