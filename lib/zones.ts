// lib/zones.ts
export function cleZone(pays: string, province: string, commune: string, quartier?: string) {
  return [pays, province, commune, quartier || ""].join(">").toLowerCase().trim();
}
export function detecterConflitZone(nouveau: any, superviseursActifs: any[]) {
  const cle = cleZone(nouveau.zone_pays, nouveau.zone_province, nouveau.zone_commune, nouveau.zone_quartier);
  return superviseursActifs.find(s => s.id !== nouveau.id && s.statut === "ACTIF" && cleZone(s.zone_pays, s.zone_province, s.zone_commune, s.zone_quartier) === cle);
}

// lib/tombola.ts
// Règles : Plafond 100, +20 uniquement si paiement invité VALIDE, 1 téléphone = 1 participation
export function calculerPointsTombola(participant: any, invitations: any[], paiementsValides: any[]) {
  let points = 0;
  for (const inv of invitations.filter(i => i.inviteur_id === participant.id)) {
    if (inv.type_invite === "BOUTIQUE") points += 5;
    if (inv.type_invite === "CLIENT") points += 3;
    const paiementValide = paiementsValides.find(p => p.boutique_id === inv.invite_id || p.client_id === inv.invite_id);
    if (paiementValide) points += 20; // Jamais avant validation paiement
  }
  return Math.min(points, 100); // Plafond bloqué
}
export function detecterTriche(participants: any[]) {
  const vus = new Map<string, number>();
  const suspects: string[] = [];
  for (const p of participants) {
    const tel = String(p.telephone).replace(/\s/g, "");
    if (vus.has(tel)) suspects.push(p.id);
    vus.set(tel, (vus.get(tel) || 0) + 1);
  }
  return suspects;
}
