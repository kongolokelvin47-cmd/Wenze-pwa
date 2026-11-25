"use client";

import { useState, useEffect, useRef, useMemo, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { lireSession, cle9 } from "@/lib/connexion";
import {
  CATEGORIES_WENZE,
  getCategorieById,
  normalizeCategorie,
} from "@/lib/categories";
import {
  TAUX_CDF,
  FREEMIUM,
  MAX_ANNONCES_ACTIVES,
  toCDFString,
  usd,
  isCompteCache,
  checkFreemiumWenze,
} from "@/lib/paiement";

export const dynamic = "force-dynamic";

const PLAFOND_ACTIVES = Math.min(50, Number(MAX_ANNONCES_ACTIVES || 50));
const MAX_FREE_IMAGES = Math.min(3, Number(FREEMIUM?.maxImages || 3));
const FREE_DAYS = Number(FREEMIUM?.dureeJours || 30);

const safeParse = (k: string) => {
  try {
    if (typeof window === "undefined") return [];
    const r = localStorage.getItem(k);
    const p = r ? JSON.parse(r) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
};

function isAnnonceVisibleVideo(a: any): boolean {
  if (
    !a ||
    a.is_visible === false ||
    a.statut === "masque" ||
    a.statut === "expire"
  ) {
    return false;
  }
  if (a.isFreemium || a.plan === "GRATUIT" || a.palier === "GRATUIT") {
    const baseTime = new Date(
      a.createdAt || a.created_at || a.updatedAt || 0
    ).getTime();
    if (baseTime > 0) {
      const ageJours = (Date.now() - baseTime) / (1000 * 60 * 60 * 24);
      const maxJours = Number(a.dureeJours || FREE_DAYS || 30);
      if (ageJours > maxJours) return false;
    }
  }
  return true;
}

function lireConfigPublique(): Record<string, any> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem("wenze_config_publique");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function tracerVideoJournal(
  action: "VIDEO_CONTACT_WA" | "VIDEO_OUVERTE",
  acteurWa: string,
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
      acteurWhatsapp: acteurWa,
      detail: detail || "",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("wenze_journal", JSON.stringify(arr.slice(-500)));
  } catch {}
}

function VideoContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("id");

  const [videos, setVideos] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [mutedMap, setMutedMap] = useState<Record<string, boolean>>({});
  const [pleinEcran, setPleinEcran] = useState<any>(null);
  const [moi, setMoi] = useState<any>(null);
  const [cfgPublique, setCfgPublique] = useState<Record<string, any>>({});

  const videoRefs = useRef>(new Map());
  const pleinRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      setCfgPublique(lireConfigPublique());

      const session: any = lireSession();
      const rawUser = localStorage.getItem("wenze_user");
      const currentUser =
        session ||
        (() => {
          try {
            return rawUser ? JSON.parse(rawUser) : null;
          } catch {
            return null;
          }
        })();
      setMoi(currentUser);

      const list = safeParse("wenze_annonces_list");
      const allUsers = safeParse("wenze_all_users");
      const usersMap = new Map<string, any>();

      for (const u of allUsers) {
        const wa = cle9(u?.ownerWhatsapp || u?.whatsapp || u?.telephone || "");
        if (wa) usersMap.set(wa, u);
      }
      if (currentUser) {
        const curWa = cle9(
          currentUser?.ownerWhatsapp ||
            currentUser?.whatsapp ||
            currentUser?.telephone ||
            ""
        );
        if (curWa) usersMap.set(curWa, currentUser);
      }

      const vids = list
        .filter((a: any) => isAnnonceVisibleVideo(a))
        .filter((a: any) => {
          const wa = cle9(a?.ownerWhatsapp || a?.whatsapp || a?.userId || "");
          const vendeur = usersMap.get(wa);
          try {
            if (
              vendeur &&
              typeof isCompteCache === "function" &&
              isCompteCache(vendeur)
            ) {
              return false;
            }
          } catch {}

          const firstImg = Array.isArray(a?.images) ? a.images[0] : "";
          const hasVideo = Boolean(
            a?.isVideo ||
              a?.videoUrl ||
              (typeof a?.photo === "string" && a.photo.startsWith("data:video")) ||
              (typeof firstImg === "string" && firstImg.startsWith("data:video"))
          );
          if (!hasVideo) return false;

          if (vendeur) {
            try {
              const ab = checkFreemiumWenze && checkFreemiumWenze(vendeur, 0);
              if (ab && !ab.isPaye) return false;
            } catch {}
          }
          return true;
        })
        .map((a: any) => {
          const wa = cle9(a?.ownerWhatsapp || a?.whatsapp || a?.userId || "");
          const vendeur = usersMap.get(wa);
          const cat: any = getCategorieById(
            normalizeCategorie(a?.categorieId || a?.categorie || "commerces-services")
          );

          let ab: any = null;
          try {
            ab = vendeur
              ? checkFreemiumWenze && checkFreemiumWenze(vendeur, 0)
              : null;
          } catch {}

          const palierId = ab?.palierId || "ACTIF";
          const videoSec =
            palierId === "PREMIUM" ? 60 : palierId === "PRO" ? 30 : 15;

          const firstImg = Array.isArray(a?.images)
            ? a.images[0]
            : undefined;
          const src =
            a?.videoUrl ||
            (typeof a?.photo === "string" && a.photo.startsWith("data:video")
              ? a.photo
              : null) ||
            (typeof firstImg === "string" && firstImg.startsWith("data:video")
              ? firstImg
              : null) ||
            a?.photo ||
            firstImg ||
            "";

          const prixDetailUSD = Number(a?.prixUSD ?? a?.prix ?? 0);
          const prixGrosUSD = Number(a?.prixGrosUSD ?? a?.prixGros ?? 0);

          return {
            ...a,
            _wa: wa,
            _cat: cat,
            _prixDetailUSD: prixDetailUSD,
            _prixGrosUSD: prixGrosUSD,
            _isGros: a?.typeAnnonce === "gros",
            _vendeurNom:
              vendeur?.nomEtablissement ||
              vendeur?.nomBoutique ||
              a?.ownerName ||
              "Boutique",
            _palier: palierId,
            _videoSec: videoSec,
            _src: src,
          };
        })
        .slice(0, PLAFOND_ACTIVES);

      setVideos(vids);

      if (focusId) {
        const found = vids.find(
          (x: any) => String(x.id || x.annonceId) === String(focusId)
        );
        if (found) {
          setPleinEcran(found);
        } else {
          const el = document.getElementById(`vid-${focusId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    } catch {
      setVideos([]);
    }
  }, [focusId]);

  const monRole = String(moi?.role || "client").toLowerCase();
  const jeSuisDG =
    moi?.roleAdmin === "dg" ||
    monRole === "dg" ||
    Boolean(moi?.dgSessionActive);
  const jePeuxVoirGros = monRole === "grossiste" || jeSuisDG;

  const getPrixVideoUSD = useCallback(
    (v: any): number => {
      if (v?._isGros && jePeuxVoirGros && Number(v?._prixGrosUSD || 0) > 0) {
        return Number(v._prixGrosUSD);
      }
      return Number(v?._prixDetailUSD || 0);
    },
    [jePeuxVoirGros]
  );

  const filtered = useMemo(() => {
    let f = videos;
    if (filter !== "all") {
      f = f.filter(
        (v: any) => normalizeCategorie(v.categorieId || v.categorie || "") === filter
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      f = f.filter(
        (v: any) =>
          String(v.titre || v.title || "")
            .toLowerCase()
            .includes(q) ||
          String(v.commune || "")
            .toLowerCase()
            .includes(q) ||
          String(v._vendeurNom || "")
            .toLowerCase()
            .includes(q)
      );
    }
    return f;
  }, [videos, filter, search]);

  const getIndexPlein = useCallback(
    () =>
      filtered.findIndex(
        (v: any) => String(v.id || v.annonceId) === String(pleinEcran?.id || pleinEcran?.annonceId)
      ),
    [filtered, pleinEcran]
  );

  const videoSuivante = useCallback(() => {
    const i = getIndexPlein();
    if (i >= 0 && i < filtered.length - 1) setPleinEcran(filtered[i + 1]);
  }, [getIndexPlein, filtered]);

  const videoPrecedente = useCallback(() => {
    const i = getIndexPlein();
    if (i > 0) setPleinEcran(filtered[i - 1]);
  }, [getIndexPlein, filtered]);

  useEffect(() => {
    if (!pleinEcran) return;
    document.body.style.overflow = "hidden";
    tracerVideoJournal(
      "VIDEO_OUVERTE",
      cle9(moi?.ownerWhatsapp || moi?.whatsapp || ""),
      String(pleinEcran.id || "")
    );
    const t = setTimeout(() => {
      pleinRef.current?.play().catch(() => {});
    }, 100);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPleinEcran(null);
      if (e.key === "ArrowDown") videoSuivante();
      if (e.key === "ArrowUp") videoPrecedente();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [pleinEcran, videoSuivante, videoPrecedente, moi]);

  const handlePlay = (id: string) => {
    const vid = videoRefs.current.get(id);
    if (!vid) return;
    if (playing && playing !== id) {
      const prev = videoRefs.current.get(playing);
      if (prev) prev.pause();
    }
    if (vid.paused) {
      vid.muted = mutedMap[id] ?? false;
      vid.play().catch(() => {});
      setPlaying(id);
    } else {
      vid.pause();
      setPlaying(null);
    }
  };

  const toggleMute = (id: string, e: any) => {
    e.stopPropagation();
    setMutedMap((prev) => {
      const newVal = !prev[id];
      const vid = videoRefs.current.get(id);
      if (vid) vid.muted = newVal;
      return { ...prev, [id]: newVal };
    });
  };

  const ouvrirPleinEcran = (v: any) => {
    if (playing) {
      const prev = videoRefs.current.get(playing);
      if (prev) prev.pause();
      setPlaying(null);
    }
    setPleinEcran(v);
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-black pb-24">
      <header className="sticky top-0 bg-black/90 backdrop-blur z-20 p-3 border-b border-white/10 flex items-center gap-2">
        <Link
          href="/"
          className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-black shrink-0"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-white text-[13px] truncate">
            {cfgPublique?.titreVideo || "Wenze Wenze Vidéo 🎬"}
          </h1>
          <p className="text-[8px] text-white/60 leading-[10px] mt-0.5 truncate">
            Kinshasa • 0 % commission • Taux {TAUX_CDF} CDF/$ • Max{" "}
            {PLAFOND_ACTIVES} actives
          </p>
        </div>
        <Link
          href="/tarif"
          className="text-[10px] bg-white text-black px-3 py-1.5 rounded-full font-bold shrink-0"
        >
          Tarifs
        </Link>
      </header>

      <div className="p-3 bg-black space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher vidéo, commune, boutique..."
              className="w-full bg-white/10 border border-white/20 rounded-full pl-9 pr-4 py-2.5 text-[12px] text-white placeholder-white/50 focus:ring-2 focus:ring-white outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
              🔍
            </span>
          </div>
          <Link
            href="/publier"
            className="bg-white text-black px-4 py-2.5 rounded-full font-black text-[11px] flex items-center shrink-0"
          >
            + Publier
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-bold border transition ${
              filter === "all"
                ? "bg-white text-black border-white"
                : "bg-white/10 text-white border-white/20"
            }`}
          >
            Tous • {filtered.length}
          </button>
          {CATEGORIES_WENZE.map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-bold border transition flex items-center gap-1 ${
                filter === c.id
                  ? "bg-white text-black border-white"
                  : "bg-white/10 text-white border-white/20"
              }`}
            >
              {c.icon} {c.titreCourt}
            </button>
          ))}
        </div>

        <div className="bg-white/10 border border-white/20 rounded-xl p-2.5 text-[9px] text-white/75 leading-[13px]">
          <b className="text-white">0 % commission</b> • Freemium :{" "}
          <b>
            {MAX_FREE_IMAGES} images max / {FREE_DAYS} jours
          </b>{" "}
          puis <b>is_visible = false</b> • Max <b>{PLAFOND_ACTIVES}</b>{" "}
          annonces actives • Taux {TAUX_CDF} CDF/$ • Min {usd(1)} (
          {toCDFString(1)}).
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl">🎬</p>
            <p className="font-black text-white text-[14px] mt-3">
              Aucune vidéo disponible
            </p>
            <p className="text-[11px] text-white/50 mt-2 max-w-[280px] mx-auto">
              0 % commission • Taux {TAUX_CDF} CDF/$ • Max {PLAFOND_ACTIVES}{" "}
              actives.
            </p>
            <Link
              href="/publier"
              className="mt-5 inline-block bg-white text-black px-6 py-3 rounded-full font-black text-[12px]"
            >
              Publier une vidéo
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((v: any) => {
              const vidId = String(v.id || v.annonceId);
              const isPlaying = playing === vidId;
              const isMuted = mutedMap[vidId] ?? false;
              const prixUSD = getPrixVideoUSD(v);
              const isVideoSrc = Boolean(
                v._src &&
                  (v._src.startsWith("data:video") ||
                    (v._src.startsWith("http") &&
                      (v.videoUrl ||
                        v.photo?.startsWith("data:video") ||
                        v.images?.[0]?.startsWith("data:video"))))
              );

              return (
                <div
                  key={vidId}
                  id={`vid-${vidId}`}
                  className="bg-white rounded-[20px] overflow-hidden border-2 border-white/10"
                >
                  <div
                    className="relative bg-black aspect-[9/14] flex items-center justify-center group cursor-pointer"
                    onClick={() => ouvrirPleinEcran(v)}
                  >
                    {isVideoSrc ? (
                      <video
                        ref={(el) => {
                          if (el) videoRefs.current.set(vidId, el);
                        }}
                        src={v._src}
                        className="w-full h-full object-contain"
                        loop
                        playsInline
                        muted={isMuted}
                        controls={false}
                      />
                    ) : (
                      <img
                        src={v.photo || v.images?.[0]}
                        alt={v.titre || v.title || "Vidéo"}
                        className="w-full h-full object-cover"
                      />
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlay(vidId);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/20"
                    >
                      <span
                        className={`w-16 h-16 bg-white/90 rounded-full flex items-center justify-center text-2xl font-black transition ${
                          isPlaying
                            ? "opacity-0 group-hover:opacity-100"
                            : "opacity-100"
                        }`}
                      >
                        {isPlaying ? "⏸️" : "▶️"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => toggleMute(vidId, e)}
                      className="absolute bottom-20 right-3 w-9 h-9 bg-black/70 rounded-full flex items-center justify-center text-white text-[16px] border border-white/30 z-10"
                    >
                      {isMuted ? "🔇" : "🔊"}
                    </button>

                    <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                      <span className="bg-black/75 text-white text-[9px] px-2.5 py-1 rounded-full font-bold">
                        {v._cat?.icon} {v._cat?.titreCourt}
                      </span>
                      <span className="bg-white text-black text-[9px] px-2.5 py-1 rounded-full font-bold">
                        {v._vendeurNom} • {v._videoSec}s
                      </span>
                    </div>

                    {prixUSD > 0 ? (
                      <div className="absolute top-3 right-3 bg-black text-white text-[9px] px-2.5 py-1 rounded-full font-bold">
                        {usd(prixUSD)} / {toCDFString(prixUSD)}
                      </div>
                    ) : null}

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pointer-events-none">
                      <p className="font-black text-white text-[13px]">
                        {v.titre || v.title}
                      </p>
                      <p className="text-[11px] text-white/75 mt-1">
                        {v.commune || "Kinshasa"} • {v._vendeurNom} •{" "}
                        {v._palier} • {v._videoSec}s
                      </p>
                    </div>
                  </div>

                  <div className="p-3 flex gap-2">
                    <Link
                      href={`/produit/${encodeURIComponent(vidId)}`}
                      className="flex-1 bg-black text-white rounded-full py-3 text-center font-black text-[11px]"
                    >
                      🛒 Voir •{" "}
                      {prixUSD > 0
                        ? `${usd(prixUSD)} / ${toCDFString(prixUSD)}`
                        : "Sur demande"}
                    </Link>
                    {v._wa ? (
                      <a
                        href={`https://wa.me/${v._wa}?text=${encodeURIComponent(
                          `Bonjour ${v._vendeurNom}, j'ai vu "${
                            v.titre || v.title
                          }" sur Wenze Wenze (0 % commission) : ${
                            prixUSD > 0
                              ? `${usd(prixUSD)} / ${toCDFString(prixUSD)}`
                              : "Sur demande"
                          }`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          tracerVideoJournal(
                            "VIDEO_CONTACT_WA",
                            cle9(moi?.ownerWhatsapp || moi?.whatsapp || ""),
                            vidId
                          )
                        }
                        className="bg-[#25D366] text-white px-5 py-3 rounded-full font-black text-[11px] flex items-center"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pleinEcran ? (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col">
          <div className="flex justify-between items-center p-3 z-10">
            <button
              type="button"
              onClick={() => setPleinEcran(null)}
              className="w-9 h-9 bg-white/20 text-white rounded-full font-black text-[16px]"
            >
              ×
            </button>
            <p className="text-white text-[11px] font-black">
              {getIndexPlein() + 1} / {filtered.length}
            </p>
            <Link
              href="/publier"
              className="bg-white text-black px-3 py-1.5 rounded-full font-black text-[10px]"
            >
              + Publier
            </Link>
          </div>

          <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
            {pleinEcran._src ? (
              <video
                key={pleinEcran.id || pleinEcran.annonceId}
                ref={pleinRef}
                src={pleinEcran._src}
                className="w-full h-full object-contain"
                loop
                playsInline
                autoPlay
                controls={false}
              />
            ) : (
              <img
                src={pleinEcran.photo || pleinEcran.images?.[0]}
                alt={pleinEcran.titre || "Vidéo"}
                className="w-full h-full object-contain"
              />
            )}

            <button
              type="button"
              onClick={() => {
                if (pleinRef.current) {
                  if (pleinRef.current.paused) pleinRef.current.play();
                  else pleinRef.current.pause();
                }
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                ▶️
              </span>
            </button>

            <div className="absolute right-3 bottom-28 flex flex-col gap-3 items-center">
              <button
                type="button"
                onClick={() => {
                  if (pleinRef.current) {
                    pleinRef.current.muted = !pleinRef.current.muted;
                  }
                }}
                className="w-11 h-11 bg-black/60 border border-white/30 rounded-full text-white text-[18px]"
              >
                🔊
              </button>
              {pleinEcran._wa ? (
                <a
                  href={`https://wa.me/${pleinEcran._wa}?text=${encodeURIComponent(
                    `Bonjour ${pleinEcran._vendeurNom}, j'ai vu "${
                      pleinEcran.titre || pleinEcran.title
                    }" sur Wenze Wenze (0 % commission)`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    tracerVideoJournal(
                      "VIDEO_CONTACT_WA",
                      cle9(moi?.ownerWhatsapp || moi?.whatsapp || ""),
                      String(pleinEcran.id || "")
                    )
                  }
                  className="w-11 h-11 bg-[#25D366] rounded-full flex items-center justify-center text-[18px]"
                >
                  💬
                </a>
              ) : null}
              <Link
                href={`/produit/${encodeURIComponent(
                  String(pleinEcran.id || pleinEcran.annonceId)
                )}`}
                className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-[18px]"
              >
                🛒
              </Link>
            </div>

            <div className="absolute left-0 right-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-4 pb-24 pointer-events-none">
              <p className="font-black text-white text-[15px]">
                {pleinEcran.titre || pleinEcran.title}
              </p>
              <p className="text-[11px] text-white/80 mt-1">
                {pleinEcran._vendeurNom} • {pleinEcran.commune || "Kinshasa"} •{" "}
                {pleinEcran._palier} • {pleinEcran._videoSec}s
              </p>
              {getPrixVideoUSD(pleinEcran) > 0 ? (
                <p className="text-[12px] text-white font-black mt-1">
                  {usd(getPrixVideoUSD(pleinEcran))} /{" "}
                  {toCDFString(getPrixVideoUSD(pleinEcran))}
                </p>
              ) : null}
            </div>
          </div>

          <div className="p-3 flex gap-2 bg-black border-t border-white/10">
            <button
              type="button"
              onClick={videoPrecedente}
              disabled={getIndexPlein() <= 0}
              className="flex-1 bg-white/10 text-white py-3 rounded-full font-black text-[12px] disabled:opacity-30"
            >
              ⬆️ Précédente
            </button>
            <Link
              href={`/produit/${encodeURIComponent(
                String(pleinEcran.id || pleinEcran.annonceId)
              )}`}
              className="flex-1 bg-white text-black py-3 rounded-full font-black text-[12px] text-center"
            >
              🛒 Voir produit
            </Link>
            <button
              type="button"
              onClick={videoSuivante}
              disabled={getIndexPlein() >= filtered.length - 1}
              className="flex-1 bg-white/10 text-white py-3 rounded-full font-black text-[12px] disabled:opacity-30"
            >
              Suivante ⬇️
            </button>
          </div>
        </div>
      ) : null}

      <nav className="fixed bottom-0 max-w-[430px] w-full bg-black/95 backdrop-blur border-t border-white/10 flex justify-around py-2.5 text-[10px] z-30">
        <Link
          href="/"
          className="flex flex-col items-center gap-0.5 text-white/50"
        >
          <span className="text-[18px]">🏠</span>Accueil
        </Link>
        <Link
          href="/video"
          className="font-black text-white flex flex-col items-center gap-0.5"
        >
          <span className="text-[18px]">🎬</span>Vidéo
        </Link>
        <Link
          href="/publier"
          className="flex flex-col items-center gap-0.5 text-white/50"
        >
          <span className="text-[18px] bg-white text-black w-7 h-7 rounded-full flex items-center justify-center">
            +
          </span>
          Publier
        </Link>
        <Link
          href="/boutiques"
          className="flex flex-col items-center gap-0.5 text-white/50"
        >
          <span className="text-[18px]">🏪</span>Boutique
        </Link>
        <Link
          href="/panier"
          className="flex flex-col items-center gap-0.5 text-white/50"
        >
          <span className="text-[18px]">🛒</span>Panier
        </Link>
        <Link
          href="/profil"
          className="flex flex-col items-center gap-0.5 text-white/50"
        >
          <span className="text-[18px]">👤</span>Profil
        </Link>
      </nav>
    </div>
  );
}

export default function VideoPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[430px] mx-auto min-h-screen bg-black p-6">
          <div className="h-24 bg-white/10 rounded-2xl animate-pulse" />
        </div>
      }
    >
      <VideoContent />
    </Suspense>
  );
}
                    
