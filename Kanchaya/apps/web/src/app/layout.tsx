import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KanchaYA | Tu próximo partido empieza aquí",
  description: "Encuentra tu cancha y reúne a tu equipo con KanchaYA.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
