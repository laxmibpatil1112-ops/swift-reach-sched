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
      campaigns: {
        Row: {
          body: string
          created_at: string
          delay_seconds: number
          hourly_limit: number
          id: string
          start_at: string
          subject: string
          total_recipients: number
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          delay_seconds?: number
          hourly_limit?: number
          id?: string
          start_at: string
          subject: string
          total_recipients?: number
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          delay_seconds?: number
          hourly_limit?: number
          id?: string
          start_at?: string
          subject?: string
          total_recipients?: number
          user_id?: string
        }
        Relationships: []
      }
      email_jobs: {
        Row: {
          attempts: number
          body: string
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          locked_at: string | null
          provider_message_id: string | null
          recipient: string
          scheduled_at: string
          search_doc: unknown
          sender_id: string | null
          sent_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          attempts?: number
          body: string
          campaign_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          locked_at?: string | null
          provider_message_id?: string | null
          recipient: string
          scheduled_at: string
          search_doc?: unknown
          sender_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          attempts?: number
          body?: string
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          locked_at?: string | null
          provider_message_id?: string | null
          recipient?: string
          scheduled_at?: string
          search_doc?: unknown
          sender_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_jobs_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "senders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      rate_windows: {
        Row: {
          notified_at: string | null
          sender_id: string
          sent_count: number
          window_start: string
        }
        Insert: {
          notified_at?: string | null
          sender_id: string
          sent_count?: number
          window_start: string
        }
        Update: {
          notified_at?: string | null
          sender_id?: string
          sent_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_windows_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "senders"
            referencedColumns: ["id"]
          },
        ]
      }
      senders: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      slack_connections: {
        Row: {
          channel: string | null
          connected_at: string
          team_name: string | null
          user_id: string
          webhook_url: string
        }
        Insert: {
          channel?: string | null
          connected_at?: string
          team_name?: string | null
          user_id: string
          webhook_url: string
        }
        Update: {
          channel?: string | null
          connected_at?: string
          team_name?: string | null
          user_id?: string
          webhook_url?: string
        }
        Relationships: []
      }
      worker_leases: {
        Row: {
          holder: string | null
          locked_until: string
          name: string
        }
        Insert: {
          holder?: string | null
          locked_until: string
          name: string
        }
        Update: {
          holder?: string | null
          locked_until?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_lease: {
        Args: { p_holder: string; p_name: string; p_seconds: number }
        Returns: boolean
      }
      claim_due_jobs: {
        Args: { p_limit: number }
        Returns: {
          attempts: number
          body: string
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          locked_at: string | null
          provider_message_id: string | null
          recipient: string
          scheduled_at: string
          search_doc: unknown
          sender_id: string | null
          sent_at: string | null
          status: string
          subject: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      release_lease: { Args: { p_name: string }; Returns: undefined }
      reserve_send_slot: {
        Args: { p_limit: number; p_sender_id: string }
        Returns: Json
      }
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
