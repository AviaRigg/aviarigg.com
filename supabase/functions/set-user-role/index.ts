import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  =
  Deno.env.get('SERVICE_ROLE_KEY') ||
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const VALID_ROLES  = ['user', 'buyer', 'admin'];

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

    const { targetUserId, role } = await req.json();
    if (!targetUserId || !role || !VALID_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), { status: 400, headers: corsHeaders });
    }

    const adminSb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user }, error: userErr } = await adminSb.auth.getUser(token);
    if (userErr || !user) {
      console.error('getUser error:', userErr);
      return new Response(JSON.stringify({ error: 'Invalid token', detail: userErr?.message }), { status: 401, headers: corsHeaders });
    }

    const { data: callerProfile } = await adminSb.from('profiles').select('role').eq('id', user.id).single();
    if (callerProfile?.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });

    if (targetUserId === user.id && role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Cannot demote yourself' }), { status: 400, headers: corsHeaders });
    }

    const { error: updateErr } = await adminSb.from('profiles').update({ role }).eq('id', targetUserId);
    if (updateErr) return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500, headers: corsHeaders });

    return new Response(JSON.stringify({ success: true, role }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});