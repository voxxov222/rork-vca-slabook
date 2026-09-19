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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_id: { Args: never; Returns: string }
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
