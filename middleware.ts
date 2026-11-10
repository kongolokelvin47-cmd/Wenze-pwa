// middleware.ts - à la racine, à côté de app/
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Pour l'instant : si pas de cookie wenze-role=DG, on envoie vers connexion
  // Plus tard, tu remplaceras ça par ton vrai système de connexion
  const role = request.cookies.get("wenze-role")?.value;

  if (request.nextUrl.pathname.startsWith("/dg-prive")) {
    // On laisse passer la page de connexion elle-même
    if (request.nextUrl.pathname === "/dg-prive/connexion") {
      return NextResponse.next();
    }
    // Si pas DG, on bloque
    if (role !== "DG") {
      return NextResponse.redirect(new URL("/dg-prive/connexion", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dg-prive/:path*"],
};
