import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 108,
          background: "linear-gradient(135deg, #f43f5e 0%, #be123c 55%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 44,
          color: "white",
          fontWeight: 900,
          fontFamily: "sans-serif",
        }}
      >
        N
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  );
}
