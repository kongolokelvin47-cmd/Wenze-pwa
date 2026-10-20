// lib/securite.ts - SÉCURITÉ WENZE
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem("wenze_user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const cleanWhatsapp = (num: string) => (num || "").toString().replace(/[^0-9]/g, "");

export const isOwner = (annonce: any) => {
  const current = getCurrentUser();
  if (!current) return false;
  const currentClean = cleanWhatsapp(current.whatsapp || current.telephone);
  const annonceClean = cleanWhatsapp(annonce.whatsapp || annonce.ownerWhatsapp || annonce.telephone);
  const sameWhatsapp = currentClean && annonceClean && currentClean === annonceClean;
  const sameId = current.id && annonce.userId && current.id === annonce.userId;
  // Sécurité double: id OU whatsapp doit matcher
  return sameWhatsapp || sameId;
}

export const canDelete = (annonce: any) => isOwner(annonce);
export const canEdit = (annonce: any) => isOwner(annonce);
export const canPublish = () => !!getCurrentUser();
