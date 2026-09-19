import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// À utiliser UNIQUEMENT dans du code serveur qui n'a pas de session
// utilisateur (webhooks, tâches planifiées) : la clé service_role
// contourne toutes les RLS. Ne jamais l'exposer au navigateur, ne jamais
// préfixer sa variable d'env par NEXT_PUBLIC_.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
