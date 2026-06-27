import { Analytics } from "@vercel/analytics/next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { VisitorTracker } from "@/app/visitor-tracker";
import "./globals.css";

export const metadata = {
  title: "Nick Rizzo Daily",
  description: "A searchable food tracker from Nick Rizzo Daily."
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const analyticsOptOut = cookieStore.get("nrd_analytics_opt_out")?.value === "1";

  return (
    <html lang="en">
      <body>
        {children}
        <Suspense fallback={null}>
          <VisitorTracker />
        </Suspense>
        {analyticsOptOut ? null : <Analytics />}
      </body>
    </html>
  );
}
