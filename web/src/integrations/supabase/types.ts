/* eslint-disable */
// AUTO-GENERATED — DO NOT EDIT
// Run migrations to regenerate.

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      vca_accounts: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      vca_admins: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      vca_cards: {
        Row: {
          artist: string | null
          card_id: string
          delta7: number | null
          image_large: string | null
          image_url: string | null
          name: string
          number: string | null
          psa10: number | null
          psa8: number | null
          psa9: number | null
          rarity: string | null
          raw: number | null
          set_id: string | null
          set_name: string | null
          source: string
          tcg_slug: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          artist?: string | null
          card_id: string
          delta7?: number | null
          image_large?: string | null
          image_url?: string | null
          name: string
          number?: string | null
          psa10?: number | null
          psa8?: number | null
          psa9?: number | null
          rarity?: string | null
          raw?: number | null
          set_id?: string | null
          set_name?: string | null
          source?: string
          tcg_slug?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          artist?: string | null
          card_id?: string
          delta7?: number | null
          image_large?: string | null
          image_url?: string | null
          name?: string
          number?: string | null
          psa10?: number | null
          psa8?: number | null
          psa9?: number | null
          rarity?: string | null
          raw?: number | null
          set_id?: string | null
          set_name?: string | null
          source?: string
          tcg_slug?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      vca_market_budget: {
        Row: {
          minute: string
          requests: number
          user_id: string
        }
        Insert: {
          minute: string
          requests?: number
          user_id: string
        }
        Update: {
          minute?: string
          requests?: number
          user_id?: string
        }
        Relationships: []
      }
      vca_posts: {
        Row: {
          body: string
          caption: string | null
          card_grade: string | null
          card_id: string | null
          card_serial: string | null
          client_id: string
          created_at: string
          kind: string
          user_id: string
        }
        Insert: {
          body?: string
          caption?: string | null
          card_grade?: string | null
          card_id?: string | null
          card_serial?: string | null
          client_id: string
          created_at?: string
          kind?: string
          user_id: string
        }
        Update: {
          body?: string
          caption?: string | null
          card_grade?: string | null
          card_id?: string | null
          card_serial?: string | null
          client_id?: string
          created_at?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      vca_profile_blocks: {
        Row: {
          client_id: string
          config: Json
          id: string
          kind: string
          position: number
          user_key: string
        }
        Insert: {
          client_id: string
          config?: Json
          id?: string
          kind: string
          position?: number
          user_key?: string
        }
        Update: {
          client_id?: string
          config?: Json
          id?: string
          kind?: string
          position?: number
          user_key?: string
        }
        Relationships: []
      }
      vca_profile_media: {
        Row: {
          caption: string | null
          client_id: string
          id: string
          media_type: string
          position: number
          title: string
          url: string
          user_key: string
        }
        Insert: {
          caption?: string | null
          client_id: string
          id?: string
          media_type?: string
          position?: number
          title?: string
          url: string
          user_key?: string
        }
        Update: {
          caption?: string | null
          client_id?: string
          id?: string
          media_type?: string
          position?: number
          title?: string
          url?: string
          user_key?: string
        }
        Relationships: []
      }
      vca_scan_history: {
        Row: {
          card_name: string | null
          client_id: string
          confidence: number | null
          id: string
          image_url: string | null
          matched_card_id: string | null
          number: string | null
          rarity: string | null
          set_name: string | null
          verdict: string | null
          verified_product: boolean | null
        }
        Insert: {
          card_name?: string | null
          client_id: string
          confidence?: number | null
          id?: string
          image_url?: string | null
          matched_card_id?: string | null
          number?: string | null
          rarity?: string | null
          set_name?: string | null
          verdict?: string | null
          verified_product?: boolean | null
        }
        Update: {
          card_name?: string | null
          client_id?: string
          confidence?: number | null
          id?: string
          image_url?: string | null
          matched_card_id?: string | null
          number?: string | null
          rarity?: string | null
          set_name?: string | null
          verdict?: string | null
          verified_product?: boolean | null
        }
        Relationships: []
      }
      vca_slabs: {
        Row: {
          card_art: string | null
          card_id: string | null
          card_name: string
          card_set: string | null
          client_id: string
          grade: string | null
          grade_score: number | null
          id: string
          kind: string
          label: string | null
          minted_at: string
          owner_name: string
          serial: string
          value: number | null
        }
        Insert: {
          card_art?: string | null
          card_id?: string | null
          card_name?: string
          card_set?: string | null
          client_id: string
          grade?: string | null
          grade_score?: number | null
          id?: string
          kind?: string
          label?: string | null
          minted_at?: string
          owner_name?: string
          serial: string
          value?: number | null
        }
        Update: {
          card_art?: string | null
          card_id?: string | null
          card_name?: string
          card_set?: string | null
          client_id?: string
          grade?: string | null
          grade_score?: number | null
          id?: string
          kind?: string
          label?: string | null
          minted_at?: string
          owner_name?: string
          serial?: string
          value?: number | null
        }
        Relationships: []
      }
      vca_submission_events: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          note: string
          status: string
          submission_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          note?: string
          status: string
          submission_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          note?: string
          status?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vca_submission_events_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vca_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      vca_submissions: {
        Row: {
          card_id: string
          cert_serial: string | null
          created_at: string
          details: Json
          final_grade: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          card_id: string
          cert_serial?: string | null
          created_at?: string
          details: Json
          final_grade?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Update: {
          card_id?: string
          cert_serial?: string | null
          created_at?: string
          details?: Json
          final_grade?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      vca_workspace: {
        Row: {
          data: Json
          revision: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          revision?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          revision?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_id: { Args: never; Returns: string }
      vca_advance_submission: {
        Args: {
          evidence_note?: string
          grade?: string
          next_status: string
          submission: string
        }
        Returns: undefined
      }
      vca_is_admin: { Args: never; Returns: boolean }
      vca_record_inspection: {
        Args: { inspection: Json; submission: string }
        Returns: undefined
      }
      vca_save_workspace: {
        Args: { expected_revision: number; payload: Json }
        Returns: number
      }
      vca_save_workspace_owned: {
        Args: {
          expected_owner: string
          expected_revision: number
          payload: Json
        }
        Returns: number
      }
      vca_use_market_budget: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
