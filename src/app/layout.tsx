import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fonts ship with the project (SIL OFL, see fonts/OFL-*.txt): building on the plant server must
// not depend on reaching Google Fonts.
const plex = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-400.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-sans-500.woff2", weight: "500" },
    { path: "./fonts/ibm-plex-sans-600.woff2", weight: "600" },
    { path: "./fonts/ibm-plex-sans-700.woff2", weight: "700" },
  ],
  variable: "--font-plex",
});
const archivo = localFont({
  src: [
    { path: "./fonts/archivo-800.woff2", weight: "800" },
    { path: "./fonts/archivo-900.woff2", weight: "900" },
  ],
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
