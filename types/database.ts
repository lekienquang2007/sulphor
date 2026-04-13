export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          business_name: string | null
          onboarding_complete: boolean
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          business_name?: string | null
          onboarding_complete?: boolean
          created_at?: string
        }
        Update: {
          display_name?: string | null
          business_name?: string | null
          onboarding_complete?: boolean
        }
        Relationships: []
      }
      stripe_connections: {
        Row: {
          id: string
          user_id: string
          stripe_account_id: string
          access_token: string
          refresh_token: string | null
          livemode: boolean
          status: string
          last_synced_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_account_id: string
          access_token: string
          refresh_token?: string | null
          livemode?: boolean
          status?: string
          last_synced_at?: string | null
          created_at?: string
        }
        Update: {
          access_token?: string
          refresh_token?: string | null
          status?: string
          last_synced_at?: string | null
        }
        Relationships: []
      }
      stripe_payouts: {
        Row: {
          id: string
          user_id: string
          stripe_payout_id: string
          amount: number
          currency: string
          arrival_date: string
          status: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_payout_id: string
          amount: number
          currency?: string
          arrival_date: string
          status: string
          description?: string | null
          created_at?: string
        }
        Update: {
          status?: string
          description?: string | null
        }
        Relationships: []
      }
      stripe_balance_snapshots: {
        Row: {
          id: string
          user_id: string
          available_amount: number
          pending_amount: number
          currency: string
          snapshot_at: string
        }
        Insert: {
          id?: string
          user_id: string
          available_amount: number
          pending_amount: number
          currency?: string
          snapshot_at?: string
        }
        Update: {
          available_amount?: number
          pending_amount?: number
        }
        Relationships: []
      }
      allocation_rules: {
        Row: {
          id: string
          user_id: string
          bucket_name: string
          label: string
          rule_type: string
          value: number
          priority: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bucket_name: string
          label: string
          rule_type: string
          value: number
          priority?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          label?: string
          rule_type?: string
          value?: number
          priority?: number
          is_active?: boolean
        }
        Relationships: []
      }
      virtual_buckets: {
        Row: {
          id: string
          user_id: string
          bucket_name: string
          label: string
          current_balance: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bucket_name: string
          label: string
          current_balance?: number
          created_at?: string
        }
        Update: {
          label?: string
          current_balance?: number
        }
        Relationships: []
      }
      virtual_bucket_entries: {
        Row: {
          id: string
          user_id: string
          bucket_id: string
          payout_plan_id: string | null
          amount: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bucket_id: string
          payout_plan_id?: string | null
          amount: number
          description?: string | null
          created_at?: string
        }
        Update: {
          amount?: number
        }
        Relationships: []
      }
      payout_plans: {
        Row: {
          id: string
          user_id: string
          stripe_payout_id: string
          payout_amount: number
          spendable_amount: number
          status: string
          ai_summary: string | null
          rules_snapshot: Json | null
          created_at: string
          approved_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          stripe_payout_id: string
          payout_amount: number
          spendable_amount: number
          status?: string
          ai_summary?: string | null
          rules_snapshot?: Json | null
          created_at?: string
          approved_at?: string | null
        }
        Update: {
          status?: string
          ai_summary?: string | null
          approved_at?: string | null
        }
        Relationships: []
      }
      payout_plan_items: {
        Row: {
          id: string
          user_id: string
          payout_plan_id: string
          bucket_name: string
          label: string
          amount: number
          rule_type: string
          rule_value: number
        }
        Insert: {
          id?: string
          user_id: string
          payout_plan_id: string
          bucket_name: string
          label: string
          amount: number
          rule_type: string
          rule_value: number
        }
        Update: {
          amount?: number
        }
        Relationships: []
      }
      plan_approvals: {
        Row: {
          id: string
          user_id: string
          payout_plan_id: string | null
          action: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          payout_plan_id?: string | null
          action: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          notes?: string | null
        }
        Relationships: []
      }
      event_logs: {
        Row: {
          id: string
          user_id: string
          event_type: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          metadata?: Json | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
