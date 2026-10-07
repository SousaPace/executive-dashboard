import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["800", "900"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: {
    default: "Dashboard Ejecutivo · Capital de Trabajo",
    template: "%s · Capital de Trabajo",
  },
  description: "KPIs de capital de trabajo: Finanzas, Inventario y Ventas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`h-full ${plex.variable} ${archivo.variable}`}>
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
