"use client";

// lib/invitations.ts - V32 STUB BUILD VERT - Invitations désactivées temporairement pour débloquer 500+ deploys
export type Invitation = {
  id:string; fromWa:string; fromName:string; toWa:string; toName:string;
  token:string; status:"pending"|"confirmed"|"expired"|"cancelled";
  createdAt:string; expireAt:string; confirmedAt?:string; tries?:number;
};

export function createInvitation(){ throw new Error("Invitations désactivées - déploiement en cours"); }
export function getMyInvitations(){ return [] as Invitation[]; }
export function getInvitationByToken(){ return null; }
export function getPendingCount(){ return 0; }
export function getInvitationStats(){ return { total:0, pending:0, confirmed:0, expired:0, restant:20 }; }
export function deleteInvitation(){ return true; }
export function confirmInvitation(){ throw new Error("Invitations désactivées"); }
export function cleanupExpired(){ return [] as Invitation[]; }
