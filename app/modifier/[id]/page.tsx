"use client";
import { useParams, useRouter } from "next/navigation";

export default function ModifierPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    try {
      const id = params?.id;
      if (!id) return;

      const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
      const annonce = annonces.find((a:any) => String(a.id) === String(id));
      
      if (!annonce) { router.push("/profil"); return; }

      // ✅ FIX: isOwner a besoin de current
      const saved = localStorage.getItem("wenze_user");
      const current = saved ? JSON.parse(saved) : null;
      
      // ta fonction isOwner du profil
      const clean = (n:string) => (n||"").replace(/[^0-9]/g,"");
      const isOwnerCheck = (ann: any, cur: any) => {
        if (!cur || !ann) return false;
        const c = clean(cur.whatsapp || cur.ownerWhatsapp || "");
        const a = clean(ann.ownerWhatsapp || ann.whatsapp || "");
        return c && a && c === a;
      };

      if (!isOwnerCheck(annonce, current)) {
        alert(`⛔ Sécurité WENZE: Cette annonce appartient à ${annonce.user} (${annonce.ownerWhatsapp}). Toi tu es ${current?.nom} (${current?.whatsapp}).`);
        router.push("/");
        return;
      }
      
      // Si owner OK
      setForm(annonce);
    } catch (e) {
      console.log(e);
      router.push("/profil");
    }
  }, [params?.id, router]); // ✅ FIX: deps obligatoires
}
