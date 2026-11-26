// middleware.ts — SÉPARATION STRICTE + LANGUE (30 JOURS)
// DG = /dg-prive uniquement | Équipe = /equipe uniquement | Jamais mélangé
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LANGUES_SUPPORTEES = ["fr", "ln", "sw", "en"] as const;
type LangueSupportee = (typeof LANGUES_SUPPORTEES)[number];

const TRENTE_JOURS_SEC = 30 * 24 * 60 * 60;

function resoudreLangue(request: NextRequest): LangueSupportee {
  const cookieLang = request.cookies.get("wenze_lang")?.value?.toLowerCase();
  if (
    cookieLang &&
    (LANGUES_SUPPORTEES as readonly string[]).includes(cookieLang)
  ) {
    return cookieLang as LangueSupportee;
  }

  const accept = (request.headers.get("accept-language") || "").toLowerCase();
  if (accept.includes("ln")) return "ln";
  if (accept.includes("sw")) return "sw";
  if (accept.includes("en")) return "en";
  return "fr";
}

function finaliserReponse(
  request: NextRequest,
  response: NextResponse,
  langue: LangueSupportee
): NextResponse {
  response.headers.set("x-current-lang", langue);

  if (!request.cookies.get("wenze_lang")) {
    response.cookies.set("wenze_lang", langue, {
      maxAge: TRENTE_JOURS_SEC,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const role = request.cookies.get("wenze-role")?.value;
  const langue = resoudreLangue(request);

  // --- 1. PAGES PUBLIQUES DE CONNEXION : on laisse toujours passer ---
  if (path === "/dg-prive" || path === "/equipe" || path === "/equipe/") {
    return finaliserReponse(request, NextResponse.next(), langue);
  }

  // --- 2. PORTE DG : /dg-prive/... (tableau DG) ---
  if (path.startsWith("/dg-prive")) {
    if (role !== "DG") {
      return finaliserReponse(
        request,
        NextResponse.redirect(new URL("/dg-prive", request.url)),
        langue
      );
    }
    return finaliserReponse(request, NextResponse.next(), langue);
  }

  // --- 3. PORTE SUPERVISEUR : /equipe/superviseur ---
  if (path.startsWith("/equipe/superviseur")) {
    if (role !== "SUPERVISEUR") {
      return finaliserReponse(
        request,
        NextResponse.redirect(new URL("/equipe", request.url)),
        langue
      );
    }
    return finaliserReponse(request, NextResponse.next(), langue);
  }

  // --- 4. PORTE AMBASSADEUR : /equipe/ambassadeur ---
  if (path.startsWith("/equipe/ambassadeur")) {
    if (role !== "AMBASSADEUR") {
      return finaliserReponse(
        request,
        NextResponse.redirect(new URL("/equipe", request.url)),
        langue
      );
    }
    return finaliserReponse(request, NextResponse.next(), langue);
  }

  return finaliserReponse(request, NextResponse.next(), langue);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
  
