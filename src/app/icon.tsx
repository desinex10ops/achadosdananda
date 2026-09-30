import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 192,
  height: 192,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 108,
          background: "linear-gradient(135deg, #f43f5e 0%, #be123c 50%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 44,
          color: "white",
          fontWeight: 900,
          fontFamily: "sans-serif",
          boxShadow: "0 8px 32px rgba(244, 63, 94, 0.4)",
        }}
      >
        N
      </div>
    ),
    {
      ...size,
    }
  );
}
