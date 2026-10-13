import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo";

export const alt = siteConfig.socialImage.alt;
export const size = {
  width: siteConfig.socialImage.width,
  height: siteConfig.socialImage.height,
};
export const contentType = "image/png";

const previewRows = [
  ["Context", "Captured"],
  ["Lead plan", "Review"],
  ["Outreach", "Approval"],
  ["Meetings", "Visible"],
] as const;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#f8fafc",
          color: "#020617",
          display: "flex",
          fontFamily: "Inter, Arial, sans-serif",
          height: "100%",
          justifyContent: "center",
          padding: 56,
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #dbe5ea",
            borderRadius: 22,
            boxShadow: "0 24px 70px rgba(15, 23, 42, 0.12)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 50,
            width: "100%",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
            <div
              style={{
                alignItems: "center",
                background: "#0f766e",
                borderRadius: 14,
                color: "white",
                display: "flex",
                fontSize: 32,
                fontWeight: 800,
                height: 56,
                justifyContent: "center",
                width: 56,
              }}
            >
              W
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{siteConfig.name}</div>
              <div style={{ color: "#475569", fontSize: 20 }}>
                AI-assisted sales workspace
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 46 }}>
            <div style={{ display: "flex", flex: 1.1, flexDirection: "column" }}>
              <div
                style={{
                  color: "#0f766e",
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: 2,
                  marginBottom: 22,
                  textTransform: "uppercase",
                }}
              >
                Governed revenue execution
              </div>
              <div style={{ fontSize: 70, fontWeight: 850, lineHeight: 0.98 }}>
                Turn business context into reviewable sales pipeline.
              </div>
              <div style={{ color: "#475569", fontSize: 27, lineHeight: 1.35, marginTop: 28 }}>
                Lead planning, approval-gated outreach, meetings, billing visibility, and
                operator control in one workspace.
              </div>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #dbe5ea",
                borderRadius: 18,
                display: "flex",
                flex: 0.8,
                flexDirection: "column",
                gap: 16,
                padding: 24,
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ color: "#334155", fontSize: 22, fontWeight: 800 }}>
                  Revenue workspace
                </div>
                <div
                  style={{
                    background: "#ccfbf1",
                    border: "1px solid #5eead4",
                    borderRadius: 999,
                    color: "#115e59",
                    fontSize: 16,
                    fontWeight: 800,
                    padding: "8px 14px",
                  }}
                >
                  Guarded beta
                </div>
              </div>

              {previewRows.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    alignItems: "center",
                    background: "#ffffff",
                    border: "1px solid #dbe5ea",
                    borderRadius: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "20px 22px",
                  }}
                >
                  <div style={{ color: "#64748b", fontSize: 19 }}>{label}</div>
                  <div style={{ color: "#020617", fontSize: 24, fontWeight: 850 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              alignItems: "center",
              color: "#334155",
              display: "flex",
              fontSize: 22,
              gap: 16,
            }}
          >
            <span style={{ color: "#0f766e", fontWeight: 900 }}>winrate.ai</span>
            <span>Context first. Approval gated. Built for careful operators.</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
