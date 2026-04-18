'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Tv2, ExternalLink } from 'lucide-react';

interface TwitchLiveStream {
  id: string;
  user_id: string;
  twitch_channel: string;
  stream_title: string;
  viewer_count: number;
  thumbnail_url: string;
  ao_vivo: boolean;
  updated_at: string;
}

interface UserProfile {
  id: string;
  nome: string;
  avatar_url: string;
}

interface TeamInfo {
  id: string;
  nome: string;
  tag: string;
  logo_url?: string;
}

interface StreamCard extends TwitchLiveStream {
  profile?: UserProfile;
  team?: TeamInfo;
}

export default function Streamers() {
  const [streams, setStreams] = useState<StreamCard[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  const fetchStreams = React.useCallback(async () => {
    try {
      // Fetch active streams from sala_streams (manually activated by streamers)
      const { data: salaStreams, error: streamsError } = await supabase
        .from('sala_streams')
        .select('*')
        .eq('ativo', true);

      if (streamsError) throw streamsError;

      if (!salaStreams || salaStreams.length === 0) {
        setStreams([]);
        return;
      }

      // Convert sala_streams to TwitchLiveStream format and fetch user profiles + team info
      const streamCardsPromises = salaStreams.map(async (salaStream: any) => {
        // Create stream object from sala_streams
        const stream: TwitchLiveStream = {
          id: salaStream.id,
          user_id: salaStream.user_id,
          twitch_channel: salaStream.twitch_channel,
          stream_title: 'Transmitindo ao vivo da M7 Academy',
          viewer_count: 0,
          thumbnail_url: '',
          ao_vivo: true,
          updated_at: new Date().toISOString()
        };
        let profile: UserProfile | undefined;
        let team: TeamInfo | undefined;

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, nome, avatar_url')
          .eq('id', salaStream.user_id)
          .single();

        profile = profileData || undefined;

        // Fetch team info
        const { data: membro } = await supabase
          .from('time_membros')
          .select('time_id')
          .eq('user_id', salaStream.user_id)
          .maybeSingle();

        if (membro?.time_id) {
          const { data: teamData } = await supabase
            .from('times')
            .select('id, nome, tag, logo_url')
            .eq('id', membro.time_id)
            .single();

          team = teamData || undefined;
        }

        return { ...stream, profile, team };
      });

      const streamCards = await Promise.all(streamCardsPromises);
      setStreams(streamCards as StreamCard[]);
    } catch (error) {
      console.error('Error fetching streams:', error);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount
    setLoading(true);
    fetchStreams().then(() => setLoading(false));

    // Subscribe to realtime updates with debounce
    const subscription = supabase
      .channel('sala_streams_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sala_streams',
        },
        () => {
          // Debounce to prevent multiple rapid refetches
          if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
          }
          fetchTimeoutRef.current = setTimeout(() => {
            fetchStreams();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [fetchStreams]);

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-on-surface-variant">Carregando streamers...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && streams.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 border-2 border-dashed border-surface-variant rounded-2xl"
          >
            <Tv2 size={48} className="mx-auto text-on-surface-variant mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Nenhum streamer ao vivo</h2>
            <p className="text-on-surface-variant">Volte mais tarde para acompanhar nossos streamers!</p>
          </motion.div>
        )}

        {/* Streamers Parceiros Section */}
        {!loading && streams.length > 0 && (
          <div>
            {/* Header */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <Tv2 size={32} className="text-primary" />
                <h1 className="text-4xl font-bold">Streamers Parceiros</h1>
              </div>
              <p className="text-on-surface-variant text-lg">
                Acompanhe as transmissões ao vivo dos nossos streamers parceiros
              </p>
            </div>

            {/* 4-Column Grid with Square Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {streams.map((stream, index) => (
                <motion.a
                  key={stream.id}
                  href={`https://twitch.tv/${stream.twitch_channel}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group block cursor-pointer"
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-surface-variant hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
                    {/* Thumbnail Background */}
                    <div className="absolute inset-0 bg-surface-variant overflow-hidden">
                      {stream.thumbnail_url && (
                        <img
                          src={stream.thumbnail_url}
                          alt={stream.profile?.nome || stream.twitch_channel}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
                    </div>

                    {/* Content Overlay */}
                    <div className="relative h-full flex flex-col justify-between p-4">
                      {/* Top: Live Badge */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1 bg-red-600 px-2 py-1 rounded-full">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          <span className="text-xs font-bold text-white">AO VIVO</span>
                        </div>
                        <ExternalLink size={16} className="text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Bottom: Streamer Info */}
                      <div className="space-y-2">
                        {/* Team Badge (if has team) */}
                        {stream.team && (
                          <div className="flex items-center gap-2">
                            {stream.team.logo_url && (
                              <img
                                src={stream.team.logo_url}
                                alt={stream.team.nome}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            )}
                            <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">
                              [{stream.team.tag}]
                            </span>
                          </div>
                        )}

                        {/* Streamer Name and Avatar */}
                        <div className="flex items-center gap-3">
                          {stream.profile?.avatar_url && (
                            <img
                              src={stream.profile.avatar_url}
                              alt={stream.profile.nome}
                              className="w-10 h-10 rounded-full object-cover border border-primary/50"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-sm truncate">
                              {stream.profile?.nome || stream.twitch_channel}
                            </h3>
                            <p className="text-xs text-primary/80 truncate">
                              @{stream.twitch_channel}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
