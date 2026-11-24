// lib/sauvegarde.ts
export async function exporterSauvegarde(supabase: any) {
  if (!supabase || typeof document === "undefined") {
    throw new Error("Export JSON indisponible dans ce contexte.");
  }

  const tables = [
    "membres",
    "boutiques",
    "clients",
    "paiements",
    "annonces",
    "wenze_journal",
    "config_publique",
  ];

  const data: Record<string, any> = {
    date: new Date().toISOString(),
    version: "WENZE-DG-v1",
  };

  for (const t of tables) {
    const { data: rows, error } = await supabase.from(t).select("*");
    if (error) {
      throw new Error(`Erreur export table ${t}: ${error.message}`);
    }
    data[t] = rows || [];
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wenze-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  return { date: data.date, tables };
                      }
