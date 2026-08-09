export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  api: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      business_profiles: {
        Row: {
          created_at: string | null;
          default_locale: string | null;
          id: string | null;
          organization_id: string | null;
          public_name: string | null;
          time_zone: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          default_locale?: string | null;
          id?: string | null;
          organization_id?: string | null;
          public_name?: string | null;
          time_zone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          default_locale?: string | null;
          id?: string | null;
          organization_id?: string | null;
          public_name?: string | null;
          time_zone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_profiles_organization_fk";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_attribute_allowed_units: {
        Row: {
          attribute_definition_id: string | null;
          created_at: string | null;
          organization_id: string | null;
          unit_id: string | null;
        };
        Insert: {
          attribute_definition_id?: string | null;
          created_at?: string | null;
          organization_id?: string | null;
          unit_id?: string | null;
        };
        Update: {
          attribute_definition_id?: string | null;
          created_at?: string | null;
          organization_id?: string | null;
          unit_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_attribute_allowed_units_definition_fk";
            columns: ["organization_id", "attribute_definition_id"];
            isOneToOne: false;
            referencedRelation: "catalog_attribute_definitions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_attribute_allowed_units_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_attribute_definitions: {
        Row: {
          allows_unit: boolean | null;
          cardinality_max: number | null;
          cardinality_min: number | null;
          category_id: string | null;
          code: string | null;
          created_at: string | null;
          description: string | null;
          id: string | null;
          is_filterable: boolean | null;
          is_public: boolean | null;
          is_searchable: boolean | null;
          name: string | null;
          organization_id: string | null;
          required_on_activation: boolean | null;
          scope: string | null;
          sort_order: number | null;
          status: string | null;
          updated_at: string | null;
          value_type: string | null;
        };
        Insert: {
          allows_unit?: boolean | null;
          cardinality_max?: number | null;
          cardinality_min?: number | null;
          category_id?: string | null;
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          is_filterable?: boolean | null;
          is_public?: boolean | null;
          is_searchable?: boolean | null;
          name?: string | null;
          organization_id?: string | null;
          required_on_activation?: boolean | null;
          scope?: string | null;
          sort_order?: number | null;
          status?: string | null;
          updated_at?: string | null;
          value_type?: string | null;
        };
        Update: {
          allows_unit?: boolean | null;
          cardinality_max?: number | null;
          cardinality_min?: number | null;
          category_id?: string | null;
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          is_filterable?: boolean | null;
          is_public?: boolean | null;
          is_searchable?: boolean | null;
          name?: string | null;
          organization_id?: string | null;
          required_on_activation?: boolean | null;
          scope?: string | null;
          sort_order?: number | null;
          status?: string | null;
          updated_at?: string | null;
          value_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_attribute_definitions_category_fk";
            columns: ["organization_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "catalog_categories";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_attribute_options: {
        Row: {
          attribute_definition_id: string | null;
          code: string | null;
          created_at: string | null;
          id: string | null;
          label: string | null;
          organization_id: string | null;
          sort_order: number | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          attribute_definition_id?: string | null;
          code?: string | null;
          created_at?: string | null;
          id?: string | null;
          label?: string | null;
          organization_id?: string | null;
          sort_order?: number | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          attribute_definition_id?: string | null;
          code?: string | null;
          created_at?: string | null;
          id?: string | null;
          label?: string | null;
          organization_id?: string | null;
          sort_order?: number | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_attribute_options_definition_fk";
            columns: ["organization_id", "attribute_definition_id"];
            isOneToOne: false;
            referencedRelation: "catalog_attribute_definitions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_candidate_matches: {
        Row: {
          candidate_kind: string | null;
          candidate_product_id: string | null;
          candidate_variant_id: string | null;
          confidence: number | null;
          created_at: string | null;
          differences: Json | null;
          draft_id: string | null;
          id: string | null;
          organization_id: string | null;
          rank: number | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          candidate_kind?: string | null;
          candidate_product_id?: string | null;
          candidate_variant_id?: string | null;
          confidence?: number | null;
          created_at?: string | null;
          differences?: Json | null;
          draft_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          rank?: number | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          candidate_kind?: string | null;
          candidate_product_id?: string | null;
          candidate_variant_id?: string | null;
          confidence?: number | null;
          created_at?: string | null;
          differences?: Json | null;
          draft_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          rank?: number | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_candidate_matches_draft_fk";
            columns: ["organization_id", "draft_id"];
            isOneToOne: false;
            referencedRelation: "catalog_ingestion_drafts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_candidate_matches_product_fk";
            columns: ["organization_id", "candidate_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_candidate_matches_variant_fk";
            columns: ["organization_id", "candidate_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_categories: {
        Row: {
          code: string | null;
          created_at: string | null;
          description: string | null;
          id: string | null;
          name: string | null;
          organization_id: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          name?: string | null;
          organization_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          name?: string | null;
          organization_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_categories_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_ingestion_drafts: {
        Row: {
          applied_product_id: string | null;
          applied_variant_id: string | null;
          category_id: string | null;
          confidence: number | null;
          created_at: string | null;
          id: string | null;
          organization_id: string | null;
          proposal: Json | null;
          revision: number | null;
          source_conversation_id: string | null;
          source_message_id: string | null;
          status: string | null;
          unresolved_fields: Json | null;
          updated_at: string | null;
        };
        Insert: {
          applied_product_id?: string | null;
          applied_variant_id?: string | null;
          category_id?: string | null;
          confidence?: number | null;
          created_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          proposal?: Json | null;
          revision?: number | null;
          source_conversation_id?: string | null;
          source_message_id?: string | null;
          status?: string | null;
          unresolved_fields?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          applied_product_id?: string | null;
          applied_variant_id?: string | null;
          category_id?: string | null;
          confidence?: number | null;
          created_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          proposal?: Json | null;
          revision?: number | null;
          source_conversation_id?: string | null;
          source_message_id?: string | null;
          status?: string | null;
          unresolved_fields?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_ingestion_drafts_applied_product_fk";
            columns: ["organization_id", "applied_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_ingestion_drafts_applied_variant_fk";
            columns: ["organization_id", "applied_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_ingestion_drafts_category_fk";
            columns: ["organization_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "catalog_categories";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_ingestion_drafts_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "catalog_ingestion_drafts_source_conversation_fk";
            columns: ["organization_id", "source_conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_ingestion_drafts_source_message_fk";
            columns: ["organization_id", "source_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_resolution_decisions: {
        Row: {
          created_at: string | null;
          decided_by_user_id: string | null;
          decision: string | null;
          draft_id: string | null;
          evidence_id: string | null;
          id: string | null;
          organization_id: string | null;
          rationale: string | null;
          selected_candidate_match_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          decided_by_user_id?: string | null;
          decision?: string | null;
          draft_id?: string | null;
          evidence_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          rationale?: string | null;
          selected_candidate_match_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          decided_by_user_id?: string | null;
          decision?: string | null;
          draft_id?: string | null;
          evidence_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          rationale?: string | null;
          selected_candidate_match_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_resolution_decisions_candidate_fk";
            columns: ["organization_id", "selected_candidate_match_id"];
            isOneToOne: false;
            referencedRelation: "catalog_candidate_matches";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_resolution_decisions_draft_fk";
            columns: ["organization_id", "draft_id"];
            isOneToOne: true;
            referencedRelation: "catalog_ingestion_drafts";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_units: {
        Row: {
          code: string | null;
          created_at: string | null;
          decimal_scale: number | null;
          id: string | null;
          name_plural: string | null;
          name_singular: string | null;
          organization_id: string | null;
          quantity_kind: string | null;
          status: string | null;
          symbol: string | null;
          updated_at: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string | null;
          decimal_scale?: number | null;
          id?: string | null;
          name_plural?: string | null;
          name_singular?: string | null;
          organization_id?: string | null;
          quantity_kind?: string | null;
          status?: string | null;
          symbol?: string | null;
          updated_at?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string | null;
          decimal_scale?: number | null;
          id?: string | null;
          name_plural?: string | null;
          name_singular?: string | null;
          organization_id?: string | null;
          quantity_kind?: string | null;
          status?: string | null;
          symbol?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_units_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      channel_connections: {
        Row: {
          api_version: string | null;
          channel: string | null;
          connected_at: string | null;
          created_at: string | null;
          disabled_at: string | null;
          display_name: string | null;
          external_account_id: string | null;
          external_app_id: string | null;
          external_sender_id: string | null;
          id: string | null;
          last_verified_at: string | null;
          organization_id: string | null;
          provider: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          api_version?: string | null;
          channel?: string | null;
          connected_at?: string | null;
          created_at?: string | null;
          disabled_at?: string | null;
          display_name?: string | null;
          external_account_id?: string | null;
          external_app_id?: string | null;
          external_sender_id?: string | null;
          id?: string | null;
          last_verified_at?: string | null;
          organization_id?: string | null;
          provider?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          api_version?: string | null;
          channel?: string | null;
          connected_at?: string | null;
          created_at?: string | null;
          disabled_at?: string | null;
          display_name?: string | null;
          external_account_id?: string | null;
          external_app_id?: string | null;
          external_sender_id?: string | null;
          id?: string | null;
          last_verified_at?: string | null;
          organization_id?: string | null;
          provider?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "channel_connections_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      channel_identities: {
        Row: {
          channel_connection_id: string | null;
          contact_id: string | null;
          created_at: string | null;
          display_name: string | null;
          external_subject_id: string | null;
          id: string | null;
          last_seen_at: string | null;
          member_user_id: string | null;
          organization_id: string | null;
          principal_type: string | null;
          revoked_at: string | null;
          status: string | null;
          trust_level: string | null;
          updated_at: string | null;
          verified_at: string | null;
        };
        Insert: {
          channel_connection_id?: string | null;
          contact_id?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          external_subject_id?: string | null;
          id?: string | null;
          last_seen_at?: string | null;
          member_user_id?: string | null;
          organization_id?: string | null;
          principal_type?: string | null;
          revoked_at?: string | null;
          status?: string | null;
          trust_level?: string | null;
          updated_at?: string | null;
          verified_at?: string | null;
        };
        Update: {
          channel_connection_id?: string | null;
          contact_id?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          external_subject_id?: string | null;
          id?: string | null;
          last_seen_at?: string | null;
          member_user_id?: string | null;
          organization_id?: string | null;
          principal_type?: string | null;
          revoked_at?: string | null;
          status?: string | null;
          trust_level?: string | null;
          updated_at?: string | null;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "channel_identities_connection_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "channel_identities_contact_fk";
            columns: ["organization_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "channel_identities_member_fk";
            columns: ["organization_id", "member_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
        ];
      };
      consents: {
        Row: {
          channel_connection_id: string | null;
          channel_identity_id: string | null;
          decision: string | null;
          effective_at: string | null;
          evidence_message_id: string | null;
          expires_at: string | null;
          id: string | null;
          organization_id: string | null;
          purpose: string | null;
          recorded_at: string | null;
          source: string | null;
        };
        Insert: {
          channel_connection_id?: string | null;
          channel_identity_id?: string | null;
          decision?: string | null;
          effective_at?: string | null;
          evidence_message_id?: string | null;
          expires_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          purpose?: string | null;
          recorded_at?: string | null;
          source?: string | null;
        };
        Update: {
          channel_connection_id?: string | null;
          channel_identity_id?: string | null;
          decision?: string | null;
          effective_at?: string | null;
          evidence_message_id?: string | null;
          expires_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          purpose?: string | null;
          recorded_at?: string | null;
          source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "consents_evidence_message_fk";
            columns: ["organization_id", "channel_connection_id", "evidence_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "consents_identity_fk";
            columns: ["organization_id", "channel_connection_id", "channel_identity_id"];
            isOneToOne: false;
            referencedRelation: "channel_identities";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
        ];
      };
      contacts: {
        Row: {
          created_at: string | null;
          display_name: string | null;
          id: string | null;
          organization_id: string | null;
          preferred_locale: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          display_name?: string | null;
          id?: string | null;
          organization_id?: string | null;
          preferred_locale?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          display_name?: string | null;
          id?: string | null;
          organization_id?: string | null;
          preferred_locale?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_participants: {
        Row: {
          agent_key: string | null;
          channel_connection_id: string | null;
          channel_identity_id: string | null;
          conversation_id: string | null;
          created_at: string | null;
          id: string | null;
          joined_at: string | null;
          left_at: string | null;
          organization_id: string | null;
          participant_kind: string | null;
          participant_role: string | null;
        };
        Insert: {
          agent_key?: string | null;
          channel_connection_id?: string | null;
          channel_identity_id?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          joined_at?: string | null;
          left_at?: string | null;
          organization_id?: string | null;
          participant_kind?: string | null;
          participant_role?: string | null;
        };
        Update: {
          agent_key?: string | null;
          channel_connection_id?: string | null;
          channel_identity_id?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          joined_at?: string | null;
          left_at?: string | null;
          organization_id?: string | null;
          participant_kind?: string | null;
          participant_role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "conversation_participants_identity_fk";
            columns: ["organization_id", "channel_connection_id", "channel_identity_id"];
            isOneToOne: false;
            referencedRelation: "channel_identities";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
        ];
      };
      conversations: {
        Row: {
          channel_connection_id: string | null;
          closed_at: string | null;
          created_at: string | null;
          id: string | null;
          last_activity_at: string | null;
          last_inbound_at: string | null;
          last_outbound_at: string | null;
          opened_at: string | null;
          organization_id: string | null;
          origin_external_id: string | null;
          origin_kind: string | null;
          primary_channel_identity_id: string | null;
          provider_thread_id: string | null;
          service_window_expires_at: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          channel_connection_id?: string | null;
          closed_at?: string | null;
          created_at?: string | null;
          id?: string | null;
          last_activity_at?: string | null;
          last_inbound_at?: string | null;
          last_outbound_at?: string | null;
          opened_at?: string | null;
          organization_id?: string | null;
          origin_external_id?: string | null;
          origin_kind?: string | null;
          primary_channel_identity_id?: string | null;
          provider_thread_id?: string | null;
          service_window_expires_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          channel_connection_id?: string | null;
          closed_at?: string | null;
          created_at?: string | null;
          id?: string | null;
          last_activity_at?: string | null;
          last_inbound_at?: string | null;
          last_outbound_at?: string | null;
          opened_at?: string | null;
          organization_id?: string | null;
          origin_external_id?: string | null;
          origin_kind?: string | null;
          primary_channel_identity_id?: string | null;
          provider_thread_id?: string | null;
          service_window_expires_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_connection_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "conversations_primary_identity_fk";
            columns: ["organization_id", "channel_connection_id", "primary_channel_identity_id"];
            isOneToOne: false;
            referencedRelation: "channel_identities";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
        ];
      };
      media_assets: {
        Row: {
          analyzed_at: string | null;
          byte_size: number | null;
          created_at: string | null;
          duration_milliseconds: number | null;
          height_pixels: number | null;
          id: string | null;
          ingest_status: string | null;
          mime_type: string | null;
          organization_id: string | null;
          original_file_name: string | null;
          source_kind: string | null;
          source_message_id: string | null;
          updated_at: string | null;
          width_pixels: number | null;
        };
        Insert: {
          analyzed_at?: string | null;
          byte_size?: number | null;
          created_at?: string | null;
          duration_milliseconds?: number | null;
          height_pixels?: number | null;
          id?: string | null;
          ingest_status?: string | null;
          mime_type?: string | null;
          organization_id?: string | null;
          original_file_name?: string | null;
          source_kind?: string | null;
          source_message_id?: string | null;
          updated_at?: string | null;
          width_pixels?: number | null;
        };
        Update: {
          analyzed_at?: string | null;
          byte_size?: number | null;
          created_at?: string | null;
          duration_milliseconds?: number | null;
          height_pixels?: number | null;
          id?: string | null;
          ingest_status?: string | null;
          mime_type?: string | null;
          organization_id?: string | null;
          original_file_name?: string | null;
          source_kind?: string | null;
          source_message_id?: string | null;
          updated_at?: string | null;
          width_pixels?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_assets_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_assets_source_message_fk";
            columns: ["organization_id", "source_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      message_delivery_events: {
        Row: {
          channel_connection_id: string | null;
          created_at: string | null;
          error_code: string | null;
          id: string | null;
          message_id: string | null;
          organization_id: string | null;
          provider_occurred_at: string | null;
          received_at: string | null;
          status: string | null;
        };
        Insert: {
          channel_connection_id?: string | null;
          created_at?: string | null;
          error_code?: string | null;
          id?: string | null;
          message_id?: string | null;
          organization_id?: string | null;
          provider_occurred_at?: string | null;
          received_at?: string | null;
          status?: string | null;
        };
        Update: {
          channel_connection_id?: string | null;
          created_at?: string | null;
          error_code?: string | null;
          id?: string | null;
          message_id?: string | null;
          organization_id?: string | null;
          provider_occurred_at?: string | null;
          received_at?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "message_delivery_events_message_fk";
            columns: ["organization_id", "channel_connection_id", "message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
        ];
      };
      messages: {
        Row: {
          channel_connection_id: string | null;
          content: Json | null;
          content_kind: string | null;
          conversation_id: string | null;
          created_at: string | null;
          direction: string | null;
          external_message_id: string | null;
          id: string | null;
          organization_id: string | null;
          processed_at: string | null;
          provider_message_type: string | null;
          provider_occurred_at: string | null;
          received_at: string | null;
          reply_to_message_id: string | null;
          sender_participant_id: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          channel_connection_id?: string | null;
          content?: Json | null;
          content_kind?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          direction?: string | null;
          external_message_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          processed_at?: string | null;
          provider_message_type?: string | null;
          provider_occurred_at?: string | null;
          received_at?: string | null;
          reply_to_message_id?: string | null;
          sender_participant_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          channel_connection_id?: string | null;
          content?: Json | null;
          content_kind?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          direction?: string | null;
          external_message_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          processed_at?: string | null;
          provider_message_type?: string | null;
          provider_occurred_at?: string | null;
          received_at?: string | null;
          reply_to_message_id?: string | null;
          sender_participant_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "messages_reply_to_fk";
            columns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "reply_to_message_id",
            ];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "id",
            ];
          },
          {
            foreignKeyName: "messages_sender_participant_fk";
            columns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "sender_participant_id",
            ];
            isOneToOne: false;
            referencedRelation: "conversation_participants";
            referencedColumns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "id",
            ];
          },
        ];
      };
      organization_memberships: {
        Row: {
          created_at: string | null;
          id: string | null;
          joined_at: string | null;
          organization_id: string | null;
          role: string | null;
          status: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          joined_at?: string | null;
          organization_id?: string | null;
          role?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          joined_at?: string | null;
          organization_id?: string | null;
          role?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string | null;
          id: string | null;
          name: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      price_books: {
        Row: {
          code: string | null;
          created_at: string | null;
          currency_code: string | null;
          id: string | null;
          is_default: boolean | null;
          name: string | null;
          organization_id: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string | null;
          currency_code?: string | null;
          id?: string | null;
          is_default?: boolean | null;
          name?: string | null;
          organization_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string | null;
          currency_code?: string | null;
          id?: string | null;
          is_default?: boolean | null;
          name?: string | null;
          organization_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "price_books_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      price_tier_changes: {
        Row: {
          changed_at: string | null;
          created_by_user_id: string | null;
          evidence_id: string | null;
          new_calculation_method: string | null;
          new_price_amount: number | null;
          new_pricing_status: string | null;
          new_quantity_max: number | null;
          new_quantity_min: number | null;
          new_valid_from: string | null;
          new_valid_until: string | null;
          organization_id: string | null;
          previous_calculation_method: string | null;
          previous_price_amount: number | null;
          previous_price_tier_id: string | null;
          previous_pricing_status: string | null;
          previous_quantity_max: number | null;
          previous_quantity_min: number | null;
          previous_valid_from: string | null;
          previous_valid_until: string | null;
          price_book_id: string | null;
          price_tier_id: string | null;
          unit_id: string | null;
          variant_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "price_tiers_price_book_fk";
            columns: ["organization_id", "price_book_id"];
            isOneToOne: false;
            referencedRelation: "price_books";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "price_tiers_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "price_tiers_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      price_tiers: {
        Row: {
          calculation_method: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          evidence_id: string | null;
          id: string | null;
          organization_id: string | null;
          price_amount: number | null;
          price_book_id: string | null;
          pricing_status: string | null;
          quantity_max: number | null;
          quantity_min: number | null;
          superseded_at: string | null;
          supersedes_price_tier_id: string | null;
          unit_id: string | null;
          valid_from: string | null;
          valid_until: string | null;
          variant_id: string | null;
        };
        Insert: {
          calculation_method?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          evidence_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          price_amount?: number | null;
          price_book_id?: string | null;
          pricing_status?: string | null;
          quantity_max?: number | null;
          quantity_min?: number | null;
          superseded_at?: string | null;
          supersedes_price_tier_id?: string | null;
          unit_id?: string | null;
          valid_from?: string | null;
          valid_until?: string | null;
          variant_id?: string | null;
        };
        Update: {
          calculation_method?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          evidence_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          price_amount?: number | null;
          price_book_id?: string | null;
          pricing_status?: string | null;
          quantity_max?: number | null;
          quantity_min?: number | null;
          superseded_at?: string | null;
          supersedes_price_tier_id?: string | null;
          unit_id?: string | null;
          valid_from?: string | null;
          valid_until?: string | null;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "price_tiers_price_book_fk";
            columns: ["organization_id", "price_book_id"];
            isOneToOne: false;
            referencedRelation: "price_books";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "price_tiers_supersedes_fk";
            columns: ["organization_id", "supersedes_price_tier_id"];
            isOneToOne: false;
            referencedRelation: "price_tier_changes";
            referencedColumns: ["organization_id", "previous_price_tier_id"];
          },
          {
            foreignKeyName: "price_tiers_supersedes_fk";
            columns: ["organization_id", "supersedes_price_tier_id"];
            isOneToOne: false;
            referencedRelation: "price_tier_changes";
            referencedColumns: ["organization_id", "price_tier_id"];
          },
          {
            foreignKeyName: "price_tiers_supersedes_fk";
            columns: ["organization_id", "supersedes_price_tier_id"];
            isOneToOne: false;
            referencedRelation: "price_tiers";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "price_tiers_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "price_tiers_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      product_attribute_values: {
        Row: {
          attribute_definition_id: string | null;
          certainty: string | null;
          created_at: string | null;
          evidence_id: string | null;
          id: string | null;
          option_id: string | null;
          ordinal: number | null;
          organization_id: string | null;
          product_id: string | null;
          unit_id: string | null;
          updated_at: string | null;
          value_boolean: boolean | null;
          value_date: string | null;
          value_decimal: number | null;
          value_integer: number | null;
          value_text: string | null;
          value_timestamp: string | null;
        };
        Insert: {
          attribute_definition_id?: string | null;
          certainty?: string | null;
          created_at?: string | null;
          evidence_id?: string | null;
          id?: string | null;
          option_id?: string | null;
          ordinal?: number | null;
          organization_id?: string | null;
          product_id?: string | null;
          unit_id?: string | null;
          updated_at?: string | null;
          value_boolean?: boolean | null;
          value_date?: string | null;
          value_decimal?: number | null;
          value_integer?: number | null;
          value_text?: string | null;
          value_timestamp?: string | null;
        };
        Update: {
          attribute_definition_id?: string | null;
          certainty?: string | null;
          created_at?: string | null;
          evidence_id?: string | null;
          id?: string | null;
          option_id?: string | null;
          ordinal?: number | null;
          organization_id?: string | null;
          product_id?: string | null;
          unit_id?: string | null;
          updated_at?: string | null;
          value_boolean?: boolean | null;
          value_date?: string | null;
          value_decimal?: number | null;
          value_integer?: number | null;
          value_text?: string | null;
          value_timestamp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_definition_fk";
            columns: ["organization_id", "attribute_definition_id"];
            isOneToOne: false;
            referencedRelation: "catalog_attribute_definitions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "product_attribute_values_option_fk";
            columns: ["organization_id", "option_id"];
            isOneToOne: false;
            referencedRelation: "catalog_attribute_options";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "product_attribute_values_product_fk";
            columns: ["organization_id", "product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "product_attribute_values_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      product_variants: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string | null;
          name: string | null;
          organization_id: string | null;
          product_id: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          name?: string | null;
          organization_id?: string | null;
          product_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          name?: string | null;
          organization_id?: string | null;
          product_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_fk";
            columns: ["organization_id", "product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      products: {
        Row: {
          category_id: string | null;
          created_at: string | null;
          description: string | null;
          id: string | null;
          name: string | null;
          organization_id: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          name?: string | null;
          organization_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          category_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string | null;
          name?: string | null;
          organization_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_fk";
            columns: ["organization_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "catalog_categories";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          accessibility_preferences: Json | null;
          created_at: string | null;
          preferred_locale: string | null;
          preferred_name: string | null;
          time_zone: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          accessibility_preferences?: Json | null;
          created_at?: string | null;
          preferred_locale?: string | null;
          preferred_name?: string | null;
          time_zone?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          accessibility_preferences?: Json | null;
          created_at?: string | null;
          preferred_locale?: string | null;
          preferred_name?: string | null;
          time_zone?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      variant_attribute_values: {
        Row: {
          attribute_definition_id: string | null;
          certainty: string | null;
          created_at: string | null;
          evidence_id: string | null;
          id: string | null;
          option_id: string | null;
          ordinal: number | null;
          organization_id: string | null;
          unit_id: string | null;
          updated_at: string | null;
          value_boolean: boolean | null;
          value_date: string | null;
          value_decimal: number | null;
          value_integer: number | null;
          value_text: string | null;
          value_timestamp: string | null;
          variant_id: string | null;
        };
        Insert: {
          attribute_definition_id?: string | null;
          certainty?: string | null;
          created_at?: string | null;
          evidence_id?: string | null;
          id?: string | null;
          option_id?: string | null;
          ordinal?: number | null;
          organization_id?: string | null;
          unit_id?: string | null;
          updated_at?: string | null;
          value_boolean?: boolean | null;
          value_date?: string | null;
          value_decimal?: number | null;
          value_integer?: number | null;
          value_text?: string | null;
          value_timestamp?: string | null;
          variant_id?: string | null;
        };
        Update: {
          attribute_definition_id?: string | null;
          certainty?: string | null;
          created_at?: string | null;
          evidence_id?: string | null;
          id?: string | null;
          option_id?: string | null;
          ordinal?: number | null;
          organization_id?: string | null;
          unit_id?: string | null;
          updated_at?: string | null;
          value_boolean?: boolean | null;
          value_date?: string | null;
          value_decimal?: number | null;
          value_integer?: number | null;
          value_text?: string | null;
          value_timestamp?: string | null;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "variant_attribute_values_definition_fk";
            columns: ["organization_id", "attribute_definition_id"];
            isOneToOne: false;
            referencedRelation: "catalog_attribute_definitions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "variant_attribute_values_option_fk";
            columns: ["organization_id", "option_id"];
            isOneToOne: false;
            referencedRelation: "catalog_attribute_options";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "variant_attribute_values_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "variant_attribute_values_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      variant_skus: {
        Row: {
          created_at: string | null;
          effective_at: string | null;
          id: string | null;
          organization_id: string | null;
          retired_at: string | null;
          sku: string | null;
          status: string | null;
          updated_at: string | null;
          variant_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          effective_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          retired_at?: string | null;
          sku?: string | null;
          status?: string | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          effective_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          retired_at?: string | null;
          sku?: string | null;
          status?: string | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "variant_skus_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
    };
    Functions: {
      resolve_price_quote: {
        Args: {
          target_at?: string;
          target_price_book_id: string;
          target_quantity: number;
          target_unit_id: string;
          target_variant_id: string;
        };
        Returns: {
          calculation_method: string;
          currency_code: string;
          evidence_id: string;
          organization_id: string;
          price_amount: number;
          price_book_id: string;
          price_tier_id: string;
          pricing_status: string;
          requested_quantity: number;
          total_amount: number;
          unit_id: string;
          valid_from: string;
          valid_until: string;
          variant_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  app_private: {
    Tables: {
      business_profiles: {
        Row: {
          created_at: string;
          created_by_user_id: string | null;
          default_locale: string | null;
          id: string;
          organization_id: string;
          public_name: string;
          time_zone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id?: string | null;
          default_locale?: string | null;
          id?: string;
          organization_id: string;
          public_name: string;
          time_zone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string | null;
          default_locale?: string | null;
          id?: string;
          organization_id?: string;
          public_name?: string;
          time_zone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_profiles_organization_fk";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_attribute_allowed_units: {
        Row: {
          attribute_definition_id: string;
          created_at: string;
          organization_id: string;
          unit_id: string;
        };
        Insert: {
          attribute_definition_id: string;
          created_at?: string;
          organization_id: string;
          unit_id: string;
        };
        Update: {
          attribute_definition_id?: string;
          created_at?: string;
          organization_id?: string;
          unit_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_attribute_allowed_units_definition_fk";
            columns: ["organization_id", "attribute_definition_id"];
            isOneToOne: false;
            referencedRelation: "catalog_attribute_definitions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_attribute_allowed_units_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_attribute_definitions: {
        Row: {
          allows_unit: boolean;
          cardinality_max: number;
          cardinality_min: number;
          category_id: string;
          code: string;
          created_at: string;
          created_by_user_id: string | null;
          description: string | null;
          id: string;
          is_filterable: boolean;
          is_public: boolean;
          is_searchable: boolean;
          name: string;
          organization_id: string;
          required_on_activation: boolean;
          scope: string;
          sort_order: number;
          status: string;
          updated_at: string;
          value_type: string;
        };
        Insert: {
          allows_unit?: boolean;
          cardinality_max?: number;
          cardinality_min?: number;
          category_id: string;
          code: string;
          created_at?: string;
          created_by_user_id?: string | null;
          description?: string | null;
          id?: string;
          is_filterable?: boolean;
          is_public?: boolean;
          is_searchable?: boolean;
          name: string;
          organization_id: string;
          required_on_activation?: boolean;
          scope: string;
          sort_order?: number;
          status?: string;
          updated_at?: string;
          value_type: string;
        };
        Update: {
          allows_unit?: boolean;
          cardinality_max?: number;
          cardinality_min?: number;
          category_id?: string;
          code?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          description?: string | null;
          id?: string;
          is_filterable?: boolean;
          is_public?: boolean;
          is_searchable?: boolean;
          name?: string;
          organization_id?: string;
          required_on_activation?: boolean;
          scope?: string;
          sort_order?: number;
          status?: string;
          updated_at?: string;
          value_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_attribute_definitions_category_fk";
            columns: ["organization_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "catalog_categories";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_attribute_options: {
        Row: {
          attribute_definition_id: string;
          code: string;
          created_at: string;
          id: string;
          label: string;
          organization_id: string;
          sort_order: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          attribute_definition_id: string;
          code: string;
          created_at?: string;
          id?: string;
          label: string;
          organization_id: string;
          sort_order?: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          attribute_definition_id?: string;
          code?: string;
          created_at?: string;
          id?: string;
          label?: string;
          organization_id?: string;
          sort_order?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_attribute_options_definition_fk";
            columns: ["organization_id", "attribute_definition_id"];
            isOneToOne: false;
            referencedRelation: "catalog_attribute_definitions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_candidate_matches: {
        Row: {
          candidate_kind: string;
          candidate_product_id: string | null;
          candidate_variant_id: string | null;
          confidence: number | null;
          created_at: string;
          differences: Json;
          draft_id: string;
          id: string;
          organization_id: string;
          rank: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          candidate_kind: string;
          candidate_product_id?: string | null;
          candidate_variant_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          differences?: Json;
          draft_id: string;
          id?: string;
          organization_id: string;
          rank: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          candidate_kind?: string;
          candidate_product_id?: string | null;
          candidate_variant_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          differences?: Json;
          draft_id?: string;
          id?: string;
          organization_id?: string;
          rank?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_candidate_matches_draft_fk";
            columns: ["organization_id", "draft_id"];
            isOneToOne: false;
            referencedRelation: "catalog_ingestion_drafts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_candidate_matches_product_fk";
            columns: ["organization_id", "candidate_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_candidate_matches_variant_fk";
            columns: ["organization_id", "candidate_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_categories: {
        Row: {
          code: string;
          created_at: string;
          created_by_user_id: string | null;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by_user_id?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_categories_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_evidence: {
        Row: {
          content: Json;
          created_at: string;
          created_by_user_id: string | null;
          evidence_kind: string;
          id: string;
          model_name: string | null;
          model_provider: string | null;
          organization_id: string;
          provider_request_id: string | null;
          source_message_id: string | null;
        };
        Insert: {
          content: Json;
          created_at?: string;
          created_by_user_id?: string | null;
          evidence_kind: string;
          id?: string;
          model_name?: string | null;
          model_provider?: string | null;
          organization_id: string;
          provider_request_id?: string | null;
          source_message_id?: string | null;
        };
        Update: {
          content?: Json;
          created_at?: string;
          created_by_user_id?: string | null;
          evidence_kind?: string;
          id?: string;
          model_name?: string | null;
          model_provider?: string | null;
          organization_id?: string;
          provider_request_id?: string | null;
          source_message_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_evidence_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "catalog_evidence_source_message_fk";
            columns: ["organization_id", "source_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_evidence_media: {
        Row: {
          created_at: string;
          evidence_id: string;
          media_asset_id: string;
          organization_id: string;
        };
        Insert: {
          created_at?: string;
          evidence_id: string;
          media_asset_id: string;
          organization_id: string;
        };
        Update: {
          created_at?: string;
          evidence_id?: string;
          media_asset_id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_evidence_media_asset_fk";
            columns: ["organization_id", "media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_evidence_media_evidence_fk";
            columns: ["organization_id", "evidence_id"];
            isOneToOne: false;
            referencedRelation: "catalog_evidence";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_ingestion_drafts: {
        Row: {
          applied_product_id: string | null;
          applied_variant_id: string | null;
          category_id: string | null;
          confidence: number | null;
          created_at: string;
          created_by_user_id: string | null;
          id: string;
          organization_id: string;
          proposal: Json;
          revision: number;
          source_conversation_id: string | null;
          source_message_id: string | null;
          status: string;
          unresolved_fields: Json;
          updated_at: string;
        };
        Insert: {
          applied_product_id?: string | null;
          applied_variant_id?: string | null;
          category_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          organization_id: string;
          proposal?: Json;
          revision?: number;
          source_conversation_id?: string | null;
          source_message_id?: string | null;
          status?: string;
          unresolved_fields?: Json;
          updated_at?: string;
        };
        Update: {
          applied_product_id?: string | null;
          applied_variant_id?: string | null;
          category_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          organization_id?: string;
          proposal?: Json;
          revision?: number;
          source_conversation_id?: string | null;
          source_message_id?: string | null;
          status?: string;
          unresolved_fields?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_ingestion_drafts_applied_product_fk";
            columns: ["organization_id", "applied_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_ingestion_drafts_applied_variant_fk";
            columns: ["organization_id", "applied_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_ingestion_drafts_category_fk";
            columns: ["organization_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "catalog_categories";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_ingestion_drafts_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "catalog_ingestion_drafts_source_conversation_fk";
            columns: ["organization_id", "source_conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_ingestion_drafts_source_message_fk";
            columns: ["organization_id", "source_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_resolution_decisions: {
        Row: {
          created_at: string;
          decided_by_user_id: string | null;
          decision: string;
          draft_id: string;
          evidence_id: string;
          id: string;
          organization_id: string;
          rationale: string | null;
          selected_candidate_match_id: string | null;
        };
        Insert: {
          created_at?: string;
          decided_by_user_id?: string | null;
          decision: string;
          draft_id: string;
          evidence_id: string;
          id?: string;
          organization_id: string;
          rationale?: string | null;
          selected_candidate_match_id?: string | null;
        };
        Update: {
          created_at?: string;
          decided_by_user_id?: string | null;
          decision?: string;
          draft_id?: string;
          evidence_id?: string;
          id?: string;
          organization_id?: string;
          rationale?: string | null;
          selected_candidate_match_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_resolution_decisions_candidate_fk";
            columns: ["organization_id", "selected_candidate_match_id"];
            isOneToOne: false;
            referencedRelation: "catalog_candidate_matches";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_resolution_decisions_draft_fk";
            columns: ["organization_id", "draft_id"];
            isOneToOne: true;
            referencedRelation: "catalog_ingestion_drafts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "catalog_resolution_decisions_evidence_fk";
            columns: ["organization_id", "evidence_id"];
            isOneToOne: false;
            referencedRelation: "catalog_evidence";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      catalog_units: {
        Row: {
          code: string;
          created_at: string;
          created_by_user_id: string | null;
          decimal_scale: number;
          id: string;
          name_plural: string;
          name_singular: string;
          organization_id: string;
          quantity_kind: string;
          status: string;
          symbol: string | null;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by_user_id?: string | null;
          decimal_scale?: number;
          id?: string;
          name_plural: string;
          name_singular: string;
          organization_id: string;
          quantity_kind: string;
          status?: string;
          symbol?: string | null;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          decimal_scale?: number;
          id?: string;
          name_plural?: string;
          name_singular?: string;
          organization_id?: string;
          quantity_kind?: string;
          status?: string;
          symbol?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_units_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      channel_connections: {
        Row: {
          api_version: string | null;
          channel: string;
          connected_at: string | null;
          created_at: string;
          created_by_user_id: string | null;
          credential_reference: string | null;
          disabled_at: string | null;
          display_name: string | null;
          external_account_id: string | null;
          external_app_id: string | null;
          external_sender_id: string | null;
          id: string;
          last_verified_at: string | null;
          organization_id: string;
          provider: string;
          status: string;
          updated_at: string;
          webhook_secret_reference: string | null;
        };
        Insert: {
          api_version?: string | null;
          channel: string;
          connected_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          credential_reference?: string | null;
          disabled_at?: string | null;
          display_name?: string | null;
          external_account_id?: string | null;
          external_app_id?: string | null;
          external_sender_id?: string | null;
          id?: string;
          last_verified_at?: string | null;
          organization_id: string;
          provider: string;
          status?: string;
          updated_at?: string;
          webhook_secret_reference?: string | null;
        };
        Update: {
          api_version?: string | null;
          channel?: string;
          connected_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          credential_reference?: string | null;
          disabled_at?: string | null;
          display_name?: string | null;
          external_account_id?: string | null;
          external_app_id?: string | null;
          external_sender_id?: string | null;
          id?: string;
          last_verified_at?: string | null;
          organization_id?: string;
          provider?: string;
          status?: string;
          updated_at?: string;
          webhook_secret_reference?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "channel_connections_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      channel_identities: {
        Row: {
          channel_connection_id: string;
          contact_id: string | null;
          created_at: string;
          display_name: string | null;
          external_subject_id: string;
          id: string;
          last_seen_at: string | null;
          linked_by_user_id: string | null;
          member_user_id: string | null;
          organization_id: string;
          principal_type: string;
          revoked_at: string | null;
          status: string;
          trust_level: string;
          updated_at: string;
          verified_at: string | null;
        };
        Insert: {
          channel_connection_id: string;
          contact_id?: string | null;
          created_at?: string;
          display_name?: string | null;
          external_subject_id: string;
          id?: string;
          last_seen_at?: string | null;
          linked_by_user_id?: string | null;
          member_user_id?: string | null;
          organization_id: string;
          principal_type: string;
          revoked_at?: string | null;
          status?: string;
          trust_level: string;
          updated_at?: string;
          verified_at?: string | null;
        };
        Update: {
          channel_connection_id?: string;
          contact_id?: string | null;
          created_at?: string;
          display_name?: string | null;
          external_subject_id?: string;
          id?: string;
          last_seen_at?: string | null;
          linked_by_user_id?: string | null;
          member_user_id?: string | null;
          organization_id?: string;
          principal_type?: string;
          revoked_at?: string | null;
          status?: string;
          trust_level?: string;
          updated_at?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "channel_identities_connection_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "channel_identities_contact_fk";
            columns: ["organization_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "channel_identities_linked_by_fk";
            columns: ["organization_id", "linked_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "channel_identities_member_fk";
            columns: ["organization_id", "member_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
        ];
      };
      consents: {
        Row: {
          channel_connection_id: string;
          channel_identity_id: string;
          decision: string;
          deduplication_key: string;
          effective_at: string;
          evidence_message_id: string | null;
          expires_at: string | null;
          id: string;
          metadata: Json;
          organization_id: string;
          purpose: string;
          recorded_at: string;
          source: string;
        };
        Insert: {
          channel_connection_id: string;
          channel_identity_id: string;
          decision: string;
          deduplication_key: string;
          effective_at: string;
          evidence_message_id?: string | null;
          expires_at?: string | null;
          id?: string;
          metadata?: Json;
          organization_id: string;
          purpose: string;
          recorded_at?: string;
          source: string;
        };
        Update: {
          channel_connection_id?: string;
          channel_identity_id?: string;
          decision?: string;
          deduplication_key?: string;
          effective_at?: string;
          evidence_message_id?: string | null;
          expires_at?: string | null;
          id?: string;
          metadata?: Json;
          organization_id?: string;
          purpose?: string;
          recorded_at?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consents_evidence_message_fk";
            columns: ["organization_id", "channel_connection_id", "evidence_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "consents_identity_fk";
            columns: ["organization_id", "channel_connection_id", "channel_identity_id"];
            isOneToOne: false;
            referencedRelation: "channel_identities";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
        ];
      };
      contacts: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          organization_id: string;
          preferred_locale: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          organization_id: string;
          preferred_locale?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          organization_id?: string;
          preferred_locale?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_participants: {
        Row: {
          agent_key: string | null;
          channel_connection_id: string;
          channel_identity_id: string | null;
          conversation_id: string;
          created_at: string;
          id: string;
          joined_at: string;
          left_at: string | null;
          organization_id: string;
          participant_kind: string;
          participant_role: string;
        };
        Insert: {
          agent_key?: string | null;
          channel_connection_id: string;
          channel_identity_id?: string | null;
          conversation_id: string;
          created_at?: string;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          organization_id: string;
          participant_kind: string;
          participant_role: string;
        };
        Update: {
          agent_key?: string | null;
          channel_connection_id?: string;
          channel_identity_id?: string | null;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          organization_id?: string;
          participant_kind?: string;
          participant_role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "conversation_participants_identity_fk";
            columns: ["organization_id", "channel_connection_id", "channel_identity_id"];
            isOneToOne: false;
            referencedRelation: "channel_identities";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
        ];
      };
      conversations: {
        Row: {
          channel_connection_id: string;
          closed_at: string | null;
          created_at: string;
          id: string;
          last_activity_at: string;
          last_inbound_at: string | null;
          last_outbound_at: string | null;
          opened_at: string;
          organization_id: string;
          origin_context: Json;
          origin_external_id: string | null;
          origin_kind: string | null;
          primary_channel_identity_id: string;
          provider_thread_id: string | null;
          service_window_expires_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          channel_connection_id: string;
          closed_at?: string | null;
          created_at?: string;
          id?: string;
          last_activity_at?: string;
          last_inbound_at?: string | null;
          last_outbound_at?: string | null;
          opened_at?: string;
          organization_id: string;
          origin_context?: Json;
          origin_external_id?: string | null;
          origin_kind?: string | null;
          primary_channel_identity_id: string;
          provider_thread_id?: string | null;
          service_window_expires_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          channel_connection_id?: string;
          closed_at?: string | null;
          created_at?: string;
          id?: string;
          last_activity_at?: string;
          last_inbound_at?: string | null;
          last_outbound_at?: string | null;
          opened_at?: string;
          organization_id?: string;
          origin_context?: Json;
          origin_external_id?: string | null;
          origin_kind?: string | null;
          primary_channel_identity_id?: string;
          provider_thread_id?: string | null;
          service_window_expires_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_connection_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "conversations_primary_identity_fk";
            columns: ["organization_id", "channel_connection_id", "primary_channel_identity_id"];
            isOneToOne: false;
            referencedRelation: "channel_identities";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
        ];
      };
      inbound_events: {
        Row: {
          attempt_count: number;
          available_at: string;
          channel_connection_id: string;
          deduplication_key: string;
          event_type: string;
          id: string;
          last_error_code: string | null;
          organization_id: string;
          payload: Json;
          payload_sha256: string;
          processed_at: string | null;
          processing_started_at: string | null;
          provider_event_id: string | null;
          provider_occurred_at: string | null;
          received_at: string;
          request_id: string;
          signature_verified_at: string;
          status: string;
          trace_id: string | null;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          available_at?: string;
          channel_connection_id: string;
          deduplication_key: string;
          event_type: string;
          id?: string;
          last_error_code?: string | null;
          organization_id: string;
          payload: Json;
          payload_sha256: string;
          processed_at?: string | null;
          processing_started_at?: string | null;
          provider_event_id?: string | null;
          provider_occurred_at?: string | null;
          received_at?: string;
          request_id: string;
          signature_verified_at: string;
          status?: string;
          trace_id?: string | null;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          available_at?: string;
          channel_connection_id?: string;
          deduplication_key?: string;
          event_type?: string;
          id?: string;
          last_error_code?: string | null;
          organization_id?: string;
          payload?: Json;
          payload_sha256?: string;
          processed_at?: string | null;
          processing_started_at?: string | null;
          provider_event_id?: string | null;
          provider_occurred_at?: string | null;
          received_at?: string;
          request_id?: string;
          signature_verified_at?: string;
          status?: string;
          trace_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inbound_events_connection_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      media_assets: {
        Row: {
          analyzed_at: string | null;
          byte_size: number;
          content_sha256: string;
          created_at: string;
          duration_milliseconds: number | null;
          height_pixels: number | null;
          id: string;
          ingest_status: string;
          mime_type: string;
          organization_id: string;
          original_file_name: string | null;
          source_kind: string;
          source_message_id: string | null;
          updated_at: string;
          width_pixels: number | null;
        };
        Insert: {
          analyzed_at?: string | null;
          byte_size: number;
          content_sha256: string;
          created_at?: string;
          duration_milliseconds?: number | null;
          height_pixels?: number | null;
          id?: string;
          ingest_status?: string;
          mime_type: string;
          organization_id: string;
          original_file_name?: string | null;
          source_kind: string;
          source_message_id?: string | null;
          updated_at?: string;
          width_pixels?: number | null;
        };
        Update: {
          analyzed_at?: string | null;
          byte_size?: number;
          content_sha256?: string;
          created_at?: string;
          duration_milliseconds?: number | null;
          height_pixels?: number | null;
          id?: string;
          ingest_status?: string;
          mime_type?: string;
          organization_id?: string;
          original_file_name?: string | null;
          source_kind?: string;
          source_message_id?: string | null;
          updated_at?: string;
          width_pixels?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_assets_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_assets_source_message_fk";
            columns: ["organization_id", "source_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      message_delivery_events: {
        Row: {
          channel_connection_id: string;
          created_at: string;
          deduplication_key: string;
          error_code: string | null;
          error_details: Json;
          id: string;
          message_id: string;
          organization_id: string;
          provider_occurred_at: string;
          received_at: string;
          source_inbound_event_id: string | null;
          status: string;
        };
        Insert: {
          channel_connection_id: string;
          created_at?: string;
          deduplication_key: string;
          error_code?: string | null;
          error_details?: Json;
          id?: string;
          message_id: string;
          organization_id: string;
          provider_occurred_at: string;
          received_at?: string;
          source_inbound_event_id?: string | null;
          status: string;
        };
        Update: {
          channel_connection_id?: string;
          created_at?: string;
          deduplication_key?: string;
          error_code?: string | null;
          error_details?: Json;
          id?: string;
          message_id?: string;
          organization_id?: string;
          provider_occurred_at?: string;
          received_at?: string;
          source_inbound_event_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_delivery_events_message_fk";
            columns: ["organization_id", "channel_connection_id", "message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "message_delivery_events_source_inbound_fk";
            columns: ["organization_id", "channel_connection_id", "source_inbound_event_id"];
            isOneToOne: false;
            referencedRelation: "inbound_events";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
        ];
      };
      messages: {
        Row: {
          channel_connection_id: string;
          content: Json;
          content_kind: string;
          conversation_id: string;
          created_at: string;
          deduplication_key: string;
          direction: string;
          external_message_id: string | null;
          id: string;
          organization_id: string;
          processed_at: string | null;
          provider_context: Json;
          provider_message_type: string | null;
          provider_occurred_at: string | null;
          received_at: string | null;
          reply_to_message_id: string | null;
          sender_participant_id: string;
          source_inbound_event_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          channel_connection_id: string;
          content: Json;
          content_kind: string;
          conversation_id: string;
          created_at?: string;
          deduplication_key: string;
          direction: string;
          external_message_id?: string | null;
          id?: string;
          organization_id: string;
          processed_at?: string | null;
          provider_context?: Json;
          provider_message_type?: string | null;
          provider_occurred_at?: string | null;
          received_at?: string | null;
          reply_to_message_id?: string | null;
          sender_participant_id: string;
          source_inbound_event_id?: string | null;
          status: string;
          updated_at?: string;
        };
        Update: {
          channel_connection_id?: string;
          content?: Json;
          content_kind?: string;
          conversation_id?: string;
          created_at?: string;
          deduplication_key?: string;
          direction?: string;
          external_message_id?: string | null;
          id?: string;
          organization_id?: string;
          processed_at?: string | null;
          provider_context?: Json;
          provider_message_type?: string | null;
          provider_occurred_at?: string | null;
          received_at?: string | null;
          reply_to_message_id?: string | null;
          sender_participant_id?: string;
          source_inbound_event_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "messages_reply_to_fk";
            columns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "reply_to_message_id",
            ];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "id",
            ];
          },
          {
            foreignKeyName: "messages_sender_participant_fk";
            columns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "sender_participant_id",
            ];
            isOneToOne: false;
            referencedRelation: "conversation_participants";
            referencedColumns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "id",
            ];
          },
          {
            foreignKeyName: "messages_source_inbound_event_fk";
            columns: ["organization_id", "channel_connection_id", "source_inbound_event_id"];
            isOneToOne: false;
            referencedRelation: "inbound_events";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
        ];
      };
      organization_memberships: {
        Row: {
          created_at: string;
          id: string;
          invited_by_user_id: string | null;
          joined_at: string | null;
          organization_id: string;
          role: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invited_by_user_id?: string | null;
          joined_at?: string | null;
          organization_id: string;
          role: string;
          status: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invited_by_user_id?: string | null;
          joined_at?: string | null;
          organization_id?: string;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          created_by_user_id: string | null;
          id: string;
          name: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      outbox_events: {
        Row: {
          attempt_count: number;
          available_at: string;
          channel_connection_id: string;
          completed_at: string | null;
          conversation_id: string | null;
          created_at: string;
          destination_identity_id: string | null;
          id: string;
          idempotency_key: string;
          last_error_code: string | null;
          lease_expires_at: string | null;
          message_id: string | null;
          operation: string;
          organization_id: string;
          payload: Json;
          policy_basis: string | null;
          policy_evaluated_at: string | null;
          policy_status: string;
          processing_started_at: string | null;
          provider_request_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          available_at?: string;
          channel_connection_id: string;
          completed_at?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          destination_identity_id?: string | null;
          id?: string;
          idempotency_key: string;
          last_error_code?: string | null;
          lease_expires_at?: string | null;
          message_id?: string | null;
          operation: string;
          organization_id: string;
          payload?: Json;
          policy_basis?: string | null;
          policy_evaluated_at?: string | null;
          policy_status?: string;
          processing_started_at?: string | null;
          provider_request_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          available_at?: string;
          channel_connection_id?: string;
          completed_at?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          destination_identity_id?: string | null;
          id?: string;
          idempotency_key?: string;
          last_error_code?: string | null;
          lease_expires_at?: string | null;
          message_id?: string | null;
          operation?: string;
          organization_id?: string;
          payload?: Json;
          policy_basis?: string | null;
          policy_evaluated_at?: string | null;
          policy_status?: string;
          processing_started_at?: string | null;
          provider_request_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outbox_events_connection_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "outbox_events_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "outbox_events_destination_identity_fk";
            columns: ["organization_id", "channel_connection_id", "destination_identity_id"];
            isOneToOne: false;
            referencedRelation: "channel_identities";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "outbox_events_message_fk";
            columns: ["organization_id", "channel_connection_id", "message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
        ];
      };
      price_books: {
        Row: {
          code: string;
          created_at: string;
          created_by_user_id: string | null;
          currency_code: string;
          id: string;
          is_default: boolean;
          name: string;
          organization_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by_user_id?: string | null;
          currency_code: string;
          id?: string;
          is_default?: boolean;
          name: string;
          organization_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          currency_code?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          organization_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "price_books_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      price_tiers: {
        Row: {
          calculation_method: string | null;
          created_at: string;
          created_by_user_id: string | null;
          evidence_id: string;
          id: string;
          organization_id: string;
          price_amount: number | null;
          price_book_id: string;
          pricing_status: string;
          quantity_max: number | null;
          quantity_min: number;
          quantity_range: unknown;
          superseded_at: string | null;
          supersedes_price_tier_id: string | null;
          unit_id: string;
          valid_during: unknown;
          valid_from: string;
          valid_until: string | null;
          variant_id: string;
        };
        Insert: {
          calculation_method?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          evidence_id: string;
          id?: string;
          organization_id: string;
          price_amount?: number | null;
          price_book_id: string;
          pricing_status: string;
          quantity_max?: number | null;
          quantity_min: number;
          quantity_range?: unknown;
          superseded_at?: string | null;
          supersedes_price_tier_id?: string | null;
          unit_id: string;
          valid_during?: unknown;
          valid_from: string;
          valid_until?: string | null;
          variant_id: string;
        };
        Update: {
          calculation_method?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          evidence_id?: string;
          id?: string;
          organization_id?: string;
          price_amount?: number | null;
          price_book_id?: string;
          pricing_status?: string;
          quantity_max?: number | null;
          quantity_min?: number;
          quantity_range?: unknown;
          superseded_at?: string | null;
          supersedes_price_tier_id?: string | null;
          unit_id?: string;
          valid_during?: unknown;
          valid_from?: string;
          valid_until?: string | null;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "price_tiers_evidence_fk";
            columns: ["organization_id", "evidence_id"];
            isOneToOne: false;
            referencedRelation: "catalog_evidence";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "price_tiers_price_book_fk";
            columns: ["organization_id", "price_book_id"];
            isOneToOne: false;
            referencedRelation: "price_books";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "price_tiers_supersedes_fk";
            columns: ["organization_id", "supersedes_price_tier_id"];
            isOneToOne: false;
            referencedRelation: "price_tiers";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "price_tiers_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "price_tiers_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      product_attribute_values: {
        Row: {
          attribute_definition_id: string;
          certainty: string;
          created_at: string;
          evidence_id: string | null;
          id: string;
          option_id: string | null;
          ordinal: number;
          organization_id: string;
          product_id: string;
          unit_id: string | null;
          updated_at: string;
          value_boolean: boolean | null;
          value_date: string | null;
          value_decimal: number | null;
          value_integer: number | null;
          value_text: string | null;
          value_timestamp: string | null;
        };
        Insert: {
          attribute_definition_id: string;
          certainty?: string;
          created_at?: string;
          evidence_id?: string | null;
          id?: string;
          option_id?: string | null;
          ordinal?: number;
          organization_id: string;
          product_id: string;
          unit_id?: string | null;
          updated_at?: string;
          value_boolean?: boolean | null;
          value_date?: string | null;
          value_decimal?: number | null;
          value_integer?: number | null;
          value_text?: string | null;
          value_timestamp?: string | null;
        };
        Update: {
          attribute_definition_id?: string;
          certainty?: string;
          created_at?: string;
          evidence_id?: string | null;
          id?: string;
          option_id?: string | null;
          ordinal?: number;
          organization_id?: string;
          product_id?: string;
          unit_id?: string | null;
          updated_at?: string;
          value_boolean?: boolean | null;
          value_date?: string | null;
          value_decimal?: number | null;
          value_integer?: number | null;
          value_text?: string | null;
          value_timestamp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_definition_fk";
            columns: ["organization_id", "attribute_definition_id"];
            isOneToOne: false;
            referencedRelation: "catalog_attribute_definitions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "product_attribute_values_evidence_fk";
            columns: ["organization_id", "evidence_id"];
            isOneToOne: false;
            referencedRelation: "catalog_evidence";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "product_attribute_values_option_fk";
            columns: ["organization_id", "option_id"];
            isOneToOne: false;
            referencedRelation: "catalog_attribute_options";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "product_attribute_values_product_fk";
            columns: ["organization_id", "product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "product_attribute_values_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      product_variants: {
        Row: {
          created_at: string;
          created_by_user_id: string | null;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          product_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          product_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          product_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_fk";
            columns: ["organization_id", "product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      products: {
        Row: {
          category_id: string;
          created_at: string;
          created_by_user_id: string | null;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          created_by_user_id?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_fk";
            columns: ["organization_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "catalog_categories";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          accessibility_preferences: Json;
          created_at: string;
          preferred_locale: string | null;
          preferred_name: string | null;
          time_zone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accessibility_preferences?: Json;
          created_at?: string;
          preferred_locale?: string | null;
          preferred_name?: string | null;
          time_zone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accessibility_preferences?: Json;
          created_at?: string;
          preferred_locale?: string | null;
          preferred_name?: string | null;
          time_zone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      variant_attribute_values: {
        Row: {
          attribute_definition_id: string;
          certainty: string;
          created_at: string;
          evidence_id: string | null;
          id: string;
          option_id: string | null;
          ordinal: number;
          organization_id: string;
          unit_id: string | null;
          updated_at: string;
          value_boolean: boolean | null;
          value_date: string | null;
          value_decimal: number | null;
          value_integer: number | null;
          value_text: string | null;
          value_timestamp: string | null;
          variant_id: string;
        };
        Insert: {
          attribute_definition_id: string;
          certainty?: string;
          created_at?: string;
          evidence_id?: string | null;
          id?: string;
          option_id?: string | null;
          ordinal?: number;
          organization_id: string;
          unit_id?: string | null;
          updated_at?: string;
          value_boolean?: boolean | null;
          value_date?: string | null;
          value_decimal?: number | null;
          value_integer?: number | null;
          value_text?: string | null;
          value_timestamp?: string | null;
          variant_id: string;
        };
        Update: {
          attribute_definition_id?: string;
          certainty?: string;
          created_at?: string;
          evidence_id?: string | null;
          id?: string;
          option_id?: string | null;
          ordinal?: number;
          organization_id?: string;
          unit_id?: string | null;
          updated_at?: string;
          value_boolean?: boolean | null;
          value_date?: string | null;
          value_decimal?: number | null;
          value_integer?: number | null;
          value_text?: string | null;
          value_timestamp?: string | null;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "variant_attribute_values_definition_fk";
            columns: ["organization_id", "attribute_definition_id"];
            isOneToOne: false;
            referencedRelation: "catalog_attribute_definitions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "variant_attribute_values_evidence_fk";
            columns: ["organization_id", "evidence_id"];
            isOneToOne: false;
            referencedRelation: "catalog_evidence";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "variant_attribute_values_option_fk";
            columns: ["organization_id", "option_id"];
            isOneToOne: false;
            referencedRelation: "catalog_attribute_options";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "variant_attribute_values_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "variant_attribute_values_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      variant_skus: {
        Row: {
          created_at: string;
          created_by_user_id: string | null;
          effective_at: string;
          id: string;
          organization_id: string;
          retired_at: string | null;
          sku: string;
          status: string;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id?: string | null;
          effective_at?: string;
          id?: string;
          organization_id: string;
          retired_at?: string | null;
          sku: string;
          status?: string;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string | null;
          effective_at?: string;
          id?: string;
          organization_id?: string;
          retired_at?: string | null;
          sku?: string;
          status?: string;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "variant_skus_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      assert_product_catalog_ready: {
        Args: { target_organization_id: string; target_product_id: string };
        Returns: undefined;
      };
      assert_variant_catalog_ready: {
        Args: { target_organization_id: string; target_variant_id: string };
        Returns: undefined;
      };
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  api: {
    Enums: {},
  },
  app_private: {
    Enums: {},
  },
} as const;
