// ══════════════════════════════════════════
//  AviaRigg — Supabase Edge Function
//  Name: send-mass-email
//  Deploy: supabase functions deploy send-mass-email
//
//  Required env var in Supabase project secrets:
//    RESEND_API_KEY = re_ZJdHswrH_4TTWizpCrscEn3eCWUmVL1ZN
//    SUPABASE_URL   = https://bbyiezjvonacajigqoik.supabase.co
//    SUPABASE_SERVICE_ROLE_KEY = <your service role key from Supabase settings>
// ══════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL            = 'AviaRigg <noreply@aviarigg.com>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Verify caller is an admin ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Use service role client to verify admin role
    const adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const userSb  = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSb.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await adminSb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden — admins only' }), { status: 403, headers: corsHeaders });
    }

    // ── 2. Parse request body ──
    const { subject, html } = await req.json();
    if (!subject || !html) {
      return new Response(JSON.stringify({ error: 'subject and html are required' }), { status: 400, headers: corsHeaders });
    }

    // ── 3. Fetch all user emails from profiles ──
    const { data: profiles, error: profilesError } = await adminSb
      .from('profiles')
      .select('id, email, username');

    if (profilesError) throw profilesError;
    if (!profiles?.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No users to email' }), { headers: corsHeaders });
    }

    // Get emails — profiles may store email directly, or we fall back to auth.users
    let recipients: string[] = profiles
      .map(p => p.email)
      .filter(Boolean) as string[];

    // If profiles don't have email column, fetch from auth.users via service role
    if (recipients.length === 0) {
      const { data: authUsers } = await adminSb.auth.admin.listUsers();
      recipients = (authUsers?.users || []).map(u => u.email).filter(Boolean) as string[];
    }

    if (!recipients.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No email addresses found' }), { headers: corsHeaders });
    }

    // ── 4. Send via Resend (batch) ──
    // Resend supports up to 100 recipients per call — chunk if needed
    const CHUNK = 50;
    let sent = 0;
    const errors: string[] = [];

    for (let i = 0; i < recipients.length; i += CHUNK) {
      const chunk = recipients.slice(i, i + CHUNK);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: chunk,
          subject,
          html,
        }),
      });

      if (res.ok) {
        sent += chunk.length;
      } else {
        const err = await res.json();
        errors.push(err.message || 'Unknown Resend error');
        console.error('Resend error:', err);
      }
    }

    return new Response(
      JSON.stringify({ sent, total: recipients.length, errors: errors.length ? errors : undefined }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
