"use client";
import { useState } from "react";
import Link from "next/link";
import { COMMUNES, inviter, listerInvitations, placesInvitation, majCompte } from "@/lib/comptes";
import { FREEMIUM, PAIEMENT_MINIMUM_USD, usd } from "@/lib/paiement";

const CHAMP = "w-full mt-1 border rounded-xl px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-black bg-white";

/* ---------- Modification des informations du compte ---------- */
export function EditForm({ compte, onSaved, onCancel }: { compte: any; onSaved: (c: any) => void; onCancel: () => void }) {
  const [nom, setNom] = useState<string>(compte.nom || "");
  const [boutique, setBoutique] = useState<string>(compte.nomBoutique || compte.nomEtablissement || "");
  const [commune, setCommune] = useState<string>(compte.commune || "Gombe");
  const [email, setEmail] = useState<string>(compte.email || "");
  const [erreur, setErreur] = useState("");

  const enregistrer = () => {
    setErreur("");
    if (nom.trim().length < 2) return setErreur("Indiquez votre nom");
    if (compte.estVendeur && boutique.trim().length < 2) return setErreur("Indiquez le nom de votre boutique");
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return setErreur("Adresse e-mail invalide");
    const champs: any = { nom: nom.trim(), name: nom.trim(), commune, email: email.trim() };
    if (compte.estVendeur) {
      champs.nomBoutique = boutique.trim();
      champs.nomEtablissement = boutique.trim();
      champs.boutiqueName = boutique.trim();
    } else {
      champs.nomEtablissement = nom.trim();
    }
    const r = majCompte(champs);
    if (!r.ok) return setErreur(r.erreur || "Enregistrement impossible");
    onSaved(r.compte);
  };

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <div>
        <label className="text-[11px] font-bold" htmlFor="e-nom">Votre nom</label>
        <input id="e-nom" value={nom} onChange={(e: any) => setNom(e.target.value)} className={CHAMP} />
      </div>
      {compte.estVendeur ? (
        <div>
          <label className="text-[11px] font-bold" htmlFor="e-bout">Nom de la boutique ou du service</label>
          <input id="e-bout" value={boutique} onChange={(e: any) => setBoutique(e.target.value)} className={CHAMP} />
        </div>
      ) : null}
      <div>
        <label className="text-[11px] font-bold" htmlFor="e-com">Commune</label>
        <select id="e-com" value={commune} onChange={(e: any) => setCommune(e.target.value)} className={CHAMP}>
          {COMMUNES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[11px] font-bold" htmlFor="e-mail">E-mail (facultatif)</label>
        <input id="e-mail" value={email} onChange={(e: any) => setEmail(e.target.value)} type="email" className={CHAMP} />
      </div>
      <p className="text-[10px] text-gray-400">Le numéro WhatsApp est votre identifiant : il ne peut pas être modifié.</p>
      {erreur ? <p role="alert" className="text-[11px] font-bold text-red-600">{erreur}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="bg-white border-2 py-3 rounded-full font-bold text-[12px]">Annuler</button>
        <button type="button" onClick={enregistrer} className="bg-black text-white py-3 rounded-full font-black text-[12px]">Enregistrer</button>
      </div>
    </div>
  );
}

/* ---------- Cartes d'état du compte ---------- */
export function CartesEtat({ compte, ab }: { compte: any; ab: any }) {
  const client = !compte.estVendeur;
  const niveau = compte.niveau || 1;
  return (
    <>
      {client ? (
        <div className="bg-black text-white rounded-2xl p-4">
          <p className="font-black text-[14px]">🏪 Envie de vendre ?</p>
          <p className="text-[11px] text-white/80 mt-1">
            Ouvrez votre boutique en 1 minute. Pas de période gratuite pour votre profil : un abonnement dès {usd(PAIEMENT_MINIMUM_USD)} ou un boost suffit.
          </p>
          <Link href="/onboarding" className="mt-3 block text-center bg-white text-black rounded-full py-3 font-black text-[12px]">Ouvrir ma boutique</Link>
        </div>
      ) : (
        <div className="bg-white border-2 border-black rounded-2xl p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <p className="font-black text-[13px]">{ab && ab.badge ? ab.badge + " " : ""}Mon abonnement</p>
              <p className="text-[11px] text-gray-600 mt-1">{ab && ab.message ? ab.message : "Chargement…"}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/abonnement" className="bg-black text-white rounded-full py-2.5 text-center text-[11px] font-black">Abonnements</Link>
            <Link href="/publier" className="bg-white border-2 border-black rounded-full py-2.5 text-center text-[11px] font-black">+ Publier</Link>
          </div>
        </div>
      )}

      {!client && niveau < 2 && !compte.whatsappVerifie ? (
        <div className="bg-white border-2 border-dashed rounded-2xl p-4">
          <p className="font-black text-[12px]">✔️ Vérifier mon numéro WhatsApp</p>
          <p className="text-[10px] text-gray-600 mt-1">
            La vérification débloquera vos {FREEMIUM.maxImages} images gratuites et le badge « Numéro vérifié ». Elle sera disponible avec la prochaine mise à jour.
          </p>
        </div>
      ) : null}
    </>
  );
}

/* ---------- Invitations par numéro WhatsApp ---------- */
const ETATS: Record<string, string> = { invité: "En attente", inscrit: "Inscrit(e)", validé: "Validé(e)", expiré: "Expirée" };

function reste(inv: any): string {
  if (inv.status !== "invité" || !inv.reservedUntil) return "";
  const h = Math.max(0, Math.ceil((new Date(inv.reservedUntil).getTime() - Date.now()) / 3600000));
  return " · expire dans " + h + " h";
}

export function InvitationsCard({ compte, onToast }: { compte: any; onToast: (m: string) => void }) {
  const [nom, setNom] = useState("");
  const [numero, setNumero] = useState("");
  const [type, setType] = useState<"vendeur" | "client">("client");
  const [erreur, setErreur] = useState("");
  const [tick, setTick] = useState(0);
  const wa = compte.ownerWhatsapp || compte.whatsapp;
  const places = placesInvitation(wa);
  const liste = listerInvitations(wa).slice(-5).reverse();
  const code = compte.codeAmbassadeur || compte.monCode || "";

  const envoyer = () => {
    setErreur("");
    const r = inviter(compte, { nom, whatsapp: numero, type });
    if (!r.ok) return setErreur(r.erreur || "Invitation impossible");
    setNom("");
    setNumero("");
    setTick(tick + 1);
    onToast("Invitation prête : envoyez le message sur WhatsApp");
    if (r.lien) window.open(r.lien, "_blank", "noopener");
  };

  const copier = () => {
    try {
      navigator.clipboard.writeText(code).then(() => onToast("Code copié"));
    } catch {}
  };

  return (
    <div className="bg-white border-2 border-dashed rounded-2xl p-4" data-tick={tick}>
      <div className="flex justify-between items-center">
        <p className="font-black text-[13px]">🎟️ Inviter un ami</p>
        <span className="text-[10px] font-black bg-black text-white px-2.5 py-1 rounded-full">{places.libres}/{places.total} places</span>
      </div>
      <p className="text-[10px] text-gray-600 mt-1">
        Saisissez son numéro WhatsApp : vous lui envoyez vous-même le message. La place est réservée 48 h.
      </p>
      {code ? (
        <button type="button" onClick={copier} className="mt-2 text-[10px] bg-[#FFFBF0] border rounded-full px-3 py-1 font-bold">
          Mon code : {code} · copier
        </button>
      ) : null}

      <div className="flex gap-2 mt-3">
        {(["client", "vendeur"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={"px-4 py-2 rounded-full text-[11px] font-black border-2 " + (type === t ? "bg-black text-white border-black" : "bg-white")}
          >
            {t === "client" ? "Client" : "Vendeur"}
          </button>
        ))}
      </div>
      <input value={nom} onChange={(e: any) => setNom(e.target.value)} placeholder="Nom de l'invité" className={CHAMP} />
      <input value={numero} onChange={(e: any) => setNumero(e.target.value)} placeholder="Son numéro WhatsApp, ex : 082 500 0000" type="tel" inputMode="tel" className={CHAMP} />
      {erreur ? <p role="alert" className="text-[11px] font-bold text-red-600 mt-2">{erreur}</p> : null}
      <button type="button" onClick={envoyer} className="w-full mt-3 bg-[#25D366] text-white py-3.5 rounded-full font-black text-[12px]">
        Préparer le message WhatsApp
      </button>

      {liste.length > 0 ? (
        <div className="mt-3 border rounded-xl divide-y">
          {liste.map((inv: any) => (
            <div key={inv.id} className="p-2.5 flex justify-between gap-2 text-[10px]">
              <span className="truncate">{inv.inviteNom}</span>
              <span className="font-bold shrink-0">{(ETATS[inv.status] || inv.status) + reste(inv)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
    }
