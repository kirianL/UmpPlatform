import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, redirect: "/login" });
  
  // Clear HTTP-Only Cookie
  response.cookies.set({
    name: "session_token",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0), // Immediate expiration
  });

  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "http://localhost:3000"));
  
  response.cookies.set({
    name: "session_token",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
