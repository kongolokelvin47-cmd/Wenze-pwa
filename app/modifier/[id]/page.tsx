useEffect(() => {
  const id = params.id;
  const annonces = JSON.parse(localStorage.getItem("wenze_annonces_list") || "[]");
  const annonce = annonces.find((a:any) => String(a.id) === String(id));
  
  if (!annonce) { router.push("/profil"); return; }

  if (!isOwner(annonce)) {
    alert("⛔ Sécurité WENZE: Cette annonce ne t'appartient pas. Redirection.");
    router.push("/");
    return;
  }
  // Si owner, charge le formulaire
  setForm(annonce);
}, []);
