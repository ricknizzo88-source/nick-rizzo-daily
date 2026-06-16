import "./globals.css";

export const metadata = {
  title: "Nick Rizzo Daily",
  description: "A searchable food tracker from Nick Rizzo Daily."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
