// middleware.ts — SÉPARATION STRICTE
// DG = /dg-prive uniquement | Équipe = /equipe uniquement | Jamais mélangé
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const role = request.cookies.get("wenze-role")?.value;

  // --- 1. PAGES PUBLIQUES DE CONNEXION : on laisse toujours passer ---
  // /dg-prive = page PIN du DG, /equipe = page WhatsApp + Code Pro de l'Équipe
  if (path === "/dg-prive" || path === "/equipe" || path === "/equipe/") {
    return NextResponse.next();
  }

  // --- 2. PORTE DG : /dg-prive/... (tableau DG) ---
  // Seul DG. Si pas DG → on renvoie vers LA PORTE DG, pas vers Équipe.
  if (path.startsWith("/dg-prive")) {
    if (role !== "DG") {
      return NextResponse.redirect(new URL("/dg-prive", request.url));
    }
    return NextResponse.next();
  }

  // --- 3. PORTE SUPERVISEUR : /equipe/superviseur ---
  // Seul SUPERVISEUR. Pas de DG ici. Si pas Superviseur → porte Équipe.
  if (path.startsWith("/equipe/superviseur")) {
    if (role !== "SUPERVISEUR") {
      return NextResponse.redirect(new URL("/equipe", request.url));
    }
    return NextResponse.next();
  }

  // --- 4. PORTE AMBASSADEUR : /equipe/ambassadeur ---
  // Seul AMBASSADEUR. Pas de DG ici. Si pas Ambassadeur → porte Équipe.
  if (path.startsWith("/equipe/ambassadeur")) {
    if (role !== "AMBASSADEUR") {
      return NextResponse.redirect(new URL("/equipe", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dg-prive/:path*", "/equipe/:path*"],
};
