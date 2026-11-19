// lib/tombola-points.ts - TOMBOLA PUBLIC SEULEMENT
// ✅ CLIENT, BOUTIQUE, PRESTATAIRE, GROSSISTE
// ❌ AMBASSADEUR, SUPERVISEUR, DG = JAMAIS

export const TYPES_PUBLIC = ["CLIENT", "BOUTIQUE", "PRESTATAIRE", "GROSSISTE"];

export function estPublic(type: string) {
  return TYPES_PUBLIC.includes((type || "").toUpperCase());
}

export function calculerPoints(codeInvitation: string, boutiques: any[], clients: any[], paiements: any[]) {
  if (!codeInvitation) return { total: 0, nbClients: 0, nbBoutiques: 0, nbAbos: 0, ptsClients: 0, ptsBoutiques: 0, ptsAbos: 0, detail: [] as any[] };

  // 3 pts : Client PUBLIC qui a finalisé son compte
  const clientsValides = clients.filter(c =>
    (c.code_invitation === codeInvitation || c.code_parrain === codeInvitation) &&
    (c.statut === "ACTIF" || c.statut === "VALIDEE") &&
    estPublic(c.type_public || c.type || "CLIENT")
  );

  // 5 pts : Boutique / Prestataire / Grossiste PUBLIC validée
  const boutiquesValides = boutiques.filter(b =>
    (b.code_invitation === codeInvitation || b.code_amb === codeInvitation) &&
    (b.statut === "VALIDEE" || b.statut === "ACTIF") &&
    estPublic(b.type_public || b.type || "BOUTIQUE")
  );

  // 20 pts : Invité PUBLIC qui a payé son abonnement
  const abosPayes = paiements.filter(p => {
    const bout = boutiques.find(x => x.id === p.boutique_id);
    const codeBout = bout?.code_invitation || bout?.code_amb || "";
    return codeBout === codeInvitation && (p.statut === "PAYÉ" || p.statut === "PAYE") && (p.type === "PREMIER" || p.type === "OCCASIONNELLE");
  });

  return {
    nbClients: clientsValides.length, nbBoutiques: boutiquesValides.length, nbAbos: abosPayes.length,
    ptsClients: clientsValides.length * 3, ptsBoutiques: boutiquesValides.length * 5, ptsAbos: abosPayes.length * 20,
    total: clientsValides.length * 3 + boutiquesValides.length * 5 + abosPayes.length * 20,
    detail: [
      ...clientsValides.map(c => ({ type: "CLIENT", nom: c.nom, pts: 3 })),
      ...boutiquesValides.map(b => ({ type: "BOUTIQUE", nom: b.nom, pts: 5 })),
      ...abosPayes.map(p => ({ type: "ABONNEMENT PAYÉ", nom: p.qui, pts: 20 })),
    ]
  };
}

// Liste des participants = PUBLIC seulement, avec nom + numéro
export function getParticipantsPublic(boutiques: any[], clients: any[], paiements: any[]) {
  const map = new Map();
  [...boutiques, ...clients].forEach((u: any) => {
    const type = (u.type_public || u.type || (u.nomEtablissement ? "BOUTIQUE" : "CLIENT")).toUpperCase();
    if (!estPublic(type)) return; // On bloque Ambassadeur / Superviseur ici
    const code = u.code_pro || u.code_invitation || u.id;
    if (!map.has(code)) {
      map.set(code, { id: u.id, nom: u.nom || u.proprietaire || "", telephone: u.telephone || u.whatsapp || "", type_public: type, code_invitation: code });
    }
  });
  return [...map.values()].map(p => ({ ...p, pts: calculerPoints(p.code_invitation, boutiques, clients, paiements) }))
    .filter(p => p.pts.total > 0 || p.telephone) // On voit tout le monde, même à 0 pt
    .sort((a, b) => b.pts.total - a.pts.total);
}
