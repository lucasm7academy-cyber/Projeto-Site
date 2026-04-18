-- Create sala_streams table for active broadcasts in game rooms
CREATE TABLE IF NOT EXISTS sala_streams (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id      text NOT NULL,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_channel text NOT NULL,
  ativo        boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE sala_streams ENABLE ROW LEVEL SECURITY;

-- Public can read all active streams
CREATE POLICY "Todos leem sala_streams" ON sala_streams
  FOR SELECT USING (true);

-- Streamer can manage their own streams
CREATE POLICY "Streamer gerencia sua stream" ON sala_streams
  FOR ALL USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sala_streams;

-- Create twitch_lives_ativas table for auto-detected streams
CREATE TABLE IF NOT EXISTS twitch_lives_ativas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_channel text NOT NULL UNIQUE,
  stream_title   text,
  viewer_count   integer DEFAULT 0,
  thumbnail_url  text,
  ao_vivo        boolean DEFAULT true,
  updated_at     timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE twitch_lives_ativas ENABLE ROW LEVEL SECURITY;

-- Public can read all active streams
CREATE POLICY "Todos leem twitch_lives_ativas" ON twitch_lives_ativas
  FOR SELECT USING (true);
