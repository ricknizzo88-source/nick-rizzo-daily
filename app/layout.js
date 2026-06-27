import { Analytics } from "@vercel/analytics/next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { VisitorTracker } from "@/app/visitor-tracker";
import "./globals.css";

export const metadata = {
  title: "Nick Rizzo Daily",
  description: "A searchable food tracker from Nick Rizzo Daily."
};

export default async function RootLayout