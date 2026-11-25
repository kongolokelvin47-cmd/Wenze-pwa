"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { lireSession, cle9 } from "@/lib/connexion";
import { verifierPinDG } from "@/lib/dg-prive";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  verifierAbonnement,
  toCDFString,
  usd,
} from "@/lib/paiement";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

type RoleUtilisateur = "client" | "vendeur" | "prestataire" | "grossiste" | "dg";

function normaliserRole(rawRole: any): RoleUtilisateur {
  const r = String(rawRole || "vendeur").toLowerCase().trim();
  if (r === "dg") return "dg";
  if (r === "client") return "client";
  if (r === "prestataire") return "prestataire";
  if (r === "grossiste") return "grossiste";
  return "vendeur";
}

function tracerAuthJournal(
  action: "AUTH_CONNEXION_OK" | "AUTH_INSCRIPTION_OK" | "AUTH_ECHEC",
  role: string,
  waDigits: string,
  detail?: string
) {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("wenze_journal");
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push({
      id: "jrn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      action,
      role,
      acteurWhatsapp: waDigits,
      detail: detail || "",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

export default function AuthPage() {
  const router = useRouter();
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [showDgPin, setShowDgPin] = useState(false);
  const [dgPinInput, setDgPinInput] = useState("");
  const [userRole, setUserRole] = useState<RoleUtilisateur | null>(null);

  useEffect(() => {
    try {
      const session: any = lireSession();
      if (session?.dgSessionActive) {
        router.replace("/dg-prive");
        return;
      }
      const ab: any = verifierAbonnement();
      if (ab?.isCache) {
        router.replace("/abonnement?reason=cache");
      }
    } catch {}

    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [router]);

  const syncWenzeUser = async (
    supaUserId: string,
    userEmail: string,
    roleFromProfile?: string,
    waFromProfile?: string
  ) => {
    try {
      const now = new Date().toISOString();
      const existingRaw =
        typeof window !== "undefined"
          ? localStorage.getItem("wenze_user")
          : null;
      const existing = existingRaw ? JSON.parse(existingRaw) : null;

      let profile: any = null;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", supaUserId)
          .single();
        profile = data;
      } catch {}

      const wa = cle9(
        waFromProfile ||
          profile?.whatsapp ||
          profile?.ownerWhatsapp ||
          whatsapp ||
          existing?.ownerWhatsapp ||
          existing?.whatsapp ||
          ""
      );
      const role = normaliserRole(
        roleFromProfile ||
          profile?.user_type ||
          profile?.role ||
          existing?.role ||
          "vendeur"
      );

      const wenzeUser = {
        id: supaUserId,
        ownerWhatsapp: wa,
        whatsapp: wa,
        telephone: wa,
        email: userEmail,
        role: role === "dg" ? "vendeur" : role,
        user_type: role === "dg" ? "vendeur" : role,
        createdAt: profile?.created_at || existing?.createdAt || now,
        updatedAt: now,
        isCache: false,
        is_visible: true,
        ownerId: supaUserId,
        palierId: existing?.palierId || null,
        palierExpireAt: existing?.palierExpireAt || null,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("wenze_user", JSON.stringify(wenzeUser));
        try {
          const allRaw = localStorage.getItem("wenze_all_users");
          const all = allRaw ? JSON.parse(allRaw) : [];
          const arr = Array.isArray(all) ? all : [];
          const idx = arr.findIndex(
            (u: any) =>
              cle9(u.ownerWhatsapp || u.whatsapp) === wa || u.id === supaUserId
          );
          if (idx >= 0) arr[idx] = { ...arr[idx], ...wenzeUser };
          else arr.push(wenzeUser);
          localStorage.setItem("wenze_all_users", JSON.stringify(arr.slice(0, 500)));
        } catch {}
      }

      return wenzeUser;
    } catch {
      return null;
    }
  };

  const handleAuth = async () => {
    if (loading) return;
    setErreur("");
    setInfoMsg("");

    const emailPropre = email.trim();
    const waDigits = cle9(whatsapp);

    if (!emailPropre || !password) {
      setErreur("Veuillez renseigner votre e-mail et votre mot de passe.");
      return;
    }
    if (!isLogin && waDigits.length < 9) {
      setErreur(
        "Numéro WhatsApp requis (ex. : 243970000000 ou 0825000000)."
      );
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailPropre,
          password,
        });
        if (error) throw error;
        if (!data.user) throw new Error("Utilisateur introuvable.");

        let profile: any = null;
        try {
          const { data: p } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();
          profile = p;
        } catch {}

        const role = normaliserRole(profile?.user_type || profile?.role || "vendeur");
        setUserRole(role);

        if (role === "dg") {
          if (!showDgPin) {
            setShowDgPin(true);
            setLoading(false);
            return;
          }
          const pinOk =
            typeof verifierPinDG === "function"
              ? Boolean(verifierPinDG(dgPinInput.trim()))
              : false;
          if (!pinOk) {
            tracerAuthJournal("AUTH_ECHEC", "dg", waDigits || cle9(profile?.whatsapp), "PIN DG invalide");
            setErreur("Code PIN Bureau DG invalide.");
            setLoading(false);
            return;
          }
          try {
            sessionStorage.setItem(
              "wenze_dg_auth",
              JSON.stringify({
                role: "dg",
                roleAdmin: "dg",
                dgSessionActive: true,
                whatsapp: cle9(profile?.whatsapp || waDigits),
                at: Date.now(),
              })
            );
          } catch {}
          tracerAuthJournal("AUTH_CONNEXION_OK", "dg", cle9(profile?.whatsapp || waDigits));
          router.push("/dg-prive");
          return;
        }

        const wenzeUser = await syncWenzeUser(
          data.user.id,
          emailPropre,
          role,
          profile?.whatsapp
        );
        tracerAuthJournal(
          "AUTH_CONNEXION_OK",
          role,
          cle9(wenzeUser?.ownerWhatsapp || profile?.whatsapp || "")
        );

        try {
          const ab: any = verifierAbonnement();
          if (ab?.isCache) {
            setInfoMsg(
              `Offre gratuite expirée (${FREE_DAYS} jours) : compte masqué (is_visible = false). Redirection vers l'abonnement...`
            );
            redirectTimerRef.current = setTimeout(() => {
              router.push(
                "/abonnement?reason=cache&wa=" +
                  encodeURIComponent(wenzeUser?.ownerWhatsapp || "")
              );
            }, 900);
            return;
          }
        } catch {}

        if (!profile?.user_type) {
          router.push("/onboarding");
        } else {
          router.push("/");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: emailPropre,
          password,
        });
        if (error) throw error;
        if (!data.user) throw new Error("Erreur lors de la création du compte.");

        const now = new Date().toISOString();
        try {
          await supabase.from("profiles").insert({
            id: data.user.id,
            email: emailPropre,
            whatsapp: waDigits,
            ownerWhatsapp: waDigits,
            user_type: "vendeur",
            role: "vendeur",
            is_visible: true,
            created_at: now,
          });
        } catch {}

        await syncWenzeUser(data.user.id, emailPropre, "vendeur", waDigits);
        tracerAuthJournal("AUTH_INSCRIPTION_OK", "vendeur", waDigits);

        setInfoMsg(
          `Compte créé • Freemium : ${MAX_FREE_IMAGES} images max / ${FREE_DAYS} jours puis is_visible = false • 0 % commission.`
        );
        redirectTimerRef.current = setTimeout(() => {
          router.push("/onboarding");
        }, 900);
      }
    } catch (e: any) {
      tracerAuthJournal("AUTH_ECHEC", isLogin ? "connexion" : "inscription", waDigits);
      setErreur(e?.message || "Erreur d'authentification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFBF0] to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black">
            WENZE WENZE<span className="text-[#FF6B00]">.</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Kinshasa • 0 % commission • Taux {TAUX_CDF} CDF/$ • Max{" "}
            {PLAFOND_ACTIVES} annonces actives
          </p>
          <div className="mt-2 text-[11px] bg-[#FFFBF0] border p-2.5 rounded-xl text-gray-700">
            Freemium : <b>{MAX_FREE_IMAGES} images max / {FREE_DAYS} jours</b>{" "}
            puis masquage (<b>is_visible = false</b>) • Tarif minimum{" "}
            <b>{usd(1)}</b> ({toCDFString(1)})
          </div>
        </div>

        <div className="flex bg-gray-100 rounded-full p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setShowDgPin(false);
              setErreur("");
            }}
            className={`flex-1 py-2 rounded-full text-sm font-bold ${
              isLogin ? "bg-white shadow" : "text-gray-600"
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setShowDgPin(false);
              setErreur("");
            }}
            className={`flex-1 py-2 rounded-full text-sm font-bold ${
              !isLogin ? "bg-white shadow" : "text-gray-600"
            }`}
          >
            Inscription
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Adresse e-mail"
            type="email"
            className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none"
          />
          {!isLogin ? (
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="WhatsApp (ex. : 243970000000 ou 0825000000)"
              type="tel"
              className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none"
            />
          ) : null}
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            type="password"
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black outline-none"
          />

          {showDgPin ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-bold text-red-700 mb-2">
                🔐 Vérification isolée Bureau DG (PIN requis)
              </p>
              <input
                value={dgPinInput}
                onChange={(e) => setDgPinInput(e.target.value)}
                type="password"
                placeholder="Code PIN Bureau DG"
                className="w-full border rounded-xl px-4 py-2 text-sm bg-white"
              />
            </div>
          ) : null}

          {erreur ? (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl"
            >
              {erreur}
            </div>
          ) : null}

          {infoMsg ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl">
              {infoMsg}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-black text-white rounded-xl py-3 text-sm font-bold disabled:opacity-50"
          >
            {loading
              ? "Vérification..."
              : isLogin
              ? showDgPin
                ? "Valider PIN & ouvrir Bureau DG"
                : "Se connecter"
              : "Créer mon compte"}
          </button>

          {userRole ? (
            <p className="text-[11px] text-center text-gray-600">
              Rôle : <b>{userRole}</b> • 0 % commission
            </p>
          ) : null}
        </div>

        <div className="mt-6 text-[10px] text-gray-400 text-center leading-relaxed">
          Wenze Wenze • 0 % commission • Max {PLAFOND_ACTIVES} annonces actives
          • Invitations réservées aux clients, boutiques et prestataires.
        </div>
      </div>
    </div>
  );
 }
