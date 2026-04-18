import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { salaId, updates } = await req.json();

    if (!salaId || !updates) {
      return new Response(
        JSON.stringify({ error: 'Missing salaId or updates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // @ts-ignore - Deno runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    // @ts-ignore - Deno runtime
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('salas')
      .update(updates)
      .eq('id', salaId)
      .select();

    if (error) {
      console.error('[update-sala-team] Error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[update-sala-team] Updated sala:', salaId, 'with', updates);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[update-sala-team] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};
