"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES_WENZE, getCategorieById, normalizeCategorie } from "@/lib/categories";
import { HomeHeader, AnnonceCard, ImageViewer, BottomNav, fmtUSD } from "./HomeParts";
import { supabase, hasSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const cleanWa = (n: any): string => {
  const d = (n || "").toString().replace(/[^0-9]/g, "").replace(/^0+/, "");
  if(!d) return "";
  return d.length<=9 ? "243"+d : d.startsWith("243") ? d : "243"+d.slice(-9);
};
const TAUX_CDF = 2300;
const safeCDF = (p:any)=>{ try{ const v=Number(p||0); return isNaN(v)?"0 CDF":(v*TAUX_CDF).toLocaleString()+" CDF"; }catch{ return "0 CDF"; } };
const norm = (s:any)=>(s||"").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");

function readList(key: string): any[] {
  try { if (typeof window === "undefined") return []; const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function readUser(): any {
  try { if (typeof window === "undefined") return null; const raw = localStorage.getItem("wenze_user"); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export default function WenzeBusiness() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [notifCount, setNotifCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  // --- INVITATIONS INTÉGRÉES ---
  const [myInvitations, setMyInvitations] = useState<any[]>([]);
  const [myParrain, setMyParrain] = useState<any>(null); // Qui m'a invité
  const [filleuls, setFilleuls] = useState<any[]>([]); // Boutiques que j'ai invitées + leurs annonces

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const loadAnnonces = useCallback(() => {
    try {
      const usersMap = new Map<string, any>();
      for (const u of readList("wenze_all_users")) {
        const wa = cleanWa(u.ownerWhatsapp || u.whatsapp || u.id);
        if (wa) usersMap.set(wa, u);
      }
      const cur = readUser();
      if (cur) {
        const wa = cleanWa(cur.ownerWhatsapp || cur.whatsapp || cur.id);
        if (wa) usersMap.set(wa, cur);
      }
      const fixed = readList("wenze_annonces_list")
        .map((a: any) => {
          const wa = cleanWa(a.ownerWhatsapp || a.whatsapp || a.userId);
          const vendeur = usersMap.get(wa);
          const prix = Number(a.prixUSD || a.prix || 0);
          const nomBoutique = (vendeur?.nomBoutique || vendeur?.boutiqueName || a.boutiqueName || a.nomEtablissement || `Boutique ${wa.slice(-4)}`).toString().replace(/^Boutiques\s*/i,"").replace(/^Boutique\s*/i,"").trim();
          return {
            ...a,
            categorieId: normalizeCategorie(a.categorieId || a.categorie || "commerces-services"),
            prix: isNaN(prix)?0:prix,
            prixCDF: safeCDF(prix),
            isVideo: !!a.isVideo || !!a.video || !!a.videoUrl || (typeof a.photo === "string" && a.photo.startsWith("data:video")),
            isBoosted: !!a.boostUntil && new Date(a.boostUntil).getTime() > Date.now(),
            isPayant: false,
            vendeurBadge: "",
            vendeurPalier: "",
            vendeurNom: `Boutiques ${nomBoutique}`,
            _wa: wa,
            _vendeur: vendeur || null,
          };
        });
      setAnnonces(fixed);
    } catch { setAnnonces([]); }
  }, []);

  // --- CHARGE MES INVITATIONS + MES FILLEULS ---
  const loadInvitations = useCallback(async ()=>{
    try{
      const cur = readUser();
      if(!cur) return;
      const myWa = cleanWa(cur.ownerWhatsapp||cur.whatsapp||cur.id);
      // 1. Qui m'a invité ? (si je suis un invité)
      if(cur.parrainWa || cur.parrainNom || cur.inviteCode){
        setMyParrain({ wa: cleanWa(cur.parrainWa), nom: cur.parrainNom||"Un ami Wenze", code: cur.inviteCode||"" });
      }
      // 2. Qui j'ai invité ?
      let list:any[] = [];
      if(hasSupabase && supabase){
        const { data } = await supabase.from("invitations").select("*").eq("parrain_wa", myWa).order("created_at",{ ascending:false });
        if(data) list = data;
      }
      if(list.length===0){
        list = readList("wenze_invitations").filter((x:any)=> cleanWa(x.parrain_wa)===myWa);
        // Ancien format local: parrain_wa peut être dans parrainWa
        if(list.length===0) list = readList("wenze_invitations").filter((x:any)=> cleanWa(x.parrainWa||x.parrain_wa)===myWa);
      }
      setMyInvitations(list);

      // 3. Filleuls = invitations acceptées + leurs annonces (pour les mettre en avant)
      const acceptees = list.filter((x:any)=> x.statut==="accepte");
      const allAnnonces = readList("wenze_annonces_list");
      const filleulsList = acceptees.map((inv:any)=>{
        const waF = cleanWa(inv.invite_wa||inv.inviteWa);
        const anns = allAnnonces.filter((a:any)=> cleanWa(a.ownerWhatsapp||a.whatsapp||a.userId)===waF);
        return { ...inv, wa: waF, annoncesCount: anns.length, derniereAnnonce: anns[0]||null };
      });
      setFilleuls(filleulsList);
    }catch{}
  },[]);

  useEffect(() => {
    const refreshCart = () => setCartCount(readList("wenze_panier").length);
    const onChange = () => { loadAnnonces(); loadInvitations(); refreshCart(); };
    onChange();
    let cancelled = false;
    let stopNotifs: (() => void) | null = null;
    import("@/lib/notifications")
      .then((m: any) => {
        if (cancelled) return;
        const user = readUser() || {};
        const wa = cleanWa(user.ownerWhatsapp || user.whatsapp || user.id);
        const updateBadge = () => { try{ setNotifCount(m.getUnreadCount ? m.getUnreadCount(user.id || wa) : 0); }catch{} };
        try{ if (m.checkAndNotifyExpirations) m.checkAndNotifyExpirations(); }catch{}
        updateBadge();
        window.addEventListener("wenze-notif", updateBadge);
        const i1 = setInterval(() => { try{ if (m.checkAndNotifyExpirations) m.checkAndNotifyExpirations(); }catch{} updateBadge(); loadAnnonces(); loadInvitations(); }, 60*60*1000);
        const i2 = setInterval(updateBadge, 3000);
        stopNotifs = () => { window.removeEventListener("wenze-notif", updateBadge); clearInterval(i1); clearInterval(i2); };
      }).catch(() => {});
    window.addEventListener("storage", onChange);
    window.addEventListener("wenze-update", onChange);
    return () => {
      cancelled = true;
      if (stopNotifs) stopNotifs();
      window.removeEventListener("storage", onChange);
      window.removeEventListener("wenze-update", onChange);
    };
  }, [loadAnnonces, loadInvitations]);

  const filtered = useMemo(() => {
    let list = [...annonces];
    if (selectedCat !== "all") list = list.filter((a) => a.categorieId === selectedCat);
    if (debounced) {
      const s = norm(debounced);
      list = list.filter((a) => {
        const wa = a._wa || "";
        const wa9 = wa.slice(-9);
        const hay = norm(`${a.titre||""} ${a.description||""} ${a.commune||""} ${a.ville||""} ${a.vendeurNom||""} ${a.marque||""} ${wa} ${wa9} 0${wa9} ${a.prix||""}`);
        return hay.includes(s);
      });
    }
    const time = (a: any) => new Date(a.created_at || a.createdAt || 0).getTime();
    // Filleuls en avant APRÈS les boostés, mais AVANT les autres - sans TOP gratuit, juste visibilité réseau
    const filleulWas = new Set(filleuls.map((f:any)=>f.wa));
    return list.sort((a, b) => {
      if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1;
      const aF = filleulWas.has(a._wa) ? 1 : 0;
      const bF = filleulWas.has(b._wa) ? 1 : 0;
      if (aF !== bF) return bF - aF;
      return time(b) - time(a);
    });
  }, [annonces, debounced, selectedCat, filleuls]);

  const tabs = useMemo(
    () => CATEGORIES_WENZE.filter((c: any) => c.id !== "client").map((c: any) => ({
      id: c.id as string,
      label: ((c.icon || "") + " " + (c.titreCourt || c.titre || c.id)).trim(),
      count: annonces.filter((a) => a.categorieId === c.id).length
    })),
    [annonces]
  );

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const addPanier = (a: any) => {
    try {
      const panier = readList("wenze_panier");
      if (panier.some((p: any) => String(p.id) === String(a.id))) { showToast("Déjà dans le panier 🛒"); return; }
      panier.push({
        id: a.id, titre: a.titre, prix: a.prix, prixUSD: a.prix, prixCDF: a.prixCDF,
        categorieId: a.categorieId, commune: a.commune || "", ville: a.ville || "Kinshasa",
        ownerWhatsapp: a._wa, whatsapp: a._wa, ownerName: a.ownerName || "", stock: a.stock || 1, qty: 1,
        photo: typeof a.photo === "string" && a.photo.length < 30000 ? a.photo : ""
      });
      localStorage.setItem("wenze_panier", JSON.stringify(panier));
      setCartCount(panier.length);
      window.dispatchEvent(new Event("wenze-update"));
      showToast("Ajouté : " + fmtUSD(a.prix) + "$ / " + a.prixCDF + " 🛒");
    } catch (e: any) { showToast(e && e.name === "QuotaExceededError" ? "Stockage plein : supprimez d'anciennes annonces" : "Impossible d'ajouter au panier"); }
  };

  const keepCurrent = (a: any) => { try{ localStorage.setItem("wenze_current_produit", JSON.stringify(a)); }catch{} };
  const openProduit = (a: any) => {
    if(!a?.id) return;
    keepCurrent(a);
    router.push("/produit/" + encodeURIComponent(a.id));
  };
  const openVideoPage = (a: any) => {
    if(!a?.id) return;
    keepCurrent(a);
    router.push("/video?id=" + encodeURIComponent(a.id));
  };

  const prixMoyen = filtered.length ? Math.round(filtered.reduce((s, a) => s + Number(a.prix || 0), 0) / filtered.length) : 0;
  const boostedCount = filtered.filter((a) => a.isBoosted).length;
  const invitesAcceptes = myInvitations.filter((x:any)=>x.statut==="accepte").length;
  const invitesEnAttente = myInvitations.length - invitesAcceptes;

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] pb-24">
      <HomeHeader
        ab={null}
        payantCount={0}
        boostedCount={boostedCount}
        notifCount={notifCount}
        cartCount={cartCount}
        search={search}
        onSearch={setSearch}
        tabs={tabs}
        selectedCat={selectedCat}
        onSelectCat={setSelectedCat}
        totalCount={annonces.length}
      />

      <div className="p-4 space-y-3">
        {toast ? <div className="bg-black text-white p-3 rounded-xl text-[12px] font-bold text-center">{toast}</div> : null}

        {/* 1. SI JE SUIS UN INVITÉ - Bienvenue + action */}
        {myParrain && (
          <div className="bg-black text-white rounded-2xl p-3.5 flex gap-3 items-center">
            <span className="text-[24px]">🎁</span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[12px]">Bienvenue ! Invité par {myParrain.nom}</p>
              <p className="text-[10px] opacity-80">Crée ta première annonce pour apparaître ici.</p>
            </div>
            <Link href="/publier" className="bg-white text-black px-3 py-2 rounded-full text-[10px] font-black whitespace-nowrap">+ Publier →</Link>
          </div>
        )}

        {/* 2. SI J'AI INVITÉ - Mon réseau en 1 coup d'oeil */}
        {myInvitations.length>0 && (
          <Link href="/mes-invitations" className="block bg-white border-2 border-black rounded-2xl p-3.5 flex items-center gap-3">
            <span className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-[16px]">🎁</span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[12px]">Mes invitations • {myInvitations.length} invités</p>
              <p className="text-[10px] text-gray-500">✅ {invitesAcceptes} acceptés • ⏳ {invitesEnAttente} en attente • Voir mes filleuls →</p>
            </div>
            <span className="text-[18px]">›</span>
          </Link>
        )}

        {/* 3. MES FILLEULS - Leurs boutiques en avant */}
        {filleuls.length>0 && selectedCat==="all" && !debounced && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="font-black text-[12px]">🏬 Boutiques que j'ai invitées</p>
              <Link href="/mes-invitations" className="text-[10px] font-bold underline">Tout voir →</Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filleuls.slice(0,8).map((f:any)=>(
                <Link key={f.code} href={`/boutiques/${f.wa}`} className="shrink-0 w-[140px] bg-white border rounded-2xl p-3 block">
                  <p className="font-black text-[11px] truncate">{f.invite_nom||"Filleul"}</p>
                  <p className="text-[9px] text-gray-500 truncate">{f.type==="boutique" ? "🏬 Boutique" : "🛍️ Client"} • {f.annoncesCount} annonce(s)</p>
                  <p className="text-[9px] mt-1 font-bold text-green-600">✅ Acceptée</p>
                  <p className="text-[9px] mt-1 bg-black text-white text-center py-1.5 rounded-full font-black">Voir boutique →</p>
                </Link>
              ))}
              <Link href="/inviter" className="shrink-0 w-[140px] bg-black text-white rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-[22px]">+</span><span className="font-black text-[11px] mt-1">Inviter<br/>une boutique</span>
              </Link>
            </div>
          </div>
        )}

        {notifCount > 0 ? (
          <Link href="/notifications" className="w-full bg-black text-white rounded-2xl p-3.5 flex justify-between items-center">
            <span className="font-black text-[11px]">🔔 {notifCount} notification(s)</span>
            <span className="bg-white text-black px-3 py-1 rounded-full text-[10px] font-black">Voir →</span>
          </Link>
        ) : null}

        <div className="flex justify-between items-center">
          <p className="font-black text-[11px]">{filtered.length} annonce(s){boostedCount > 0 ? " • 🔥 " + boostedCount + " boostés" : ""} • {prixMoyen}$ moyen</p>
          <Link href="/recherche" className="text-[10px] text-black font-bold border px-3 py-1 rounded-full bg-white">Recherche →</Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-2 text-center py-8 bg-white border-2 border-dashed rounded-2xl">
              <p className="text-4xl">📦</p>
              <p className="text-[13px] font-black mt-3">Aucune annonce</p>
              <p className="text-[11px] text-gray-500 mt-1 px-4">Publie ta première annonce ou invite une boutique pour remplir Wenze.</p>
              <div className="flex gap-2 justify-center mt-4">
                <Link href={"/publier?cat=" + (selectedCat === "all" ? "commerces-services" : selectedCat)} className="bg-black text-white px-5 py-3 rounded-full font-black text-[11px]">+ Publier</Link>
                <Link href="/inviter" className="bg-white border-2 border-black px-5 py-3 rounded-full font-black text-[11px]">🎁 Inviter une boutique</Link>
              </div>
              {myInvitations.length>0 && <Link href="/mes-invitations" className="block text-[10px] mt-3 underline">Voir mes {myInvitations.length} invitations →</Link>}
            </div>
          ) : (
            filtered.map((a) => (
              <AnnonceCard
                key={a.id}
                a={a}
                icon={(getCategorieById(a.categorieId) as any)?.icon || "🏬"}
                onMedia={(x: any) => (x.isVideo ? openVideoPage(x) : setSelectedImage(x))}
                onOpen={(x: any) => (x.isVideo ? openVideoPage(x) : openProduit(x))}
                onCart={addPanier}
              />
            ))
          )}
        </div>

        {/* 4. BAS DE PAGE - Inviter toujours visible, sans spammer */}
        {filtered.length>0 && (
          <div className="bg-white border rounded-2xl p-4 flex items-center gap-3 mt-2">
            <span className="text-[22px]">🎁</span>
            <div className="flex-1"><p className="font-black text-[12px]">Connais-tu une boutique à Kinshasa ?</p><p className="text-[10px] text-gray-500">Invite-la, elle crée son compte en 1 minute.</p></div>
            <Link href="/inviter" className="bg-black text-white px-4 py-2 rounded-full font-black text-[11px] whitespace-nowrap">Inviter →</Link>
          </div>
        )}
      </div>

      <BottomNav notifCount={notifCount} />

      {selectedImage ? (
        <ImageViewer
          a={selectedImage}
          onClose={() => setSelectedImage(null)}
          onOpen={(x: any) => { setSelectedImage(null); openProduit(x); }}
          onCart={addPanier}
        />
      ) : null}
    </div>
  );
}
