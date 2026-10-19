// Dans publier/page.tsx - Bouton IA seulement si Pro/Grossiste

const [descriptionIA, setDescriptionIA] = useState("");
const [loadingIA, setLoadingIA] = useState(false);

const handleAideIA = async () => {
  const user = JSON.parse(localStorage.getItem("wenze_user")||"{}");
  if(user.type==="client" || user.type==="freemium"){
    alert("🔒 IA réservée aux abonnés Pro 5$ / 11 500 CDF et Grossiste 25$ / 57 500 CDF. Passez Pro pour utiliser IA gratuite.");
    return;
  }

  setLoadingIA(true);
  try{
    // 1. Comprendre image (gratuit)
    const caption = await comprendreImage(photo);
    // 2. Améliorer image (gratuit navigateur)
    const photoAmelioree = await ameliorerImage(photo);
    setPhoto(photoAmelioree);
    // 3. Générer description vente (gratuit Groq)
    const desc = await genererDescriptionVente(form.titre, caption, "fr");
    setDescriptionIA(desc);
    setForm({...form, description: desc});
  }catch(e:any){
    alert(e.message);
  }
  setLoadingIA(false);
};

// Dans JSX:
{(user.type==="pro" || user.type==="grossiste") && (
  <button onClick={handleAideIA} disabled={loadingIA} className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white p-3 rounded-xl text-sm font-bold">
    {loadingIA ? "🤖 IA analyse image..." : "🤖 IA Gratuite: Améliorer image + Générer description vente"}
  </button>
)}
