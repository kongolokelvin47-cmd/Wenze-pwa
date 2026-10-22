import { createBrowserClient } from '@supabase/ssr'

/**
 * WENZE - Client Supabase pour tous les composants 'use client'
 * Utilise @supabase/ssr pour gérer les cookies, sessions, et auth
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase URL ou ANON_KEY manquant dans .env.local')
  }

  return createBrowserClient(url, key)
}
