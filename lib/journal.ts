// lib/journal.ts
import { supabase } from "./supabase";

export type ActionJournal =
  | "CONNEXION"
  | "CHANGEMENT_PIN"
  | "VALIDATION_BOUTIQUE"
  | "SUSPENSION"
  | "REACTIVATION"
  | "VALIDATION_PAIEMENT"
  | "REJET_PAIEMENT"
  | "APPROBATION_ANNONCE"
  | "REJET_ANNONCE"
  | "CHANGEMENT_TARIF"
  | "TOMBOLA_CLOTURE"
  | "TRANSFERT_ZONE"
  | "SAUVEGARDE"
  | "VERIF_TELEGRAM_ECHEC";

export async function ecrireJournal(p: {
  acteur: string;
  acteur_role: "DG" | "SUP" | "AMB";
  action: ActionJournal;
  cible_type?: string;
  cible_id?: string;
  avant?: any;
  apres?: any;
  zone?: string;
}) {
  try {
    const { error } = await supabase.from("wenze_journal").insert({
      acteur: p.acteur,
      acteur_role: p.acteur_role,
      action: p.action,
      cible_type: p.cible_type,
      cible_id: p.cible_id,
      avant: p.avant ?? null,
      apres: p.apres ?? null,
      zone: p.zone ?? null,
    });
    if (error) console.error("Erreur wenze_journal:", error.message);
  } catch (e) {
    console.error("Exception wenze_journal:", e);
  }
}
