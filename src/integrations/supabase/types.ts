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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abuse_reports: {
        Row: {
          abuse_type: string
          action_taken: string | null
          confidence: number | null
          created_at: string
          detected_by: string
          fingerprint: string | null
          id: string
          metadata: Json | null
          pattern_signature: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          abuse_type: string
          action_taken?: string | null
          confidence?: number | null
          created_at?: string
          detected_by?: string
          fingerprint?: string | null
          id?: string
          metadata?: Json | null
          pattern_signature?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          abuse_type?: string
          action_taken?: string | null
          confidence?: number | null
          created_at?: string
          detected_by?: string
          fingerprint?: string | null
          id?: string
          metadata?: Json | null
          pattern_signature?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action_target: string | null
          action_type: string
          action_value: string | null
          created_at: string
          fingerprint: string | null
          id: string
          metadata: Json | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          action_target?: string | null
          action_type: string
          action_value?: string | null
          created_at?: string
          fingerprint?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          action_target?: string | null
          action_type?: string
          action_value?: string | null
          created_at?: string
          fingerprint?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          consent_type: string
          created_at: string
          fingerprint: string | null
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          revoked_at: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          consent_type: string
          created_at?: string
          fingerprint?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string
          fingerprint?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversation_history: {
        Row: {
          created_at: string
          id: string
          models_used: string[]
          prompt: string
          response_count: number
          session_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          models_used?: string[]
          prompt: string
          response_count?: number
          session_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          models_used?: string[]
          prompt?: string
          response_count?: number
          session_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_config: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: number
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      credit_holds: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          expires_at: string
          id: string
          reason: string
          released: boolean
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          expires_at?: string
          id?: string
          reason?: string
          released?: boolean
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          expires_at?: string
          id?: string
          reason?: string
          released?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "credit_holds_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "user_credits"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          credit_account_id: string
          description: string | null
          id: string
          metadata: Json | null
          source: Database["public"]["Enums"]["credit_source"]
          usage_type: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          credit_account_id: string
          description?: string | null
          id?: string
          metadata?: Json | null
          source: Database["public"]["Enums"]["credit_source"]
          usage_type?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          credit_account_id?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          source?: Database["public"]["Enums"]["credit_source"]
          usage_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "user_credits"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_tester_approvals: {
        Row: {
          created_at: string
          email: string
          id: string
          invite_code: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          team_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invite_code: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invite_code?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_tester_approvals_invite_code_fkey"
            columns: ["invite_code"]
            isOneToOne: false
            referencedRelation: "tester_invites"
            referencedColumns: ["invite_code"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          model_assignments: Json | null
          onboarding_complete: boolean | null
          tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          model_assignments?: Json | null
          onboarding_complete?: boolean | null
          tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          model_assignments?: Json | null
          onboarding_complete?: boolean | null
          tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          credit_account_id: string
          credits_spent: number
          id: string
          request_count: number
          window_start: string
        }
        Insert: {
          credit_account_id: string
          credits_spent?: number
          id?: string
          request_count?: number
          window_start?: string
        }
        Update: {
          credit_account_id?: string
          credits_spent?: number
          id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "user_credits"
            referencedColumns: ["id"]
          },
        ]
      }
      shadow_events: {
        Row: {
          confidence: number
          created_at: string
          event_type: Database["public"]["Enums"]["shadow_event_type"]
          event_value: string | null
          fingerprint: string | null
          id: string
          metadata: Json | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          confidence?: number
          created_at?: string
          event_type: Database["public"]["Enums"]["shadow_event_type"]
          event_value?: string | null
          fingerprint?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string
          event_type?: Database["public"]["Enums"]["shadow_event_type"]
          event_value?: string | null
          fingerprint?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      shadow_sessions: {
        Row: {
          clarity_moments: number | null
          dominant_intent: string | null
          fingerprint: string | null
          friction_count: number | null
          id: string
          last_activity_at: string
          max_depth: string | null
          message_count: number | null
          session_id: string
          started_at: string
          total_credits_spent: number | null
          total_tokens: number | null
          upgrade_signal_score: number | null
          upgrade_triggered: boolean | null
          user_id: string | null
        }
        Insert: {
          clarity_moments?: number | null
          dominant_intent?: string | null
          fingerprint?: string | null
          friction_count?: number | null
          id?: string
          last_activity_at?: string
          max_depth?: string | null
          message_count?: number | null
          session_id: string
          started_at?: string
          total_credits_spent?: number | null
          total_tokens?: number | null
          upgrade_signal_score?: number | null
          upgrade_triggered?: boolean | null
          user_id?: string | null
        }
        Update: {
          clarity_moments?: number | null
          dominant_intent?: string | null
          fingerprint?: string | null
          friction_count?: number | null
          id?: string
          last_activity_at?: string
          max_depth?: string | null
          message_count?: number | null
          session_id?: string
          started_at?: string
          total_credits_spent?: number | null
          total_tokens?: number | null
          upgrade_signal_score?: number | null
          upgrade_triggered?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      test_accounts: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          email: string
          id: string
          starting_credits: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email: string
          id?: string
          starting_credits?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email?: string
          id?: string
          starting_credits?: number | null
        }
        Relationships: []
      }
      tester_invites: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          invite_code: string
          is_active: boolean | null
          max_uses: number | null
          team_name: string
          uses_count: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          invite_code: string
          is_active?: boolean | null
          max_uses?: number | null
          team_name: string
          uses_count?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean | null
          max_uses?: number | null
          team_name?: string
          uses_count?: number | null
        }
        Relationships: []
      }
      upgrade_triggers: {
        Row: {
          active: boolean | null
          conditions: Json
          created_at: string
          id: string
          message: string
          priority: number | null
          trigger_name: string
        }
        Insert: {
          active?: boolean | null
          conditions: Json
          created_at?: string
          id?: string
          message: string
          priority?: number | null
          trigger_name: string
        }
        Update: {
          active?: boolean | null
          conditions?: Json
          created_at?: string
          id?: string
          message?: string
          priority?: number | null
          trigger_name?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          completion_tokens: number | null
          context_id: string
          cost_cents: number | null
          created_at: string | null
          id: string
          is_tester_session: boolean | null
          metadata: Json | null
          model_id: string | null
          prompt_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          context_id: string
          cost_cents?: number | null
          created_at?: string | null
          id?: string
          is_tester_session?: boolean | null
          metadata?: Json | null
          model_id?: string | null
          prompt_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          context_id?: string
          cost_cents?: number | null
          created_at?: string | null
          id?: string
          is_tester_session?: boolean | null
          metadata?: Json | null
          model_id?: string | null
          prompt_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          created_at: string
          date: string
          id: string
          identifier: string
          identifier_type: string
          questions_used: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          identifier: string
          identifier_type: string
          questions_used?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          identifier?: string
          identifier_type?: string
          questions_used?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          banned_at: string
          banned_by: string | null
          created_at: string
          expires_at: string | null
          fingerprint: string | null
          id: string
          metadata: Json | null
          reason: string
          severity: string
          user_id: string | null
        }
        Insert: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          fingerprint?: string | null
          id?: string
          metadata?: Json | null
          reason: string
          severity?: string
          user_id?: string | null
        }
        Update: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          fingerprint?: string | null
          id?: string
          metadata?: Json | null
          reason?: string
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          created_at: string
          fingerprint: string | null
          id: string
          lifetime_earned: number
          lifetime_spent: number
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          fingerprint?: string | null
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          fingerprint?: string | null
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          context: string | null
          created_at: string
          feedback_type: string
          fingerprint: string | null
          id: string
          message: string | null
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          severity: string | null
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          feedback_type: string
          fingerprint?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          feedback_type?: string
          fingerprint?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          converted_to_user: boolean | null
          created_at: string
          email: string
          full_name: string
          id: string
          notified: boolean | null
          preferred_models: string[] | null
          profession: string | null
          referral_source: string | null
          use_case: string
        }
        Insert: {
          converted_to_user?: boolean | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          notified?: boolean | null
          preferred_models?: string[] | null
          profession?: string | null
          referral_source?: string | null
          use_case: string
        }
        Update: {
          converted_to_user?: boolean | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notified?: boolean | null
          preferred_models?: string[] | null
          profession?: string | null
          referral_source?: string | null
          use_case?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_credits: {
        Args: { adjustment: number; reason?: string; target_user_id: string }
        Returns: number
      }
      cleanup_expired_holds: { Args: never; Returns: undefined }
      generate_referral_code: { Args: never; Returns: string }
      get_waitlist_count: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_banned: {
        Args: { _fingerprint?: string; _user_id?: string }
        Returns: {
          ban_reason: string
          ban_severity: string
          expires_at: string
          is_banned: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "tester"
      credit_source:
        | "signup_bonus"
        | "referral_earned"
        | "referral_bonus"
        | "daily_refresh"
        | "purchase"
        | "admin_grant"
        | "usage"
        | "refund"
        | "trial"
      shadow_event_type:
        | "intent_exploration"
        | "intent_decision"
        | "intent_reflection"
        | "intent_creative"
        | "intent_problem_solving"
        | "intent_meta_reasoning"
        | "depth_surface"
        | "depth_structured"
        | "depth_multi_step"
        | "depth_recursive"
        | "depth_meta"
        | "friction_rephrase"
        | "friction_clarify"
        | "friction_abandon"
        | "friction_tone_shift"
        | "friction_retry"
        | "outcome_clarity"
        | "outcome_decision"
        | "outcome_idea"
        | "outcome_abandoned"
        | "outcome_escalated"
        | "action_click"
        | "action_navigation"
        | "action_form_submit"
        | "action_model_select"
        | "action_copy"
        | "action_export"
        | "action_settings_change"
        | "action_attachment"
        | "action_follow_up"
        | "consent_privacy"
        | "consent_analytics"
        | "consent_functional"
        | "feedback_friction"
        | "feedback_helpful"
        | "feedback_not_helpful"
        | "feedback_report"
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
      app_role: ["admin", "user", "tester"],
      credit_source: [
        "signup_bonus",
        "referral_earned",
        "referral_bonus",
        "daily_refresh",
        "purchase",
        "admin_grant",
        "usage",
        "refund",
        "trial",
      ],
      shadow_event_type: [
        "intent_exploration",
        "intent_decision",
        "intent_reflection",
        "intent_creative",
        "intent_problem_solving",
        "intent_meta_reasoning",
        "depth_surface",
        "depth_structured",
        "depth_multi_step",
        "depth_recursive",
        "depth_meta",
        "friction_rephrase",
        "friction_clarify",
        "friction_abandon",
        "friction_tone_shift",
        "friction_retry",
        "outcome_clarity",
        "outcome_decision",
        "outcome_idea",
        "outcome_abandoned",
        "outcome_escalated",
        "action_click",
        "action_navigation",
        "action_form_submit",
        "action_model_select",
        "action_copy",
        "action_export",
        "action_settings_change",
        "action_attachment",
        "action_follow_up",
        "consent_privacy",
        "consent_analytics",
        "consent_functional",
        "feedback_friction",
        "feedback_helpful",
        "feedback_not_helpful",
        "feedback_report",
      ],
    },
  },
} as const
