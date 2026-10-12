import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 100,
          background: "linear-gradient(135deg, #f43f5e 0%, #be123c 55%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          color: "white",
          fontWeight: 900,
          fontFamily: "sans-serif",
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
