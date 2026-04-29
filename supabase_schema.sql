-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  nickname    TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Games
CREATE TABLE IF NOT EXISTS public.games (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  mode        TEXT NOT NULL CHECK (mode IN ('tournament', 'open_play')),
  format      TEXT NOT NULL DEFAULT 'singles' CHECK (format IN ('singles', 'doubles')),
  status      TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  creator_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'singles';
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'games_format_check'
  ) THEN
    ALTER TABLE public.games
    ADD CONSTRAINT games_format_check CHECK (format IN ('singles', 'doubles'));
  END IF;
END $$;

-- Game Players (join table)
CREATE TABLE IF NOT EXISTS public.game_players (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id     UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- Tournament Teams (for creator-managed doubles pairings)
CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id     UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player1_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CHECK (player1_id <> player2_id)
);

-- Matches
CREATE TABLE IF NOT EXISTS public.matches (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id          UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team1_player1    UUID NOT NULL REFERENCES public.profiles(id),
  team1_player2    UUID REFERENCES public.profiles(id),
  team2_player1    UUID NOT NULL REFERENCES public.profiles(id),
  team2_player2    UUID REFERENCES public.profiles(id),
  score_team1      INTEGER DEFAULT 0,
  score_team2      INTEGER DEFAULT 0,
  serving_team     INTEGER NOT NULL DEFAULT 1 CHECK (serving_team IN (1, 2)),
  server_number    INTEGER CHECK (server_number IN (1, 2)),
  winner_team      INTEGER CHECK (winner_team IN (1, 2)),
  round            INTEGER NOT NULL DEFAULT 1,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS serving_team INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS server_number INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matches_serving_team_check'
  ) THEN
    ALTER TABLE public.matches
    ADD CONSTRAINT matches_serving_team_check CHECK (serving_team IN (1, 2));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matches_server_number_check'
  ) THEN
    ALTER TABLE public.matches
    ADD CONSTRAINT matches_server_number_check CHECK (server_number IN (1, 2));
  END IF;
END $$;

-- Court Places
CREATE TABLE IF NOT EXISTS public.court_places (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  location    TEXT NOT NULL,
  court_count INT NOT NULL,
  court_names TEXT NOT NULL,
  maps_url    TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.court_places
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Court Registration Requests (admin approval queue)
CREATE TABLE IF NOT EXISTS public.court_registration_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  location        TEXT NOT NULL,
  court_count     INT NOT NULL,
  court_names     TEXT NOT NULL,
  maps_url        TEXT,
  image_url       TEXT,
  image_file_name TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);

ALTER TABLE public.court_registration_requests
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_games_code ON public.games(code);
CREATE INDEX IF NOT EXISTS idx_games_creator ON public.games(creator_id);
CREATE INDEX IF NOT EXISTS idx_game_players_game ON public.game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_player ON public.game_players(player_id);
CREATE INDEX IF NOT EXISTS idx_matches_game ON public.matches(game_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_game ON public.tournament_teams(game_id);
CREATE INDEX IF NOT EXISTS idx_court_registration_requests_status ON public.court_registration_requests(status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, only update their own
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Games: authenticated users can read all games, creators manage their own
CREATE POLICY "games_select" ON public.games FOR SELECT USING (true);
CREATE POLICY "games_insert" ON public.games FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "games_update" ON public.games FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "games_delete" ON public.games FOR DELETE USING (auth.uid() = creator_id);

-- Game Players: anyone authenticated can read, insert; only game creator can delete
CREATE POLICY "gp_select" ON public.game_players FOR SELECT USING (true);
CREATE POLICY "gp_insert" ON public.game_players FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "gp_delete" ON public.game_players FOR DELETE USING (
  auth.uid() = player_id OR
  auth.uid() = (SELECT creator_id FROM public.games WHERE id = game_id)
);

-- Matches: anyone can read; only game creator can insert/update
CREATE POLICY "matches_select" ON public.matches FOR SELECT USING (true);
CREATE POLICY "matches_insert" ON public.matches FOR INSERT WITH CHECK (
  auth.uid() = (SELECT creator_id FROM public.games WHERE id = game_id)
);
CREATE POLICY "matches_update" ON public.matches FOR UPDATE USING (
  auth.uid() = (SELECT creator_id FROM public.games WHERE id = game_id)
);

-- Tournament teams: anyone can read, only creator can manage
CREATE POLICY "tt_select" ON public.tournament_teams FOR SELECT USING (true);
CREATE POLICY "tt_insert" ON public.tournament_teams FOR INSERT WITH CHECK (
  auth.uid() = (SELECT creator_id FROM public.games WHERE id = game_id)
);
CREATE POLICY "tt_update" ON public.tournament_teams FOR UPDATE USING (
  auth.uid() = (SELECT creator_id FROM public.games WHERE id = game_id)
);
CREATE POLICY "tt_delete" ON public.tournament_teams FOR DELETE USING (
  auth.uid() = (SELECT creator_id FROM public.games WHERE id = game_id)
);

-- ============================================================
-- STORAGE BUCKET for avatars
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "avatar_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatar_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatar_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- REALTIME
-- Enable realtime for live updates
-- ============================================================

ALTER publication supabase_realtime ADD TABLE public.game_players;
ALTER publication supabase_realtime ADD TABLE public.matches;
ALTER publication supabase_realtime ADD TABLE public.games;
ALTER publication supabase_realtime ADD TABLE public.tournament_teams;
