// supabase/functions/redeem-key/index.ts
// Deploy with: supabase functions deploy redeem-key

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Parse body ──
    const { key } = await req.json()
    if (!key || typeof key !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing key' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── 2. Get calling user from JWT ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // User client — to verify the JWT and get their ID
    const userSb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userErr } = await userSb.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── 3. Service role client — bypasses RLS ──
    const adminSb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── 4. Check the key ──
    const { data: keyRow, error: keyErr } = await adminSb
      .from('license_keys')
      .select('key, redeemed, redeemed_by')
      .eq('key', key.trim().toUpperCase())
      .single()

    if (keyErr || !keyRow) {
      return new Response(JSON.stringify({ error: 'key_not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (keyRow.redeemed) {
      const isSelf = keyRow.redeemed_by === user.id
      return new Response(JSON.stringify({
        error: isSelf ? 'already_redeemed_self' : 'already_redeemed'
      }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── 5. Check user isn't already a buyer/admin ──
    const { data: profile } = await adminSb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'buyer' || profile?.role === 'admin') {
      return new Response(JSON.stringify({ error: 'already_buyer' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── 6. Mark key as redeemed (atomic — only if still unredeemed) ──
    const { error: markErr, count } = await adminSb
      .from('license_keys')
      .update({
        redeemed: true,
        redeemed_by: user.id,
        redeemed_at: new Date().toISOString()
      })
      .eq('key', key.trim().toUpperCase())
      .eq('redeemed', false) // race condition guard

    if (markErr || count === 0) {
      return new Response(JSON.stringify({ error: 'already_redeemed' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── 7. Upgrade role to buyer ──
    const { error: roleErr } = await adminSb
      .from('profiles')
      .update({ role: 'buyer' })
      .eq('id', user.id)

    if (roleErr) {
      // Key is marked used — log this but don't leave user stuck
      console.error('Role upgrade failed for', user.id, roleErr)
      return new Response(JSON.stringify({ error: 'role_upgrade_failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── 8. Success ──
    return new Response(JSON.stringify({ success: true, role: 'buyer' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('redeem-key error:', err)
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})