import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/* Archivo é variável (wght 100–900): cobre os pesos 400/500/600 do sistema. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

/* IBM Plex Mono não é variável: os pesos em uso são declarados. */
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Retoma",
  description: "Retoma",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
