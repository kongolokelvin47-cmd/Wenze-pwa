"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getInvitation, acceptInvitation } from "@/lib/invitations";
import { supabase } from "@/lib/supabase";

export default function InvitationPage(){
  const params = useParams();
  const code = decodeURIComponent((params?.code as string)||"");
  const router = useRouter();
  const [inv, setInv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState("");
  const [nomBoutique, setNomBoutique] = useState("");
  const [marque, setMarque] = useState("");
  const [commune, setCommune] = useState("Gombe");
  const [wa, setWa] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(()=>{
    getInvitation(code).then(d=>{ setInv(d); if(d){ setNom(d.invite_nom||""); setWa(d.invite_wa||""); } setLoading(false); });
  },[code]);

  const handleCreate = async ()=>{
    try{
      if(!nom.trim() || !wa.trim()){ setMsg("⛔ Nom + WhatsApp obligatoires"); return; }
      if(inv?.type==="boutique" && !nomBoutique.trim()){ setMsg("⛔ Nom de boutique obligatoire"); return; }
      const clean = wa.replace(/[^0-9]/g,"").replace(/^0+/,"");
      const full = clean.length<=9 ? "243"+clean : clean.startsWith("243")?clean:"243"+clean.slice(-9);
      const user = {
        id: full, whatsapp: full, ownerWhatsapp: full,
        name: nom, nomBoutique: inv?.type==="boutique" ? `Boutiques ${nomBoutique} (${marque||"Commerce général"})` : nom,
        boutiqueName: inv?.type==="boutique" ? `Boutiques ${nomBoutique} (${marque||"Commerce général"})` : "",
        marque: marque||"Commerce général", commune, ville:"Kinshasa",
        categorieId:"commerces-services", type: inv?.type||"boutique",
        parrainWa: inv?.parrain_wa||"", parrainNom: inv?.parrain_nom||"",
        inviteCode: code, createdAt: new Date().toISOString(),
      };
      localStorage.setItem("wenze_user", JSON.stringify(user));
      const all = JSON.parse(localStorage.getItem("wenze_all_users")||"[]");
      if(!all.find((x:any)=> (x.whatsapp||"").toString().replace(/[^0-9]/g,"")===full)) all.push(user);
      localStorage.setItem("wenze_all_users", JSON.stringify(all));
      // Cloud aussi
      if(supabase){
        await supabase.from("boutiques").upsert({ whatsapp: full, nom_boutique: user.nomBoutique, marque: user.marque, commune, ville:"Kinshasa", categorie_id:"commerces-services" });
      }
      await acceptInvitation(code);
      setMsg("✅ Compte créé ! Redirection...");
      setTimeout(()=> router.push(inv?.type==="boutique" ? "/publier" : "/"), 1200);
    }catch(e:any){ setMsg("❌ "+e.message); }
  };

  if(loading) return <div className="max-w-[430px] mx-auto p-6 text-center font-black">Chargement invitation...</div>;
  if(!inv) return <div className="max-w-[430px] mx-auto p-6 text-center"><div className="bg-white border rounded-[20px] p-8"><p className="text-3xl">😕</p><p className="font-black mt-2">Invitation introuvable</p><p className="text-[11px] text-gray-500 mt-1">Code: {code}</p><Link href="/" className="mt-4 block bg-black text-white py-3 rounded-full font-black text-[11px]">Aller sur Wenze</Link></div></div>;

  const isBoutique = inv.type==="boutique";
  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-4">
      <div className="bg-black text-white rounded-[20px] p-4 text-center">
        <p className="text-3xl">🎁</p><p className="font-black text-[16px] mt-1">Tu es invité(e) !</p>
        <p className="text-[11px] mt-1"><b>{inv.parrain_nom}</b> t'invite à créer {isBoutique ? "ta boutique" : "ton compte client"} sur <b>WENZE WENZE BUSINESS</b></p>
        <p className="text-[10px] mt-2 bg-white/20 inline-block px-3 py-1 rounded-full">Code: {inv.code} • {inv.statut==="accepte" ? "Déjà acceptée" : "En attente"}</p>
      </div>

      <div className="bg-white border-2 border-black rounded-[20px] p-4 mt-3">
        <p className="font-black text-[13px] mb-3">{isBoutique ? "🏬 Crée ta boutique" : "🛍️ Crée ton compte client"}</p>
        <label className="text-[11px] font-black">Ton nom complet</label>
        <input value={nom} onChange={e=>setNom(e.target.value)} className="w-full border-2 rounded-full px-4 py-3 text-[13px] mt-1 mb-3 outline-none" placeholder="Ex: Brigitte Mbuyi" />
        {isBoutique && (<>
          <label className="text-[11px] font-black">Nom de ta boutique</label>
          <input value={nomBoutique} onChange={e=>setNomBoutique(e.target.value)} className="w-full border-2 rounded-full px-4 py-3 text-[13px] mt-1 mb-3 outline-none" placeholder="Ex: Bilamba" />
          <label className="text-[11px] font-black">Marque / Activité (ex: Pagnes, Pagne, Cosmétiques)</label>
          <input value={marque} onChange={e=>setMarque(e.target.value)} className="w-full border-2 rounded-full px-4 py-3 text-[13px] mt-1 mb-3 outline-none" placeholder="Ex: Maison d'habillement" />
        </>)}
        <label className="text-[11px] font-black">Commune</label>
        <input value={commune} onChange={e=>setCommune(e.target.value)} className="w-full border-2 rounded-full px-4 py-3 text-[13px] mt-1 mb-3 outline-none" />
        <label className="text-[11px] font-black">WhatsApp</label>
        <input value={wa} onChange={e=>setWa(e.target.value)} className="w-full border-2 rounded-full px-4 py-3 text-[13px] mt-1 mb-4 outline-none" placeholder="0825..." />
        <button onClick={handleCreate} className="w-full bg-black text-white py-4 rounded-full font-black text-[13px]">{isBoutique ? "🏬 Créer ma boutique →" : "🛍️ Créer mon compte →"}</button>
        {msg && <p className="text-[11px] font-bold text-center mt-3">{msg}</p>}
        <p className="text-[10px] text-gray-500 text-center mt-2">Gratuit • 1 minute • Ton parrain: {inv.parrain_nom}</p>
      </div>
    </div>
  );
                                                                 }
