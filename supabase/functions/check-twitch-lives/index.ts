// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore
declare const Deno: any;

interface TwitchStream {
  user_login: string;
  title: string;
  viewer_count: number;
  thumbnail_url: string;
  user_id: string;
}

interface TwitchUser {
  id: string;
  login: string;
}

export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const twitchClientId = Deno.env.get('TWITCH_CLIENT_ID') || '';
    const twitchAccessToken = Deno.env.get('TWITCH_ACCESS_TOKEN') || '';

    if (!twitchClientId || !twitchAccessToken) {
      return new Response(
        JSON.stringify({ error: 'Twitch credentials not configured' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all profiles with Twitch channels
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, twitch')
      .not('twitch', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch profiles' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: 'No streamers found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get unique Twitch channel names
    const twitchChannels = [...new Set(profiles.map((p) => p.twitch).filter(Boolean))] as string[];

    if (twitchChannels.length === 0) {
      return new Response(JSON.stringify({ message: 'No Twitch channels to check' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build query string for Twitch API
    const userLogins = twitchChannels.map((ch: string) => `user_login=${encodeURIComponent(ch)}`).join('&');
    const streamsUrl = `https://api.twitch.tv/helix/streams?${userLogins}&first=100`;

    // Fetch streams from Twitch API
    const streamsRes = await fetch(streamsUrl, {
      headers: {
        'Client-ID': twitchClientId,
        'Authorization': `Bearer ${twitchAccessToken}`,
      },
    });

    if (!streamsRes.ok) {
      const error = await streamsRes.text();
      console.error('Twitch API error:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch from Twitch API' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const twitchData = await streamsRes.json();
    const activeStreams: TwitchStream[] = twitchData.data || [];

    // Also fetch users to get their IDs
    const usersUrl = `https://api.twitch.tv/helix/users?${userLogins}&first=100`;
    const usersRes = await fetch(usersUrl, {
      headers: {
        'Client-ID': twitchClientId,
        'Authorization': `Bearer ${twitchAccessToken}`,
      },
    });

    const usersData = usersRes.ok ? await usersRes.json() : { data: [] };
    const twitchUsers: { [key: string]: TwitchUser } = {};
    (usersData.data || []).forEach((user: TwitchUser) => {
      twitchUsers[user.login.toLowerCase()] = user;
    });

    // Check for streams with @m7academy in title
    const validStreams = activeStreams.filter((stream) =>
      stream.title.includes('@m7academy') || stream.title.includes('m7academy')
    );

    // Upsert valid streams into twitch_lives_ativas
    const updates = [];
    for (const stream of validStreams) {
      const userProfile = profiles.find(
        (p) => p.twitch && p.twitch.toLowerCase() === stream.user_login.toLowerCase()
      );

      updates.push({
        user_id: userProfile?.id,
        twitch_channel: stream.user_login,
        stream_title: stream.title,
        viewer_count: stream.viewer_count,
        thumbnail_url: stream.thumbnail_url,
        ao_vivo: true,
        updated_at: new Date().toISOString(),
      });
    }

    if (updates.length > 0) {
      const { error: upsertError } = await supabase
        .from('twitch_lives_ativas')
        .upsert(updates, { onConflict: 'twitch_channel' });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
      }
    }

    // Mark streams not in active list as offline
    const activeChannels = validStreams.map((s) => s.user_login.toLowerCase());
    const { error: updateError } = await supabase
      .from('twitch_lives_ativas')
      .update({ ao_vivo: false })
      .not('twitch_channel', 'in', `(${activeChannels.map((ch) => `'${ch}'`).join(',')})`)
      .eq('ao_vivo', true);

    if (updateError) {
      console.error('Update offline error:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: twitchChannels.length,
        active: validStreams.length,
        streams: validStreams.map((s) => ({ channel: s.user_login, viewers: s.viewer_count })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
