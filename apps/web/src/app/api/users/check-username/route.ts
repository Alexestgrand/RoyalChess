import { NextResponse, type NextRequest } from "next/server";

const apiBase = (): string =>
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const username = req.nextUrl.searchParams.get("username") ?? "";
  try {
    const upstream = await fetch(
      `${apiBase()}/users/check-username?username=${encodeURIComponent(username)}`,
      { cache: "no-store" },
    );
    const text = await upstream.text();
    let payload: unknown = null;
    try {
      payload = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      payload = { message: text };
    }
    return NextResponse.json(payload ?? {}, { status: upstream.status });
  } catch {
    return NextResponse.json({ message: "Service indisponible" }, { status: 502 });
  }
}
