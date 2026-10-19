// lib/geo/gratuit.ts - 100% gratuit navigateur

export const getPositionGratuite = (): Promise<{lat:number,lng:number,commune:string}> => {
  return new Promise((resolve, reject)=>{
    if(!navigator.geolocation) reject("Geoloc non supportée");
    
    navigator.geolocation.getCurrentPosition(
      pos=>{
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          commune: detectCommune(pos.coords.latitude, pos.coords.longitude) // voir ci-dessous
        });
      },
      err=>reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

// Détection commune Kinshasa gratuite - sans API Google payante
const detectCommune = (lat:number, lng:number): string => {
  // Coordonnées approximatives Kinshasa - calcul distance simple
  // Pas besoin API payante, calcul local
  // Tu peux affiner avec bounding boxes
  if(lat > -4.30 && lat < -4.28 && lng > 15.30) return "Gombe";
  if(lat > -4.32 && lng < 15.32) return "Lingwala";
  // ... ajoute autres communes - ou retourne "Kinshasa"
  return "Kinshasa";
};

export const calculerDistance = (lat1:number,lng1:number,lat2:number,lng2:number): number => {
  // Formule Haversine gratuite - pas d'API
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); // km
};

export const filtrerParDistance = (annonces:any[], userPos:any, distanceMax:string) => {
  const maxKm = distanceMax==="500m" ? 0.5 : distanceMax==="1km" ? 1 : 5;
  return annonces.filter(a=>{
    if(!a.lat || !a.lng) return true; // si pas de pos, on montre
    const d = calculerDistance(userPos.lat, userPos.lng, a.lat, a.lng);
    return d <= maxKm;
  });
};
