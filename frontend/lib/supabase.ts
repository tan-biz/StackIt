import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          nickname: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          nickname: string
          avatar_url?: string | null
        }
        Update: {
          name?: string
          nickname?: string
          avatar_url?: string | null
        }
      }
      games: {
        Row: {
          id: string
          code: string
          name: string
          mode: 'tournament' | 'open_play'
          status: 'waiting' | 'active' | 'completed'
          creator_id: string
          created_at: string
        }
        Insert: {
          code: string
          name: string
          mode: 'tournament' | 'open_play'
          creator_id: string
        }
        Update: {
          status?: 'waiting' | 'active' | 'completed'
        }
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          player_id: string
          joined_at: string
        }
        Insert: {
          game_id: string
          player_id: string
        }
      }
      matches: {
        Row: {
          id: string
          game_id: string
          team1_player1: string
          team1_player2: string | null
          team2_player1: string
          team2_player2: string | null
          score_team1: number
          score_team2: number
          winner_team: 1 | 2 | null
          round: number
          status: 'pending' | 'active' | 'completed'
          created_at: string
        }
      }
    }
  }
}
