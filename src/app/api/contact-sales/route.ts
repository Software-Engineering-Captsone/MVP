import { NextResponse } from "next/server";
import { sendContactSalesInquiry } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const email = typeof o.email === "string" ? o.email.trim() : "";
  const company =
    typeof o.company === "string" ? o.company.trim() : undefined;
  const message =
    typeof o.message === "string" ? o.message.trim() : undefined;

  if (!name || name.length > 200) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 }
    );
  }
  if (company && company.length > 200) {
    return NextResponse.json({ error: "Company is too long." }, { status: 400 });
  }
  if (message && message.length > 5000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  try {
    const emailed = await sendContactSalesInquiry({
      name,
      email,
      company: company || undefined,
      message: message || undefined,
    });
    return NextResponse.json({ ok: true, emailed });
  } catch (e) {
    console.error("[contact-sales]", e);
    return NextResponse.json(
      { error: "Could not send your message. Try again later." },
      { status: 500 }
    );
  }
}
