import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const role = request.cookies.get("wenze-role")?.value;
  const path = request.nextUrl.pathname;
  if (path === "/dg-prive/connexion") return NextResponse.next();
  if (path.startsWith("/dg-prive")) {
    if (role !== "DG") return NextResponse.redirect(new URL("/dg-prive/connexion", request.url));
    return NextResponse.next();
  }
  if (path.startsWith("/equipe/superviseur")) {
    if (role !== "SUPERVISEUR" && role !== "DG") return NextResponse.redirect(new URL("/dg-prive/connexion", request.url));
    return NextResponse.next();
  }
  if (path.startsWith("/equipe/ambassadeur")) {
    if (role !== "AMBASSADEUR" && role !== "DG") return NextResponse.redirect(new URL("/dg-prive/connexion", request.url));
    return NextResponse.next();
  }
  return NextResponse.next();
}
export const config = { matcher: ["/dg-prive/:path*", "/equipe/:path*"] };
