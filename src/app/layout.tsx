import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hache Mail - Correo Temporal",
  description: "Correo temporal gratuito y seguro. Recibe emails al instante sin registro.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.9)',
            },
          }}
        />
      </body>
    </html>
  );
}
