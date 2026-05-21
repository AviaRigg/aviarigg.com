import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!;
const FROM_EMAIL     = 'AviaRigg <noreply@aviarigg.com>';

const SERVICE_KEY =
  Deno.env.get('SERVICE_ROLE_KEY') ||
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const adminSb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user }, error: userErr } = await adminSb.auth.getUser(token);
    if (userErr || !user) {
      console.error('getUser error:', userErr);
      return new Response(JSON.stringify({ error: 'Invalid token', detail: userErr?.message }), { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await adminSb.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });

    const { subject, html } = await req.json();
    if (!subject || !html) return new Response(JSON.stringify({ error: 'Missing subject or html' }), { status: 400, headers: corsHeaders });

    const { data: authUsers } = await adminSb.auth.admin.listUsers({ perPage: 1000 });
    const recipients = (authUsers?.users || []).map(u => u.email).filter(Boolean) as string[];
    if (!recipients.length) return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });

    let sent = 0;
    const errors: string[] = [];
    for (let i = 0; i < recipients.length; i += 50) {
      const chunk = recipients.slice(i, i + 50);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM_EMAIL, to: chunk, subject, html }),
      });
      if (res.ok) { sent += chunk.length; }
      else { const e = await res.json(); errors.push(e.message); console.error('Resend error:', e); }
    }

    return new Response(JSON.stringify({ sent, total: recipients.length, errors: errors.length ? errors : undefined }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});