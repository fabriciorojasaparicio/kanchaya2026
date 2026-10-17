import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KanchaYA | Que el partido no se quede en el chat",
  description: "Encuentra dónde jugar, reúne a tu gente y convierte ese plan en un partido con KanchaYA.",
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
