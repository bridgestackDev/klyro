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
      appointments: {
        Row: {
          booking_code: string | null
          branch_id: string
          business_id: string
          cancel_token: string
          cancelled_at: string | null
          client_id: string
          created_at: string
          ends_at: string
          id: string
          notes: string | null
          service_id: string
          staff_id: string
          starts_at: string
          status: string
        }
        Insert: {
          booking_code?: string | null
          branch_id: string
          business_id: string
          cancel_token?: string
          cancelled_at?: string | null
          client_id: string
          created_at?: string
          ends_at: string
          id?: string
          notes?: string | null
          service_id: string
          staff_id: string
          starts_at: string
          status?: string
        }
        Update: {
          booking_code?: string | null
          branch_id?: string
          business_id?: string
          cancel_token?: string
          cancelled_at?: string | null
          client_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          notes?: string | null
          service_id?: string
          staff_id?: string
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_services: {
        Row: {
          branch_id: string
          id: string
          price_override: number | null
          service_id: string
        }
        Insert: {
          branch_id: string
          id?: string
          price_override?: number | null
          service_id: string
        }
        Update: {
          branch_id?: string
          id?: string
          price_override?: number | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          business_id: string
          city: string | null
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          slug: string
          timezone: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          slug: string
          timezone?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          slug?: string
          timezone?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          country: string
          created_at: string
          default_currency: string
          default_language: string
          id: string
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          slug: string
          updated_at: string
          vertical: string
        }
        Insert: {
          country?: string
          created_at?: string
          default_currency?: string
          default_language?: string
          id?: string
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean
          slug: string
          updated_at?: string
          vertical: string
        }
        Update: {
          country?: string
          created_at?: string
          default_currency?: string
          default_language?: string
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean
          slug?: string
          updated_at?: string
          vertical?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          preferred_language: string | null
          total_spent: number
          total_visits: number
          whatsapp_number: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          preferred_language?: string | null
          total_spent?: number
          total_visits?: number
          whatsapp_number?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          preferred_language?: string | null
          total_spent?: number
          total_visits?: number
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          channel: string
          content: string
          id: string
          is_active: boolean
          language: string
          type: string
          variables: Json
          vertical: string
        }
        Insert: {
          channel: string
          content: string
          id?: string
          is_active?: boolean
          language: string
          type: string
          variables?: Json
          vertical: string
        }
        Update: {
          channel?: string
          content?: string
          id?: string
          is_active?: boolean
          language?: string
          type?: string
          variables?: Json
          vertical?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          appointment_id: string | null
          business_id: string
          channel: string
          created_at: string
          error: string | null
          id: string
          provider_message_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          type: string
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          type: string
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          created_at: string
          currency: string
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          business_id: string
          created_at?: string
          currency?: string
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price: number
        }
        Update: {
          business_id?: string
          created_at?: string
          currency?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          avatar_url: string | null
          business_id: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          slug: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_id: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          slug: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_id?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          slug?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_availability: {
        Row: {
          branch_id: string
          day_of_week: number
          end_time: string
          id: string
          staff_id: string
          start_time: string
        }
        Insert: {
          branch_id: string
          day_of_week: number
          end_time: string
          id?: string
          staff_id: string
          start_time: string
        }
        Update: {
          branch_id?: string
          day_of_week?: number
          end_time?: string
          id?: string
          staff_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_availability_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_availability_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_branches: {
        Row: {
          branch_id: string
          id: string
          staff_id: string
        }
        Insert: {
          branch_id: string
          id?: string
          staff_id: string
        }
        Update: {
          branch_id?: string
          id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_branches_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          business_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          provider: string | null
          role: string
        }
        Insert: {
          avatar_url?: string | null
          business_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          provider?: string | null
          role: string
        }
        Update: {
          avatar_url?: string | null
          business_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          provider?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      replace_branch_services: {
        Args: { p_branch_id: string; p_business_id: string; p_services: Json }
        Returns: undefined
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
    Enums: {},
  },
} as const
