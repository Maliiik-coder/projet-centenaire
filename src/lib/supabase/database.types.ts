export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name: string | null;
          age: number | null;
          height_cm: number | null;
          start_weight_kg: number | null;
          goal_weight_kg: number | null;
          start_date: string | null;
          smoking_enabled: boolean;
          smoking_status: string | null;
          smoking_goal: string | null;
          initial_friction: string | null;
          show_active_mission: boolean;
          dark_mode: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          first_name?: string | null;
          age?: number | null;
          height_cm?: number | null;
          start_weight_kg?: number | null;
          goal_weight_kg?: number | null;
          start_date?: string | null;
          smoking_enabled?: boolean;
          smoking_status?: string | null;
          smoking_goal?: string | null;
          initial_friction?: string | null;
          show_active_mission?: boolean;
          dark_mode?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          first_name?: string | null;
          age?: number | null;
          height_cm?: number | null;
          start_weight_kg?: number | null;
          goal_weight_kg?: number | null;
          start_date?: string | null;
          smoking_enabled?: boolean;
          smoking_status?: string | null;
          smoking_goal?: string | null;
          initial_friction?: string | null;
          show_active_mission?: boolean;
          dark_mode?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      weight_entries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          weight_kg: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entry_date: string;
          weight_kg: number;
          created_at?: string;
        };
        Update: {
          entry_date?: string;
          weight_kg?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      meal_observations: {
        Row: {
          id: string;
          user_id: string;
          observed_at: string;
          observed_date: string | null;
          observed_time: string | null;
          meal_type: string | null;
          raw_text: string | null;
          quantity_served: string | null;
          serving_pattern: string | null;
          hunger_before: string | null;
          fullness_after: string | null;
          stop_reason: string | null;
          post_meal_snacking: string | null;
          starter_taken: boolean | null;
          starter_text: string | null;
          dessert_taken: boolean | null;
          dessert_text: string | null;
          snack_trigger: string | null;
          snack_context: string | null;
          clarifications: Json | null;
          questionnaire_version: string | null;
          main_signal: string | null;
          immediate_constat: string | null;
          immediate_reading: string | null;
          immediate_next_action: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          observed_at: string;
          observed_date?: string | null;
          observed_time?: string | null;
          meal_type?: string | null;
          raw_text?: string | null;
          quantity_served?: string | null;
          serving_pattern?: string | null;
          hunger_before?: string | null;
          fullness_after?: string | null;
          stop_reason?: string | null;
          post_meal_snacking?: string | null;
          starter_taken?: boolean | null;
          starter_text?: string | null;
          dessert_taken?: boolean | null;
          dessert_text?: string | null;
          snack_trigger?: string | null;
          snack_context?: string | null;
          clarifications?: Json | null;
          questionnaire_version?: string | null;
          main_signal?: string | null;
          immediate_constat?: string | null;
          immediate_reading?: string | null;
          immediate_next_action?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          observed_at?: string;
          observed_date?: string | null;
          observed_time?: string | null;
          meal_type?: string | null;
          raw_text?: string | null;
          quantity_served?: string | null;
          serving_pattern?: string | null;
          hunger_before?: string | null;
          fullness_after?: string | null;
          stop_reason?: string | null;
          post_meal_snacking?: string | null;
          starter_taken?: boolean | null;
          starter_text?: string | null;
          dessert_taken?: boolean | null;
          dessert_text?: string | null;
          snack_trigger?: string | null;
          snack_context?: string | null;
          clarifications?: Json | null;
          questionnaire_version?: string | null;
          main_signal?: string | null;
          immediate_constat?: string | null;
          immediate_reading?: string | null;
          immediate_next_action?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      meal_observation_tags: {
        Row: {
          id: string;
          observation_id: string;
          user_id: string;
          tag: string;
        };
        Insert: {
          id?: string;
          observation_id: string;
          user_id: string;
          tag: string;
        };
        Update: {
          tag?: string;
        };
        Relationships: [];
      };
      tobacco_events: {
        Row: {
          id: string;
          user_id: string;
          event_date: string;
          event_type: string;
          trigger: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_date: string;
          event_type: string;
          trigger?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          event_date?: string;
          event_type?: string;
          trigger?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      weekly_reports: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          meals_count: number;
          main_friction: string | null;
          proof_level: string | null;
          priority: string | null;
          generated_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          meals_count?: number;
          main_friction?: string | null;
          proof_level?: string | null;
          priority?: string | null;
          generated_text?: string | null;
          created_at?: string;
        };
        Update: {
          meals_count?: number;
          main_friction?: string | null;
          proof_level?: string | null;
          priority?: string | null;
          generated_text?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
