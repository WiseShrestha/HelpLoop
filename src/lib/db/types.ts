export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      course_topics: {
        Row: {
          course_code: string
          label_en: string
          label_ko: string
          tag: string
        }
        ComputedFields: never
        Insert: {
          course_code: string
          label_en: string
          label_ko: string
          tag: string
        }
        Update: {
          course_code?: string
          label_en?: string
          label_ko?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_topics_course_code_fkey"
            columns: ["course_code"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["code"]
          },
        ]
      }
      courses: {
        Row: {
          active: boolean
          code: string
          kind: string
          name_en: string
          name_ko: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          code: string
          kind?: string
          name_en: string
          name_ko: string
        }
        Update: {
          active?: boolean
          code?: string
          kind?: string
          name_en?: string
          name_ko?: string
        }
        Relationships: []
      }
      draws: {
        Row: {
          commit_hash: string
          drawn_at: string | null
          id: string
          prizes: NonNullable<Json>
          seed: string | null
          week_start: string
          winners: Json | null
        }
        ComputedFields: never
        Insert: {
          commit_hash: string
          drawn_at?: string | null
          id?: string
          prizes: NonNullable<Json>
          seed?: string | null
          week_start: string
          winners?: Json | null
        }
        Update: {
          commit_hash?: string
          drawn_at?: string | null
          id?: string
          prizes?: NonNullable<Json>
          seed?: string | null
          week_start?: string
          winners?: Json | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          id: number
          payload: NonNullable<Json>
          ref_id: string | null
          type: string
          user_id: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: never
          payload?: NonNullable<Json>
          ref_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          payload?: NonNullable<Json>
          ref_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "helper_course_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "helper_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger: {
        Row: {
          created_at: string
          delta: number
          id: number
          perk_claim_id: string | null
          reason: Database["public"]["Enums"]["ledger_reason"]
          session_id: string | null
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          delta: number
          id?: never
          perk_claim_id?: string | null
          reason: Database["public"]["Enums"]["ledger_reason"]
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: never
          perk_claim_id?: string | null
          reason?: Database["public"]["Enums"]["ledger_reason"]
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "helper_course_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "helper_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loop_bonuses: {
        Row: {
          created_at: string
          loop_key: string
          members: string[]
          session_ids: string[]
          tickets: number
          user_id: string
          week_start: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          loop_key: string
          members: string[]
          session_ids: string[]
          tickets: number
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          loop_key?: string
          members?: string[]
          session_ids?: string[]
          tickets?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "loop_bonuses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "helper_course_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "loop_bonuses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "helper_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "loop_bonuses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      open_table_joins: {
        Row: {
          joined_at: string
          table_id: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          joined_at?: string
          table_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          table_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_table_joins_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "open_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_table_joins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "helper_course_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "open_table_joins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "helper_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "open_table_joins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      open_tables: {
        Row: {
          course_code: string | null
          created_at: string
          ends_at: string
          host_id: string
          id: string
          max_people: number
          note: string | null
          place: string
          starts_at: string
        }
        ComputedFields: never
        Insert: {
          course_code?: string | null
          created_at?: string
          ends_at: string
          host_id: string
          id?: string
          max_people?: number
          note?: string | null
          place: string
          starts_at: string
        }
        Update: {
          course_code?: string | null
          created_at?: string
          ends_at?: string
          host_id?: string
          id?: string
          max_people?: number
          note?: string | null
          place?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_tables_course_code_fkey"
            columns: ["course_code"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "open_tables_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "helper_course_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "open_tables_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "helper_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "open_tables_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perk_claims: {
        Row: {
          created_at: string
          id: string
          perk_id: string
          status: Database["public"]["Enums"]["claim_status"]
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          perk_id: string
          status?: Database["public"]["Enums"]["claim_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          perk_id?: string
          status?: Database["public"]["Enums"]["claim_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perk_claims_perk_id_fkey"
            columns: ["perk_id"]
            isOneToOne: false
            referencedRelation: "perks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perk_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "helper_course_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "perk_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "helper_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "perk_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perks: {
        Row: {
          active: boolean
          capacity: number
          cost_minutes: number
          created_at: string
          department: string | null
          description: string | null
          host_label: string
          id: string
          title: string
        }
        ComputedFields: never
        Insert: {
          active?: boolean
          capacity: number
          cost_minutes: number
          created_at?: string
          department?: string | null
          description?: string | null
          host_label: string
          id?: string
          title: string
        }
        Update: {
          active?: boolean
          capacity?: number
          cost_minutes?: number
          created_at?: string
          department?: string | null
          description?: string | null
          host_label?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      private_profiles: {
        Row: {
          kaist_email: string | null
          real_name: string
          student_no: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          kaist_email?: string | null
          real_name: string
          student_no: string
          user_id: string
        }
        Update: {
          kaist_email?: string | null
          real_name?: string
          student_no?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "helper_course_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "private_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "helper_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "private_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          consent: boolean
          created_at: string
          department: string
          display_name: string
          entry_year: number
          help_courses: string[]
          id: string
          is_admin: boolean
          public_record: boolean
        }
        ComputedFields: never
        Insert: {
          bio?: string | null
          consent?: boolean
          created_at?: string
          department?: string
          display_name: string
          entry_year: number
          help_courses?: string[]
          id: string
          is_admin?: boolean
          public_record?: boolean
        }
        Update: {
          bio?: string | null
          consent?: boolean
          created_at?: string
          department?: string
          display_name?: string
          entry_year?: number
          help_courses?: string[]
          id?: string
          is_admin?: boolean
          public_record?: boolean
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          session_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "helper_course_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "helper_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          asker_id: string
          course_code: string
          created_at: string
          deadline: string
          details: string | null
          id: string
          is_anonymous: boolean
          minutes: number
          place: string
          status: Database["public"]["Enums"]["request_status"]
          topic: string
          topic_tag: string | null
        }
        ComputedFields: never
        Insert: {
          asker_id: string
          course_code: string
          created_at?: string
          deadline: string
          details?: string | null
          id?: string
          is_anonymous?: boolean
          minutes: number
          place: string
          status?: Database["public"]["Enums"]["request_status"]
          topic: string
          topic_tag?: string | null
        }
        Update: {
          asker_id?: string
          course_code?: string
          created_at?: string
          deadline?: string
          details?: string | null
          id?: string
          is_anonymous?: boolean
          minutes?: number
          place?: string
          status?: Database["public"]["Enums"]["request_status"]
          topic?: string
          topic_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "helper_course_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requests_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "helper_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requests_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_course_code_fkey"
            columns: ["course_code"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_course_code_topic_tag_fkey"
            columns: ["course_code", "topic_tag"]
            isOneToOne: false
            referencedRelation: "course_topics"
            referencedColumns: ["course_code", "tag"]
          },
        ]
      }
      sessions: {
        Row: {
          asker_confirmed_at: string | null
          asker_id: string
          completed_at: string | null
          covered: string | null
          created_at: string
          helper_confirmed_at: string | null
          helper_id: string
          id: string
          minutes: number
          place: string
          rating: number | null
          request_id: string
          scheduled_at: string
          status: Database["public"]["Enums"]["session_status"]
        }
        ComputedFields: never
        Insert: {
          asker_confirmed_at?: string | null
          asker_id: string
          completed_at?: string | null
          covered?: string | null
          created_at?: string
          helper_confirmed_at?: string | null
          helper_id: string
          id?: string
          minutes: number
          place: string
          rating?: number | null
          request_id: string
          scheduled_at: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Update: {
          asker_confirmed_at?: string | null
          asker_id?: string
          completed_at?: string | null
          covered?: string | null
          created_at?: string
          helper_confirmed_at?: string | null
          helper_id?: string
          id?: string
          minutes?: number
          place?: string
          rating?: number | null
          request_id?: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sessions_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "helper_course_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sessions_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "helper_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sessions_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helper_course_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sessions_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helper_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sessions_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "request_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_awards: {
        Row: {
          breakdown: NonNullable<Json>
          created_at: string
          helper_id: string
          session_id: string
          tickets: number
          week_start: string
        }
        ComputedFields: never
        Insert: {
          breakdown: NonNullable<Json>
          created_at?: string
          helper_id: string
          session_id: string
          tickets: number
          week_start: string
        }
        Update: {
          breakdown?: NonNullable<Json>
          created_at?: string
          helper_id?: string
          session_id?: string
          tickets?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_awards_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helper_course_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_awards_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "helper_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_awards_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_awards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      helper_course_stats: {
        Row: {
          avg_rating: number | null
          course_code: string | null
          first_at: string | null
          last_at: string | null
          minutes: number | null
          people_helped: number | null
          sessions: number | null
          user_id: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "requests_course_code_fkey"
            columns: ["course_code"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["code"]
          },
        ]
      }
      helper_stats: {
        Row: {
          avg_rating: number | null
          department: string | null
          display_name: string | null
          entry_year: number | null
          minutes_helped: number | null
          people_helped: number | null
          sessions_helped: number | null
          user_id: string | null
        }
        ComputedFields: never
        Relationships: []
      }
      request_board: {
        Row: {
          asker_id: string | null
          course_code: string | null
          created_at: string | null
          deadline: string | null
          details: string | null
          id: string | null
          is_anonymous: boolean | null
          minutes: number | null
          place: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          topic: string | null
          topic_tag: string | null
        }
        ComputedFields: never
        Insert: {
          asker_id?: never
          course_code?: string | null
          created_at?: string | null
          deadline?: string | null
          details?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          minutes?: number | null
          place?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          topic?: string | null
          topic_tag?: string | null
        }
        Update: {
          asker_id?: never
          course_code?: string | null
          created_at?: string | null
          deadline?: string | null
          details?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          minutes?: number | null
          place?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          topic?: string | null
          topic_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_course_code_fkey"
            columns: ["course_code"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_course_code_topic_tag_fkey"
            columns: ["course_code", "topic_tag"]
            isOneToOne: false
            referencedRelation: "course_topics"
            referencedColumns: ["course_code", "tag"]
          },
        ]
      }
      stuck_map: {
        Row: {
          course_code: string | null
          requests: number | null
          topic_tag: string | null
          week_start: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: "requests_course_code_fkey"
            columns: ["course_code"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "requests_course_code_topic_tag_fkey"
            columns: ["course_code", "topic_tag"]
            isOneToOne: false
            referencedRelation: "course_topics"
            referencedColumns: ["course_code", "tag"]
          },
        ]
      }
      week_tickets: {
        Row: {
          display_name: string | null
          tickets: number | null
          user_id: string | null
          week_start: string | null
        }
        ComputedFields: never
        Relationships: []
      }
    }
    Functions: {
      accept_request: {
        Args: { p_place: string; p_request: string; p_scheduled_at: string }
        Returns: string
      }
      cancel_session: { Args: { p_session: string }; Returns: undefined }
      claim_perk: { Args: { p_perk: string }; Returns: string }
      confirm_session: {
        Args: { p_covered?: string; p_rating?: number; p_session: string }
        Returns: Database["public"]["Enums"]["session_status"]
      }
      expire_requests: { Args: Record<PropertyKey, never>; Returns: undefined }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      my_balance: { Args: Record<PropertyKey, never>; Returns: number }
      my_open_request_minutes: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      overdraft_limit: { Args: Record<PropertyKey, never>; Returns: number }
      starter_minutes: { Args: Record<PropertyKey, never>; Returns: number }
    }
    Enums: {
      claim_status: "claimed" | "fulfilled" | "cancelled"
      ledger_reason:
        | "starter"
        | "session_earned"
        | "session_spent"
        | "perk"
        | "admin"
      request_status: "open" | "matched" | "completed" | "cancelled" | "expired"
      session_status: "scheduled" | "completed" | "cancelled" | "disputed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      claim_status: ["claimed", "fulfilled", "cancelled"],
      ledger_reason: [
        "starter",
        "session_earned",
        "session_spent",
        "perk",
        "admin",
      ],
      request_status: ["open", "matched", "completed", "cancelled", "expired"],
      session_status: ["scheduled", "completed", "cancelled", "disputed"],
    },
  },
} as const
