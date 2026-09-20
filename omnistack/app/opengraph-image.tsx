import { ImageResponse } from "next/og";
import { getSite } from "@/lib/content";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "OmniStack Digital";

export default async function OpengraphImage() {
  const site = await getSite();
  const locations = site.contact.locations.map((l) => l.city).join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#050505",
          backgroundImage:
            "radial-gradient(60% 60% at 50% 0%, rgba(198,161,91,0.18) 0%, rgba(5,5,5,0) 60%)",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ width: "64px", height: "12px", borderRadius: "4px", border: "2px solid #c6a15b" }} />
            <div style={{ width: "64px", height: "12px", borderRadius: "4px", border: "2px solid rgba(198,161,91,0.7)" }} />
            <div style={{ width: "64px", height: "12px", borderRadius: "4px", border: "2px solid rgba(198,161,91,0.4)" }} />
          </div>
          <div style={{ fontSize: "30px", fontWeight: 600, color: "#ffffff" }}>{site.brand}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: "1000px",
            }}
          >
            {site.tagline}
          </div>
          <div style={{ fontSize: "32px", color: "#A3A3A3", marginTop: "24px", maxWidth: "920px" }}>
            Brand, design, engineering, and AI - one senior team.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "24px", color: "#c6a15b" }}>{locations}</div>
          <div style={{ fontSize: "24px", color: "#A3A3A3" }}>{site.contact.email}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
