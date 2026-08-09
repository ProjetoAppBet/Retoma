import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "retoma",
    timestamp: new Date().toISOString(),
  });
}
