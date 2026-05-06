import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "El Aventurero",
  description: "A Latin American platformer adventure — from the Andes to the Amazon",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* Portrait-mode blocker — hidden in landscape via CSS */}
        <div className="rotate-prompt" style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "#030814",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "24px", textAlign: "center", padding: "32px",
        }}>
          <div style={{
            fontSize: 64,
            animation: "rotate-phone 2s ease-in-out infinite",
            display: "inline-block",
          }}>
            📱
          </div>
          <div style={{ color: "#D4A853", fontSize: 20, fontWeight: 800, letterSpacing: "0.05em" }}>
            Rotate your device
          </div>
          <div style={{ color: "#6080a0", fontSize: 14, lineHeight: 1.6, maxWidth: 260 }}>
            El Aventurero plays best in landscape mode
          </div>
        </div>
      </body>
    </html>
  );
}
