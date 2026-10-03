export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      app_invitations: {
        Row: {
          account_created_at: string | null;
          code: string;
          created_at: string;
          expires_at: string;
          id: string;
          issued_by: string | null;
          reserved_email: string | null;
          revoked_at: string | null;
          used_at: string | null;
        };
        Insert: {
          account_created_at?: string | null;
          code: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          issued_by?: string | null;
          reserved_email?: string | null;
          revoked_at?: string | null;
          used_at?: string | null;
        };
        Update: {
          account_created_at?: string | null;
          code?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          issued_by?: string | null;
          reserved_email?: string | null;
          revoked_at?: string | null;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "app_invitations_issued_by_fkey";
            columns: ["issued_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      app_settings: {
        Row: {
          account_cap: number;
          id: boolean;
          invitation_quota: number;
          signup_mode: string;
        };
        Insert: {
          account_cap?: number;
          id?: boolean;
          invitation_quota?: number;
          signup_mode?: string;
        };
        Update: {
          account_cap?: number;
          id?: boolean;
          invitation_quota?: number;
          signup_mode?: string;
        };
        Relationships: [];
      };
      articles: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          list_id: string;
          name: string;
          normalized_name: string;
          quantity: number | null;
          rayon_id: string;
          status: string;
          status_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id: string;
          list_id: string;
          name: string;
          normalized_name?: never;
          quantity?: number | null;
          rayon_id: string;
          status?: string;
          status_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          list_id?: string;
          name?: string;
          normalized_name?: never;
          quantity?: number | null;
          rayon_id?: string;
          status?: string;
          status_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "articles_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "articles_rayon_id_fkey";
            columns: ["rayon_id"];
            isOneToOne: false;
            referencedRelation: "rayons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "articles_status_by_fkey";
            columns: ["status_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "articles_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          account_created_at: string | null;
          code: string;
          created_at: string;
          expires_at: string;
          id: string;
          issued_by: string | null;
          list_id: string;
          reserved_email: string | null;
          revoked_at: string | null;
          used_at: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          account_created_at?: string | null;
          code: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          issued_by?: string | null;
          list_id: string;
          reserved_email?: string | null;
          revoked_at?: string | null;
          used_at?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          account_created_at?: string | null;
          code?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          issued_by?: string | null;
          list_id?: string;
          reserved_email?: string | null;
          revoked_at?: string | null;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_issued_by_fkey";
            columns: ["issued_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
      list_members: {
        Row: {
          is_creator: boolean;
          joined_at: string;
          list_id: string;
          user_id: string;
        };
        Insert: {
          is_creator?: boolean;
          joined_at?: string;
          list_id: string;
          user_id: string;
        };
        Update: {
          is_creator?: boolean;
          joined_at?: string;
          list_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "list_members_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "list_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      list_removals: {
        Row: {
          list_id: string;
          removed_at: string;
          user_id: string;
        };
        Insert: {
          list_id: string;
          removed_at?: string;
          user_id: string;
        };
        Update: {
          list_id?: string;
          removed_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "list_removals_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "list_removals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lists: {
        Row: {
          activity_at: string;
          created_at: string;
          emoji: string;
          id: string;
          name: string;
        };
        Insert: {
          activity_at?: string;
          created_at?: string;
          emoji?: string;
          id: string;
          name: string;
        };
        Update: {
          activity_at?: string;
          created_at?: string;
          emoji?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          role: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          role?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          role?: string;
        };
        Relationships: [];
      };
      rayons: {
        Row: {
          deletable: boolean;
          id: string;
          name: string;
          reference_order: number;
        };
        Insert: {
          deletable?: boolean;
          id?: string;
          name: string;
          reference_order: number;
        };
        Update: {
          deletable?: boolean;
          id?: string;
          name?: string;
          reference_order?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accepter_invitation: { Args: { p_code: string }; Returns: string };
      accepter_invitations_en_attente: { Args: Record<PropertyKey, never>; Returns: string[] };
      controle_inscription: { Args: { event: Json }; Returns: Json };
      copier_liste: {
        Args: { p_emoji: string; p_id: string; p_name: string; p_source_id: string };
        Returns: undefined;
      };
      creer_article: {
        Args: {
          p_id: string;
          p_list_id: string;
          p_name: string;
          p_quantity: number;
          p_rayon_id: string;
        };
        Returns: {
          article_id: string;
          merged: boolean;
        }[];
      };
      creer_invitation: {
        Args: { p_list_id: string };
        Returns: {
          code: string;
          expires_at: string;
          id: string;
        }[];
      };
      creer_liste: { Args: { p_emoji: string; p_id: string; p_name: string }; Returns: undefined };
      est_membre: { Args: { p_list_id: string }; Returns: boolean };
      liberer_inscriptions_non_confirmees: { Args: Record<PropertyKey, never>; Returns: undefined };
      mon_profil: {
        Args: Record<PropertyKey, never>;
        Returns: {
          display_name: string;
          id: string;
          role: string;
        }[];
      };
      normaliser_nom: { Args: { p_name: string }; Returns: string };
      partage_une_liste: { Args: { p_user_id: string }; Returns: boolean };
      quitter_liste: { Args: { p_list_id: string }; Returns: undefined };
      retirer_membre: { Args: { p_list_id: string; p_user_id: string }; Returns: undefined };
      revoquer_invitation: { Args: { p_id: string }; Returns: undefined };
      set_status: { Args: { p_article_id: string; p_status: string }; Returns: undefined };
      supprimer_liste: { Args: { p_list_id: string; p_name: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
