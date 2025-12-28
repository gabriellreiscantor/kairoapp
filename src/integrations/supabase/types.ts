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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      call_logs: {
        Row: {
          created_at: string | null
          data: Json | null
          device: string | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          device?: string | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          device?: string | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          created_at: string
          device_id: string
          platform: string
          updated_at: string
          user_id: string | null
          voip_token: string
        }
        Insert: {
          created_at?: string
          device_id: string
          platform?: string
          updated_at?: string
          user_id?: string | null
          voip_token: string
        }
        Update: {
          created_at?: string
          device_id?: string
          platform?: string
          updated_at?: string
          user_id?: string | null
          voip_token?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          alerts: Json | null
          call_alert_answered: boolean | null
          call_alert_answered_at: string | null
          call_alert_attempts: number | null
          call_alert_enabled: boolean | null
          call_alert_outcome: string | null
          call_alert_scheduled_at: string | null
          call_alert_sent_at: string | null
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          device_id: string | null
          duration_minutes: number | null
          emoji: string | null
          event_date: string
          event_time: string | null
          id: string
          is_all_day: boolean | null
          location: string | null
          notification_enabled: boolean | null
          notification_scheduled_at: string | null
          notification_sent_at: string | null
          priority: string | null
          repeat: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alerts?: Json | null
          call_alert_answered?: boolean | null
          call_alert_answered_at?: string | null
          call_alert_attempts?: number | null
          call_alert_enabled?: boolean | null
          call_alert_outcome?: string | null
          call_alert_scheduled_at?: string | null
          call_alert_sent_at?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          device_id?: string | null
          duration_minutes?: number | null
          emoji?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          notification_enabled?: boolean | null
          notification_scheduled_at?: string | null
          notification_sent_at?: string | null
          priority?: string | null
          repeat?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alerts?: Json | null
          call_alert_answered?: boolean | null
          call_alert_answered_at?: string | null
          call_alert_attempts?: number | null
          call_alert_enabled?: boolean | null
          call_alert_outcome?: string | null
          call_alert_scheduled_at?: string | null
          call_alert_sent_at?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          device_id?: string | null
          duration_minutes?: number | null
          emoji?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          notification_enabled?: boolean | null
          notification_scheduled_at?: string | null
          notification_sent_at?: string | null
          priority?: string | null
          repeat?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plan_limits: {
        Row: {
          chat_capacity_multiplier: number
          has_conflict_detection: boolean | null
          has_critical_alerts: boolean
          has_daily_overview: boolean | null
          id: string
          max_events_per_week: number
          max_google_calendars: number
          max_kairo_calendars: number
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_monthly: number | null
          price_yearly: number | null
        }
        Insert: {
          chat_capacity_multiplier?: number
          has_conflict_detection?: boolean | null
          has_critical_alerts?: boolean
          has_daily_overview?: boolean | null
          id?: string
          max_events_per_week: number
          max_google_calendars?: number
          max_kairo_calendars?: number
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_monthly?: number | null
          price_yearly?: number | null
        }
        Update: {
          chat_capacity_multiplier?: number
          has_conflict_detection?: boolean | null
          has_critical_alerts?: boolean
          has_daily_overview?: boolean | null
          id?: string
          max_events_per_week?: number
          max_google_calendars?: number
          max_kairo_calendars?: number
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_monthly?: number | null
          price_yearly?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auto_reschedule_enabled: boolean | null
          avatar_url: string | null
          call_enabled: boolean
          context_aware_enabled: boolean | null
          created_at: string | null
          critical_alerts_enabled: boolean
          display_name: string | null
          fcm_token: string | null
          fcm_token_platform: string | null
          fcm_token_updated_at: string | null
          first_event_created: boolean | null
          font_preference: string | null
          id: string
          last_weather_forecast_at: string | null
          last_weekly_report_at: string | null
          learn_patterns_enabled: boolean | null
          onboarding_completed: boolean | null
          onboarding_step: string | null
          phone: string | null
          preferred_times: Json | null
          push_enabled: boolean
          smart_suggestions_enabled: boolean | null
          sound_enabled: boolean
          timezone: string | null
          updated_at: string | null
          user_city: string | null
          user_latitude: number | null
          user_longitude: number | null
          vibration_enabled: boolean
          weather_forecast_enabled: boolean | null
          weather_forecast_hour: number | null
          weather_forecast_time: string | null
          weekly_report_enabled: boolean | null
          weekly_report_hour: number | null
          whatsapp_enabled: boolean
        }
        Insert: {
          auto_reschedule_enabled?: boolean | null
          avatar_url?: string | null
          call_enabled?: boolean
          context_aware_enabled?: boolean | null
          created_at?: string | null
          critical_alerts_enabled?: boolean
          display_name?: string | null
          fcm_token?: string | null
          fcm_token_platform?: string | null
          fcm_token_updated_at?: string | null
          first_event_created?: boolean | null
          font_preference?: string | null
          id: string
          last_weather_forecast_at?: string | null
          last_weekly_report_at?: string | null
          learn_patterns_enabled?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          phone?: string | null
          preferred_times?: Json | null
          push_enabled?: boolean
          smart_suggestions_enabled?: boolean | null
          sound_enabled?: boolean
          timezone?: string | null
          updated_at?: string | null
          user_city?: string | null
          user_latitude?: number | null
          user_longitude?: number | null
          vibration_enabled?: boolean
          weather_forecast_enabled?: boolean | null
          weather_forecast_hour?: number | null
          weather_forecast_time?: string | null
          weekly_report_enabled?: boolean | null
          weekly_report_hour?: number | null
          whatsapp_enabled?: boolean
        }
        Update: {
          auto_reschedule_enabled?: boolean | null
          avatar_url?: string | null
          call_enabled?: boolean
          context_aware_enabled?: boolean | null
          created_at?: string | null
          critical_alerts_enabled?: boolean
          display_name?: string | null
          fcm_token?: string | null
          fcm_token_platform?: string | null
          fcm_token_updated_at?: string | null
          first_event_created?: boolean | null
          font_preference?: string | null
          id?: string
          last_weather_forecast_at?: string | null
          last_weekly_report_at?: string | null
          learn_patterns_enabled?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          phone?: string | null
          preferred_times?: Json | null
          push_enabled?: boolean
          smart_suggestions_enabled?: boolean | null
          sound_enabled?: boolean
          timezone?: string | null
          updated_at?: string | null
          user_city?: string | null
          user_latitude?: number | null
          user_longitude?: number | null
          vibration_enabled?: boolean
          weather_forecast_enabled?: boolean | null
          weather_forecast_hour?: number | null
          weather_forecast_time?: string | null
          weekly_report_enabled?: boolean | null
          weekly_report_hour?: number | null
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      user_patterns: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          pattern_data: Json
          pattern_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          pattern_data: Json
          pattern_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          pattern_data?: Json
          pattern_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_period: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_period?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_period?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          category_distribution: Json
          created_at: string
          description: string | null
          headline: string
          id: string
          language: string | null
          total_events: number
          total_hours: number
          user_id: string
          week_end: string
          week_number: number
          week_start: string
        }
        Insert: {
          category_distribution?: Json
          created_at?: string
          description?: string | null
          headline: string
          id?: string
          language?: string | null
          total_events?: number
          total_hours?: number
          user_id: string
          week_end: string
          week_number: number
          week_start: string
        }
        Update: {
          category_distribution?: Json
          created_at?: string
          description?: string | null
          headline?: string
          id?: string
          language?: string | null
          total_events?: number
          total_hours?: number
          user_id?: string
          week_end?: string
          week_number?: number
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_event: { Args: { _user_id: string }; Returns: boolean }
      count_user_events_this_week: {
        Args: { _user_id: string }
        Returns: number
      }
      get_user_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["subscription_plan"]
      }
    }
    Enums: {
      subscription_plan: "free" | "plus" | "super"
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
      subscription_plan: ["free", "plus", "super"],
    },
  },
} as const
