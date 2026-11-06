"use client";
import { useState } from "react";
import Link from "next/link";
import { createInvitation, buildInvitationMessage } from "@/lib/invitations";

const cleanWa = (n:any)=>(n||"").toString().replace(/[^0-9]/g,"").replace(/^0+/,"");

export default function Inviter(){
  const [type, setType] = useState<"boutique"|"client">("boutique");
  const [inviteNom, setInviteNom] = useState("");
  const [inviteWa, setInviteWa] = useState("");
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState("");
  const [code, setCode] = useState("");

  const handleInvite = async ()=>{
    try{
      if(!inviteNom.trim() || !inviteWa.trim()){ setMsg("⛔ Mets nom + numéro WhatsApp"); return; }
      const me = JSON.parse(localStorage.getItem("wenze_user")||"{}");
      const parrainWa = cleanWa(me.ownerWhatsapp||me.whatsapp||me.id||"");
      const parrainNom = me.nomBoutique||me.boutiqueName||me.name||"Un ami Wenze";
      const c = await createInvitation({ type, parrainWa, parrainNom, inviteWa, inviteNom });
      setCode(c);
      const base = window.location.origin;
      const lien = `${base}/invitation/${c}`;
      setLink(lien);
      const text = buildInvitationMessage({ parrainNom, type, code:c, inviteNom });
      const phone = cleanWa(inviteWa);
      const full = phone.length<=9 ? "243"+phone : phone.startsWith("243")?phone:"243"+phone.slice(-9);
      // Ouvre WhatsApp avec le message + lien
      window.open(`https://wa.me/${full}?text=${encodeURIComponent(text)}`, "_blank");
      setMsg("✅ Invitation créée ! WhatsApp ouvert.");
    }catch(e:any){ setMsg("❌ "+(e.message||e)); }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#FFFBF0] p-4 pb-24">
      <header className="flex items-center gap-3 mb-4"><Link href="/" className="w-9 h-9 bg-white border rounded-full flex items-center justify-center">←</Link><div><h1 className="font-black text-[17px]">Inviter quelqu'un 🎁</h1><p className="text-[10px] text-gray-500">Boutique ou Client • Via WhatsApp</p></div></header>

      <div className="bg-white border-2 border-black rounded-[20px] p-4">
        <p className="font-black text-[12px] mb-2">Il veut créer quoi ?</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={()=>setType("boutique")} className={`py-3 rounded-full font-black text-[12px] border-2 ${type==="boutique"?"bg-black text-white border-black":"bg-white"}`}>🏬 Boutique<br/><span className="text-[9px] font-normal">Pour vendre</span></button>
          <button onClick={()=>setType("client")} className={`py-3 rounded-full font-black text-[12px] border-2 ${type==="client"?"bg-black text-white border-black":"bg-white"}`}>🛍️ Client<br/><span className="text-[9px] font-normal">Pour acheter</span></button>
        </div>
        <label className="text-[11px] font-black">Nom de l'invité</label>
        <input value={inviteNom} onChange={e=>setInviteNom(e.target.value)} placeholder="Ex: Maman Brigitte" className="w-full border-2 rounded-full px-4 py-3 text-[13px] mt-1 mb-3 outline-none focus:border-black" />
        <label className="text-[11px] font-black">Numéro WhatsApp</label>
        <input value={inviteWa} onChange={e=>setInviteWa(e.target.value)} placeholder="Ex: 0825888889" className="w-full border-2 rounded-full px-4 py-3 text-[13px] mt-1 mb-4 outline-none focus:border-black" />
        <button onClick={handleInvite} className="w-full bg-[#25D366] text-white py-4 rounded-full font-black text-[13px]">💬 Envoyer invitation WhatsApp</button>
        {msg && <p className="text-[11px] font-bold text-center mt-3">{msg}</p>}
      </div>

      {link && (
        <div className="bg-black text-white rounded-[20px] p-4 mt-3">
          <p className="font-black text-[12px]">🔗 Lien d'invitation :</p>
          <p className="text-[11px] break-all mt-1 text-green-300">{link}</p>
          <p className="text-[10px] mt-1">Code: <b>{code}</b></p>
          <button onClick={async()=>{ try{ await navigator.clipboard.writeText(link); setMsg("✅ Lien copié !"); }catch{} }} className="w-full mt-3 bg-white text-black py-3 rounded-full font-black text-[11px]">📋 Copier le lien</button>
          <Link href={`/invitation/${code}`} className="block text-center text-[10px] mt-2 underline">Voir ce que l'invité va voir →</Link>
        </div>
      )}

      <div className="bg-[#FFF2CC] rounded-[16px] p-3 mt-3 text-[10px] leading-relaxed">
        <p className="font-black">Comment ça marche ?</p>
        <p>1. Tu mets son nom + numéro<br/>2. WhatsApp s'ouvre avec le message + lien<br/>3. Il clique → il remplit ses détails → sa boutique / compte est créé<br/>4. Tu es son parrain, il apparaît dans tes filleuls.</p>
      </div>
    </div>
  );
}
