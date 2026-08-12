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
      commercial_commands: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          id: string | null;
          operation: string | null;
          organization_id: string | null;
          result_id: string | null;
          result_type: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          operation?: string | null;
          organization_id?: string | null;
          result_id?: string | null;
          result_type?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          operation?: string | null;
          organization_id?: string | null;
          result_id?: string | null;
          result_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "commercial_commands_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      commercial_events: {
        Row: {
          created_at: string | null;
          created_by_user_id: string | null;
          event_payload: Json | null;
          event_type: string | null;
          handoff_id: string | null;
          id: string | null;
          lead_id: string | null;
          new_status: string | null;
          occurred_at: string | null;
          opportunity_id: string | null;
          order_id: string | null;
          organization_id: string | null;
          pending_request_id: string | null;
          previous_status: string | null;
          reason: string | null;
          sale_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by_user_id?: string | null;
          event_payload?: Json | null;
          event_type?: string | null;
          handoff_id?: string | null;
          id?: string | null;
          lead_id?: string | null;
          new_status?: string | null;
          occurred_at?: string | null;
          opportunity_id?: string | null;
          order_id?: string | null;
          organization_id?: string | null;
          pending_request_id?: string | null;
          previous_status?: string | null;
          reason?: string | null;
          sale_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by_user_id?: string | null;
          event_payload?: Json | null;
          event_type?: string | null;
          handoff_id?: string | null;
          id?: string | null;
          lead_id?: string | null;
          new_status?: string | null;
          occurred_at?: string | null;
          opportunity_id?: string | null;
          order_id?: string | null;
          organization_id?: string | null;
          pending_request_id?: string | null;
          previous_status?: string | null;
          reason?: string | null;
          sale_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "commercial_events_handoff_fk";
            columns: ["organization_id", "handoff_id"];
            isOneToOne: false;
            referencedRelation: "handoffs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "commercial_events_lead_fk";
            columns: ["organization_id", "lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "commercial_events_opportunity_fk";
            columns: ["organization_id", "opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "commercial_events_order_fk";
            columns: ["organization_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "commercial_events_pending_request_fk";
            columns: ["organization_id", "pending_request_id"];
            isOneToOne: false;
            referencedRelation: "pending_requests";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "commercial_events_sale_fk";
            columns: ["organization_id", "sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["organization_id", "id"];
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
      contact_methods: {
        Row: {
          consent_purpose: string | null;
          consent_source: string | null;
          consented_at: string | null;
          contact_id: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          display_hint: string | null;
          id: string | null;
          method_kind: string | null;
          organization_id: string | null;
          revoked_at: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          consent_purpose?: string | null;
          consent_source?: string | null;
          consented_at?: string | null;
          contact_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          display_hint?: string | null;
          id?: string | null;
          method_kind?: string | null;
          organization_id?: string | null;
          revoked_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          consent_purpose?: string | null;
          consent_source?: string | null;
          consented_at?: string | null;
          contact_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          display_hint?: string | null;
          id?: string | null;
          method_kind?: string | null;
          organization_id?: string | null;
          revoked_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contact_methods_contact_fk";
            columns: ["organization_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
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
      conversation_assignments: {
        Row: {
          agent_key: string | null;
          assignee_kind: string | null;
          channel_connection_id: string | null;
          conversation_id: string | null;
          created_at: string | null;
          ended_at: string | null;
          id: string | null;
          member_user_id: string | null;
          opportunity_id: string | null;
          organization_id: string | null;
          reason: string | null;
          started_at: string | null;
        };
        Insert: {
          agent_key?: string | null;
          assignee_kind?: string | null;
          channel_connection_id?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          ended_at?: string | null;
          id?: string | null;
          member_user_id?: string | null;
          opportunity_id?: string | null;
          organization_id?: string | null;
          reason?: string | null;
          started_at?: string | null;
        };
        Update: {
          agent_key?: string | null;
          assignee_kind?: string | null;
          channel_connection_id?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          ended_at?: string | null;
          id?: string | null;
          member_user_id?: string | null;
          opportunity_id?: string | null;
          organization_id?: string | null;
          reason?: string | null;
          started_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_assignments_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "conversation_assignments_member_fk";
            columns: ["organization_id", "member_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "conversation_assignments_opportunity_fk";
            columns: ["organization_id", "opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["organization_id", "id"];
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
      current_social_capabilities: {
        Row: {
          capability_code: string | null;
          capability_constraints: Json | null;
          created_at: string | null;
          id: string | null;
          observation_source: string | null;
          observed_at: string | null;
          organization_id: string | null;
          social_connection_id: string | null;
          status: string | null;
          valid_until: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "social_capabilities_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      handoffs: {
        Row: {
          accepted_assignment_id: string | null;
          channel_connection_id: string | null;
          context_summary: Json | null;
          conversation_id: string | null;
          created_at: string | null;
          decided_at: string | null;
          decided_by_user_id: string | null;
          from_assignment_id: string | null;
          id: string | null;
          opportunity_id: string | null;
          organization_id: string | null;
          reason: string | null;
          requested_at: string | null;
          requested_by_user_id: string | null;
          status: string | null;
          target_agent_key: string | null;
          target_kind: string | null;
          target_member_user_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          accepted_assignment_id?: string | null;
          channel_connection_id?: string | null;
          context_summary?: Json | null;
          conversation_id?: string | null;
          created_at?: string | null;
          decided_at?: string | null;
          decided_by_user_id?: string | null;
          from_assignment_id?: string | null;
          id?: string | null;
          opportunity_id?: string | null;
          organization_id?: string | null;
          reason?: string | null;
          requested_at?: string | null;
          requested_by_user_id?: string | null;
          status?: string | null;
          target_agent_key?: string | null;
          target_kind?: string | null;
          target_member_user_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          accepted_assignment_id?: string | null;
          channel_connection_id?: string | null;
          context_summary?: Json | null;
          conversation_id?: string | null;
          created_at?: string | null;
          decided_at?: string | null;
          decided_by_user_id?: string | null;
          from_assignment_id?: string | null;
          id?: string | null;
          opportunity_id?: string | null;
          organization_id?: string | null;
          reason?: string | null;
          requested_at?: string | null;
          requested_by_user_id?: string | null;
          status?: string | null;
          target_agent_key?: string | null;
          target_kind?: string | null;
          target_member_user_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "handoffs_accepted_assignment_fk";
            columns: ["organization_id", "accepted_assignment_id"];
            isOneToOne: false;
            referencedRelation: "conversation_assignments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "handoffs_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "handoffs_decided_by_fk";
            columns: ["organization_id", "decided_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "handoffs_from_assignment_fk";
            columns: ["organization_id", "from_assignment_id"];
            isOneToOne: false;
            referencedRelation: "conversation_assignments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "handoffs_opportunity_fk";
            columns: ["organization_id", "opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "handoffs_requested_by_fk";
            columns: ["organization_id", "requested_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "handoffs_target_member_fk";
            columns: ["organization_id", "target_member_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
        ];
      };
      inventory_availability: {
        Row: {
          available_quantity: number | null;
          balance_updated_at: string | null;
          inventory_item_id: string | null;
          inventory_unit_id: string | null;
          on_hand_quantity: number | null;
          organization_id: string | null;
          reserved_quantity: number | null;
          variant_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_items_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_items_unit_fk";
            columns: ["organization_id", "inventory_unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_items_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: true;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_balances: {
        Row: {
          available_quantity: number | null;
          created_at: string | null;
          id: string | null;
          inventory_item_id: string | null;
          location_id: string | null;
          on_hand_quantity: number | null;
          organization_id: string | null;
          reserved_quantity: number | null;
          updated_at: string | null;
          version: number | null;
        };
        Insert: {
          available_quantity?: number | null;
          created_at?: string | null;
          id?: string | null;
          inventory_item_id?: string | null;
          location_id?: string | null;
          on_hand_quantity?: number | null;
          organization_id?: string | null;
          reserved_quantity?: number | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Update: {
          available_quantity?: number | null;
          created_at?: string | null;
          id?: string | null;
          inventory_item_id?: string | null;
          location_id?: string | null;
          on_hand_quantity?: number | null;
          organization_id?: string | null;
          reserved_quantity?: number | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_balances_item_fk";
            columns: ["organization_id", "inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_availability";
            referencedColumns: ["organization_id", "inventory_item_id"];
          },
          {
            foreignKeyName: "inventory_balances_item_fk";
            columns: ["organization_id", "inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_balances_location_fk";
            columns: ["organization_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_composition_availability: {
        Row: {
          available_sale_quantity: number | null;
          composition_id: string | null;
          offered_variant_id: string | null;
          organization_id: string | null;
          sale_unit_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_compositions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_compositions_sale_unit_fk";
            columns: ["organization_id", "sale_unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_compositions_variant_fk";
            columns: ["organization_id", "offered_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_composition_components: {
        Row: {
          composition_id: string | null;
          created_at: string | null;
          id: string | null;
          inventory_item_id: string | null;
          organization_id: string | null;
          quantity_per_sale_unit: number | null;
        };
        Insert: {
          composition_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          inventory_item_id?: string | null;
          organization_id?: string | null;
          quantity_per_sale_unit?: number | null;
        };
        Update: {
          composition_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          inventory_item_id?: string | null;
          organization_id?: string | null;
          quantity_per_sale_unit?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_composition_components_composition_fk";
            columns: ["organization_id", "composition_id"];
            isOneToOne: false;
            referencedRelation: "inventory_composition_availability";
            referencedColumns: ["organization_id", "composition_id"];
          },
          {
            foreignKeyName: "inventory_composition_components_composition_fk";
            columns: ["organization_id", "composition_id"];
            isOneToOne: false;
            referencedRelation: "inventory_compositions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_composition_components_item_fk";
            columns: ["organization_id", "inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_availability";
            referencedColumns: ["organization_id", "inventory_item_id"];
          },
          {
            foreignKeyName: "inventory_composition_components_item_fk";
            columns: ["organization_id", "inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_compositions: {
        Row: {
          created_at: string | null;
          effective_at: string | null;
          evidence_id: string | null;
          id: string | null;
          offered_variant_id: string | null;
          organization_id: string | null;
          retired_at: string | null;
          sale_unit_id: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          effective_at?: string | null;
          evidence_id?: string | null;
          id?: string | null;
          offered_variant_id?: string | null;
          organization_id?: string | null;
          retired_at?: string | null;
          sale_unit_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          effective_at?: string | null;
          evidence_id?: string | null;
          id?: string | null;
          offered_variant_id?: string | null;
          organization_id?: string | null;
          retired_at?: string | null;
          sale_unit_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_compositions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_compositions_sale_unit_fk";
            columns: ["organization_id", "sale_unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_compositions_variant_fk";
            columns: ["organization_id", "offered_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_items: {
        Row: {
          created_at: string | null;
          id: string | null;
          inventory_unit_id: string | null;
          organization_id: string | null;
          retired_at: string | null;
          status: string | null;
          updated_at: string | null;
          variant_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          inventory_unit_id?: string | null;
          organization_id?: string | null;
          retired_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          inventory_unit_id?: string | null;
          organization_id?: string | null;
          retired_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_items_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_items_unit_fk";
            columns: ["organization_id", "inventory_unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_items_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: true;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_locations: {
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
            foreignKeyName: "inventory_locations_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          created_at: string | null;
          id: string | null;
          inventory_item_id: string | null;
          location_id: string | null;
          on_hand_quantity_after: number | null;
          operation_id: string | null;
          organization_id: string | null;
          quantity_delta: number | null;
          reserved_quantity_after: number | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          inventory_item_id?: string | null;
          location_id?: string | null;
          on_hand_quantity_after?: number | null;
          operation_id?: string | null;
          organization_id?: string | null;
          quantity_delta?: number | null;
          reserved_quantity_after?: number | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          inventory_item_id?: string | null;
          location_id?: string | null;
          on_hand_quantity_after?: number | null;
          operation_id?: string | null;
          organization_id?: string | null;
          quantity_delta?: number | null;
          reserved_quantity_after?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_fk";
            columns: ["organization_id", "inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_availability";
            referencedColumns: ["organization_id", "inventory_item_id"];
          },
          {
            foreignKeyName: "inventory_movements_item_fk";
            columns: ["organization_id", "inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_movements_location_fk";
            columns: ["organization_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_movements_operation_fk";
            columns: ["organization_id", "operation_id"];
            isOneToOne: false;
            referencedRelation: "inventory_operations";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_operations: {
        Row: {
          composition_id: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          id: string | null;
          occurred_at: string | null;
          operation_code: string | null;
          organization_id: string | null;
          reason: string | null;
          reference_id: string | null;
          reference_type: string | null;
          sale_quantity: number | null;
        };
        Insert: {
          composition_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          occurred_at?: string | null;
          operation_code?: string | null;
          organization_id?: string | null;
          reason?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          sale_quantity?: number | null;
        };
        Update: {
          composition_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          occurred_at?: string | null;
          operation_code?: string | null;
          organization_id?: string | null;
          reason?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          sale_quantity?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_operations_composition_fk";
            columns: ["organization_id", "composition_id"];
            isOneToOne: false;
            referencedRelation: "inventory_composition_availability";
            referencedColumns: ["organization_id", "composition_id"];
          },
          {
            foreignKeyName: "inventory_operations_composition_fk";
            columns: ["organization_id", "composition_id"];
            isOneToOne: false;
            referencedRelation: "inventory_compositions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_reservation_event_lines: {
        Row: {
          created_at: string | null;
          id: string | null;
          organization_id: string | null;
          quantity: number | null;
          reservation_event_id: string | null;
          reservation_line_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          quantity?: number | null;
          reservation_event_id?: string | null;
          reservation_line_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          quantity?: number | null;
          reservation_event_id?: string | null;
          reservation_line_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_reservation_event_lines_event_fk";
            columns: ["organization_id", "reservation_event_id"];
            isOneToOne: false;
            referencedRelation: "inventory_reservation_events";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_reservation_event_lines_reservation_line_fk";
            columns: ["organization_id", "reservation_line_id"];
            isOneToOne: false;
            referencedRelation: "inventory_reservation_lines";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_reservation_events: {
        Row: {
          action: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          id: string | null;
          occurred_at: string | null;
          operation_id: string | null;
          organization_id: string | null;
          reason: string | null;
          reservation_id: string | null;
        };
        Insert: {
          action?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          occurred_at?: string | null;
          operation_id?: string | null;
          organization_id?: string | null;
          reason?: string | null;
          reservation_id?: string | null;
        };
        Update: {
          action?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          occurred_at?: string | null;
          operation_id?: string | null;
          organization_id?: string | null;
          reason?: string | null;
          reservation_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_reservation_events_operation_fk";
            columns: ["organization_id", "operation_id"];
            isOneToOne: false;
            referencedRelation: "inventory_operations";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_reservation_events_reservation_fk";
            columns: ["organization_id", "reservation_id"];
            isOneToOne: false;
            referencedRelation: "inventory_reservations";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_reservation_lines: {
        Row: {
          consumed_quantity: number | null;
          created_at: string | null;
          id: string | null;
          inventory_item_id: string | null;
          location_id: string | null;
          organization_id: string | null;
          released_quantity: number | null;
          reservation_id: string | null;
          reserved_quantity: number | null;
          updated_at: string | null;
        };
        Insert: {
          consumed_quantity?: number | null;
          created_at?: string | null;
          id?: string | null;
          inventory_item_id?: string | null;
          location_id?: string | null;
          organization_id?: string | null;
          released_quantity?: number | null;
          reservation_id?: string | null;
          reserved_quantity?: number | null;
          updated_at?: string | null;
        };
        Update: {
          consumed_quantity?: number | null;
          created_at?: string | null;
          id?: string | null;
          inventory_item_id?: string | null;
          location_id?: string | null;
          organization_id?: string | null;
          released_quantity?: number | null;
          reservation_id?: string | null;
          reserved_quantity?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_reservation_lines_item_fk";
            columns: ["organization_id", "inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_availability";
            referencedColumns: ["organization_id", "inventory_item_id"];
          },
          {
            foreignKeyName: "inventory_reservation_lines_item_fk";
            columns: ["organization_id", "inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_reservation_lines_location_fk";
            columns: ["organization_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_reservation_lines_reservation_fk";
            columns: ["organization_id", "reservation_id"];
            isOneToOne: false;
            referencedRelation: "inventory_reservations";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_reservations: {
        Row: {
          closed_at: string | null;
          composition_id: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          expires_at: string | null;
          id: string | null;
          organization_id: string | null;
          reason: string | null;
          reference_id: string | null;
          reference_type: string | null;
          reserved_at: string | null;
          sale_quantity: number | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          closed_at?: string | null;
          composition_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          expires_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          reason?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          reserved_at?: string | null;
          sale_quantity?: number | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          closed_at?: string | null;
          composition_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          expires_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          reason?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          reserved_at?: string | null;
          sale_quantity?: number | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_composition_fk";
            columns: ["organization_id", "composition_id"];
            isOneToOne: false;
            referencedRelation: "inventory_composition_availability";
            referencedColumns: ["organization_id", "composition_id"];
          },
          {
            foreignKeyName: "inventory_reservations_composition_fk";
            columns: ["organization_id", "composition_id"];
            isOneToOne: false;
            referencedRelation: "inventory_compositions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      lead_interests: {
        Row: {
          captured_context: Json | null;
          created_at: string | null;
          id: string | null;
          lead_id: string | null;
          organization_id: string | null;
          requested_quantity: number | null;
          status: string | null;
          summary: string | null;
          unit_id: string | null;
          updated_at: string | null;
          variant_id: string | null;
        };
        Insert: {
          captured_context?: Json | null;
          created_at?: string | null;
          id?: string | null;
          lead_id?: string | null;
          organization_id?: string | null;
          requested_quantity?: number | null;
          status?: string | null;
          summary?: string | null;
          unit_id?: string | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Update: {
          captured_context?: Json | null;
          created_at?: string | null;
          id?: string | null;
          lead_id?: string | null;
          organization_id?: string | null;
          requested_quantity?: number | null;
          status?: string | null;
          summary?: string | null;
          unit_id?: string | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lead_interests_lead_fk";
            columns: ["organization_id", "lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "lead_interests_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "lead_interests_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      leads: {
        Row: {
          captured_at: string | null;
          channel_connection_id: string | null;
          closed_at: string | null;
          contact_id: string | null;
          conversation_id: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          id: string | null;
          organization_id: string | null;
          source: string | null;
          status: string | null;
          summary: string | null;
          updated_at: string | null;
        };
        Insert: {
          captured_at?: string | null;
          channel_connection_id?: string | null;
          closed_at?: string | null;
          contact_id?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          source?: string | null;
          status?: string | null;
          summary?: string | null;
          updated_at?: string | null;
        };
        Update: {
          captured_at?: string | null;
          channel_connection_id?: string | null;
          closed_at?: string | null;
          contact_id?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          source?: string | null;
          status?: string | null;
          summary?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_contact_fk";
            columns: ["organization_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "leads_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
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
      opportunities: {
        Row: {
          closed_at: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          currency_code: string | null;
          estimated_amount: number | null;
          handling_mode: string | null;
          id: string | null;
          lead_id: string | null;
          opened_at: string | null;
          organization_id: string | null;
          stage_code: string | null;
          status: string | null;
          title: string | null;
          updated_at: string | null;
        };
        Insert: {
          closed_at?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          currency_code?: string | null;
          estimated_amount?: number | null;
          handling_mode?: string | null;
          id?: string | null;
          lead_id?: string | null;
          opened_at?: string | null;
          organization_id?: string | null;
          stage_code?: string | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Update: {
          closed_at?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          currency_code?: string | null;
          estimated_amount?: number | null;
          handling_mode?: string | null;
          id?: string | null;
          lead_id?: string | null;
          opened_at?: string | null;
          organization_id?: string | null;
          stage_code?: string | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "opportunities_lead_fk";
            columns: ["organization_id", "lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      order_lines: {
        Row: {
          calculation_method: string | null;
          created_at: string | null;
          currency_code: string | null;
          id: string | null;
          line_number: number | null;
          line_total_amount: number | null;
          offer_snapshot: Json | null;
          order_id: string | null;
          organization_id: string | null;
          price_amount: number | null;
          price_tier_id: string | null;
          pricing_status: string | null;
          product_name_snapshot: string | null;
          quantity: number | null;
          quoted_at: string | null;
          sku_snapshot: string | null;
          unit_code_snapshot: string | null;
          unit_id: string | null;
          variant_id: string | null;
          variant_name_snapshot: string | null;
        };
        Insert: {
          calculation_method?: string | null;
          created_at?: string | null;
          currency_code?: string | null;
          id?: string | null;
          line_number?: number | null;
          line_total_amount?: number | null;
          offer_snapshot?: Json | null;
          order_id?: string | null;
          organization_id?: string | null;
          price_amount?: number | null;
          price_tier_id?: string | null;
          pricing_status?: string | null;
          product_name_snapshot?: string | null;
          quantity?: number | null;
          quoted_at?: string | null;
          sku_snapshot?: string | null;
          unit_code_snapshot?: string | null;
          unit_id?: string | null;
          variant_id?: string | null;
          variant_name_snapshot?: string | null;
        };
        Update: {
          calculation_method?: string | null;
          created_at?: string | null;
          currency_code?: string | null;
          id?: string | null;
          line_number?: number | null;
          line_total_amount?: number | null;
          offer_snapshot?: Json | null;
          order_id?: string | null;
          organization_id?: string | null;
          price_amount?: number | null;
          price_tier_id?: string | null;
          pricing_status?: string | null;
          product_name_snapshot?: string | null;
          quantity?: number | null;
          quoted_at?: string | null;
          sku_snapshot?: string | null;
          unit_code_snapshot?: string | null;
          unit_id?: string | null;
          variant_id?: string | null;
          variant_name_snapshot?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_lines_order_fk";
            columns: ["organization_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "order_lines_price_tier_fk";
            columns: ["organization_id", "price_tier_id"];
            isOneToOne: false;
            referencedRelation: "price_tier_changes";
            referencedColumns: ["organization_id", "previous_price_tier_id"];
          },
          {
            foreignKeyName: "order_lines_price_tier_fk";
            columns: ["organization_id", "price_tier_id"];
            isOneToOne: false;
            referencedRelation: "price_tier_changes";
            referencedColumns: ["organization_id", "price_tier_id"];
          },
          {
            foreignKeyName: "order_lines_price_tier_fk";
            columns: ["organization_id", "price_tier_id"];
            isOneToOne: false;
            referencedRelation: "price_tiers";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "order_lines_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "order_lines_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      order_reservation_links: {
        Row: {
          created_at: string | null;
          id: string | null;
          linked_at: string | null;
          linked_by_user_id: string | null;
          order_id: string | null;
          organization_id: string | null;
          purpose: string | null;
          reservation_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          linked_at?: string | null;
          linked_by_user_id?: string | null;
          order_id?: string | null;
          organization_id?: string | null;
          purpose?: string | null;
          reservation_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          linked_at?: string | null;
          linked_by_user_id?: string | null;
          order_id?: string | null;
          organization_id?: string | null;
          purpose?: string | null;
          reservation_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_reservation_links_linked_by_fk";
            columns: ["organization_id", "linked_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "order_reservation_links_order_fk";
            columns: ["organization_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "order_reservation_links_reservation_fk";
            columns: ["organization_id", "reservation_id"];
            isOneToOne: true;
            referencedRelation: "inventory_reservations";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      orders: {
        Row: {
          channel_connection_id: string | null;
          closed_at: string | null;
          contact_id: string | null;
          contact_snapshot: Json | null;
          conversation_id: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          currency_code: string | null;
          customer_note: string | null;
          handling_mode: string | null;
          id: string | null;
          notification_channel_connection_id: string | null;
          notification_outbox_event_id: string | null;
          notification_status: string | null;
          notified_at: string | null;
          opportunity_id: string | null;
          organization_id: string | null;
          origin: string | null;
          preferred_contact_method_id: string | null;
          status: string | null;
          submitted_at: string | null;
          subtotal_amount: number | null;
          total_amount: number | null;
          updated_at: string | null;
        };
        Insert: {
          channel_connection_id?: string | null;
          closed_at?: string | null;
          contact_id?: string | null;
          contact_snapshot?: Json | null;
          conversation_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          currency_code?: string | null;
          customer_note?: string | null;
          handling_mode?: string | null;
          id?: string | null;
          notification_channel_connection_id?: string | null;
          notification_outbox_event_id?: string | null;
          notification_status?: string | null;
          notified_at?: string | null;
          opportunity_id?: string | null;
          organization_id?: string | null;
          origin?: string | null;
          preferred_contact_method_id?: string | null;
          status?: string | null;
          submitted_at?: string | null;
          subtotal_amount?: number | null;
          total_amount?: number | null;
          updated_at?: string | null;
        };
        Update: {
          channel_connection_id?: string | null;
          closed_at?: string | null;
          contact_id?: string | null;
          contact_snapshot?: Json | null;
          conversation_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          currency_code?: string | null;
          customer_note?: string | null;
          handling_mode?: string | null;
          id?: string | null;
          notification_channel_connection_id?: string | null;
          notification_outbox_event_id?: string | null;
          notification_status?: string | null;
          notified_at?: string | null;
          opportunity_id?: string | null;
          organization_id?: string | null;
          origin?: string | null;
          preferred_contact_method_id?: string | null;
          status?: string | null;
          submitted_at?: string | null;
          subtotal_amount?: number | null;
          total_amount?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_contact_fk";
            columns: ["organization_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "orders_contact_method_fk";
            columns: ["organization_id", "preferred_contact_method_id"];
            isOneToOne: false;
            referencedRelation: "contact_methods";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "orders_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "orders_opportunity_fk";
            columns: ["organization_id", "opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["organization_id", "id"];
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
      pending_requests: {
        Row: {
          channel_connection_id: string | null;
          collected_context: Json | null;
          contact_id: string | null;
          conversation_id: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          due_at: string | null;
          id: string | null;
          organization_id: string | null;
          request_kind: string | null;
          requested_fields: Json | null;
          requested_quantity: number | null;
          resolution_kind: string | null;
          resolution_text: string | null;
          resolved_at: string | null;
          resolved_by_user_id: string | null;
          resolved_currency_code: string | null;
          resolved_price_amount: number | null;
          responded_at: string | null;
          response_delivery_status: string | null;
          response_outbox_event_id: string | null;
          source_message_id: string | null;
          status: string | null;
          unit_id: string | null;
          updated_at: string | null;
          variant_id: string | null;
        };
        Insert: {
          channel_connection_id?: string | null;
          collected_context?: Json | null;
          contact_id?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          due_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          request_kind?: string | null;
          requested_fields?: Json | null;
          requested_quantity?: number | null;
          resolution_kind?: string | null;
          resolution_text?: string | null;
          resolved_at?: string | null;
          resolved_by_user_id?: string | null;
          resolved_currency_code?: string | null;
          resolved_price_amount?: number | null;
          responded_at?: string | null;
          response_delivery_status?: string | null;
          response_outbox_event_id?: string | null;
          source_message_id?: string | null;
          status?: string | null;
          unit_id?: string | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Update: {
          channel_connection_id?: string | null;
          collected_context?: Json | null;
          contact_id?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          due_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          request_kind?: string | null;
          requested_fields?: Json | null;
          requested_quantity?: number | null;
          resolution_kind?: string | null;
          resolution_text?: string | null;
          resolved_at?: string | null;
          resolved_by_user_id?: string | null;
          resolved_currency_code?: string | null;
          resolved_price_amount?: number | null;
          responded_at?: string | null;
          response_delivery_status?: string | null;
          response_outbox_event_id?: string | null;
          source_message_id?: string | null;
          status?: string | null;
          unit_id?: string | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pending_requests_contact_fk";
            columns: ["organization_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "pending_requests_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "pending_requests_resolved_by_fk";
            columns: ["organization_id", "resolved_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "pending_requests_source_message_fk";
            columns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "source_message_id",
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
            foreignKeyName: "pending_requests_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "pending_requests_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
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
      publication_batches: {
        Row: {
          cancel_requested_at: string | null;
          completed_at: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          id: string | null;
          organization_id: string | null;
          policy_snapshot: Json | null;
          requested_operation: string | null;
          schedule_generation: number | null;
          schedule_id: string | null;
          schedule_occurrence_at: string | null;
          selection_criteria_snapshot: Json | null;
          social_connection_id: string | null;
          status: string | null;
          trigger_kind: string | null;
          updated_at: string | null;
        };
        Insert: {
          cancel_requested_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          policy_snapshot?: Json | null;
          requested_operation?: string | null;
          schedule_generation?: number | null;
          schedule_id?: string | null;
          schedule_occurrence_at?: string | null;
          selection_criteria_snapshot?: Json | null;
          social_connection_id?: string | null;
          status?: string | null;
          trigger_kind?: string | null;
          updated_at?: string | null;
        };
        Update: {
          cancel_requested_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          policy_snapshot?: Json | null;
          requested_operation?: string | null;
          schedule_generation?: number | null;
          schedule_id?: string | null;
          schedule_occurrence_at?: string | null;
          selection_criteria_snapshot?: Json | null;
          social_connection_id?: string | null;
          status?: string | null;
          trigger_kind?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "publication_batches_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_batches_schedule_fk";
            columns: ["organization_id", "schedule_id"];
            isOneToOne: false;
            referencedRelation: "publication_schedules";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      publication_commands: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          id: string | null;
          operation: string | null;
          organization_id: string | null;
          result_id: string | null;
          result_type: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          operation?: string | null;
          organization_id?: string | null;
          result_id?: string | null;
          result_type?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          operation?: string | null;
          organization_id?: string | null;
          result_id?: string | null;
          result_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "publication_commands_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      publication_events: {
        Row: {
          batch_id: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          event_payload: Json | null;
          event_type: string | null;
          id: string | null;
          instance_id: string | null;
          job_id: string | null;
          new_status: string | null;
          occurred_at: string | null;
          organization_id: string | null;
          previous_status: string | null;
          publication_id: string | null;
          publication_version_id: string | null;
          reason: string | null;
          schedule_id: string | null;
          social_connection_id: string | null;
        };
        Insert: {
          batch_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          event_payload?: Json | null;
          event_type?: string | null;
          id?: string | null;
          instance_id?: string | null;
          job_id?: string | null;
          new_status?: string | null;
          occurred_at?: string | null;
          organization_id?: string | null;
          previous_status?: string | null;
          publication_id?: string | null;
          publication_version_id?: string | null;
          reason?: string | null;
          schedule_id?: string | null;
          social_connection_id?: string | null;
        };
        Update: {
          batch_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          event_payload?: Json | null;
          event_type?: string | null;
          id?: string | null;
          instance_id?: string | null;
          job_id?: string | null;
          new_status?: string | null;
          occurred_at?: string | null;
          organization_id?: string | null;
          previous_status?: string | null;
          publication_id?: string | null;
          publication_version_id?: string | null;
          reason?: string | null;
          schedule_id?: string | null;
          social_connection_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "publication_events_batch_fk";
            columns: ["organization_id", "batch_id"];
            isOneToOne: false;
            referencedRelation: "publication_batches";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_events_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_events_instance_fk";
            columns: ["organization_id", "instance_id"];
            isOneToOne: false;
            referencedRelation: "publication_instances";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_events_instance_fk";
            columns: ["organization_id", "instance_id"];
            isOneToOne: false;
            referencedRelation: "publication_origin_lookup";
            referencedColumns: ["organization_id", "publication_instance_id"];
          },
          {
            foreignKeyName: "publication_events_job_fk";
            columns: ["organization_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "publication_jobs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_events_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publication_events_publication_fk";
            columns: ["organization_id", "publication_id"];
            isOneToOne: false;
            referencedRelation: "publications";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_events_schedule_fk";
            columns: ["organization_id", "schedule_id"];
            isOneToOne: false;
            referencedRelation: "publication_schedules";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_events_version_fk";
            columns: ["organization_id", "publication_version_id"];
            isOneToOne: false;
            referencedRelation: "publication_versions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      publication_instances: {
        Row: {
          created_at: string | null;
          creation_job_id: string | null;
          external_publication_id: string | null;
          external_url: string | null;
          id: string | null;
          last_reconciled_at: string | null;
          organization_id: string | null;
          provider_created_at: string | null;
          provider_updated_at: string | null;
          publication_id: string | null;
          publication_version_id: string | null;
          social_connection_id: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          creation_job_id?: string | null;
          external_publication_id?: string | null;
          external_url?: string | null;
          id?: string | null;
          last_reconciled_at?: string | null;
          organization_id?: string | null;
          provider_created_at?: string | null;
          provider_updated_at?: string | null;
          publication_id?: string | null;
          publication_version_id?: string | null;
          social_connection_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          creation_job_id?: string | null;
          external_publication_id?: string | null;
          external_url?: string | null;
          id?: string | null;
          last_reconciled_at?: string | null;
          organization_id?: string | null;
          provider_created_at?: string | null;
          provider_updated_at?: string | null;
          publication_id?: string | null;
          publication_version_id?: string | null;
          social_connection_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "publication_instances_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_instances_creation_job_fk";
            columns: ["organization_id", "creation_job_id"];
            isOneToOne: true;
            referencedRelation: "publication_jobs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_instances_publication_fk";
            columns: ["organization_id", "publication_id"];
            isOneToOne: false;
            referencedRelation: "publications";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_instances_version_fk";
            columns: ["organization_id", "publication_id", "publication_version_id"];
            isOneToOne: false;
            referencedRelation: "publication_versions";
            referencedColumns: ["organization_id", "publication_id", "id"];
          },
        ];
      };
      publication_jobs: {
        Row: {
          attempt_count: number | null;
          authorized_at: string | null;
          available_at: string | null;
          batch_id: string | null;
          capability_code: string | null;
          completed_at: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          effect_started_at: string | null;
          id: string | null;
          last_error_class: string | null;
          last_error_code: string | null;
          lease_expires_at: string | null;
          max_attempts: number | null;
          operation: string | null;
          organization_id: string | null;
          priority: number | null;
          processing_started_at: string | null;
          provider_request_id: string | null;
          publication_id: string | null;
          schedule_id: string | null;
          status: string | null;
          target_instance_id: string | null;
          target_version_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          attempt_count?: number | null;
          authorized_at?: string | null;
          available_at?: string | null;
          batch_id?: string | null;
          capability_code?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          effect_started_at?: string | null;
          id?: string | null;
          last_error_class?: string | null;
          last_error_code?: string | null;
          lease_expires_at?: string | null;
          max_attempts?: number | null;
          operation?: string | null;
          organization_id?: string | null;
          priority?: number | null;
          processing_started_at?: string | null;
          provider_request_id?: string | null;
          publication_id?: string | null;
          schedule_id?: string | null;
          status?: string | null;
          target_instance_id?: string | null;
          target_version_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          attempt_count?: number | null;
          authorized_at?: string | null;
          available_at?: string | null;
          batch_id?: string | null;
          capability_code?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          effect_started_at?: string | null;
          id?: string | null;
          last_error_class?: string | null;
          last_error_code?: string | null;
          lease_expires_at?: string | null;
          max_attempts?: number | null;
          operation?: string | null;
          organization_id?: string | null;
          priority?: number | null;
          processing_started_at?: string | null;
          provider_request_id?: string | null;
          publication_id?: string | null;
          schedule_id?: string | null;
          status?: string | null;
          target_instance_id?: string | null;
          target_version_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "publication_jobs_batch_fk";
            columns: ["organization_id", "batch_id"];
            isOneToOne: false;
            referencedRelation: "publication_batches";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_jobs_publication_fk";
            columns: ["organization_id", "publication_id"];
            isOneToOne: false;
            referencedRelation: "publications";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_jobs_schedule_fk";
            columns: ["organization_id", "schedule_id"];
            isOneToOne: false;
            referencedRelation: "publication_schedules";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_jobs_target_instance_fk";
            columns: ["organization_id", "target_instance_id"];
            isOneToOne: false;
            referencedRelation: "publication_instances";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_jobs_target_instance_fk";
            columns: ["organization_id", "target_instance_id"];
            isOneToOne: false;
            referencedRelation: "publication_origin_lookup";
            referencedColumns: ["organization_id", "publication_instance_id"];
          },
          {
            foreignKeyName: "publication_jobs_target_version_fk";
            columns: ["organization_id", "publication_id", "target_version_id"];
            isOneToOne: false;
            referencedRelation: "publication_versions";
            referencedColumns: ["organization_id", "publication_id", "id"];
          },
        ];
      };
      publication_media: {
        Row: {
          alt_text: string | null;
          created_at: string | null;
          id: string | null;
          media_asset_id: string | null;
          media_role: string | null;
          ordinal: number | null;
          organization_id: string | null;
          publication_version_id: string | null;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string | null;
          id?: string | null;
          media_asset_id?: string | null;
          media_role?: string | null;
          ordinal?: number | null;
          organization_id?: string | null;
          publication_version_id?: string | null;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string | null;
          id?: string | null;
          media_asset_id?: string | null;
          media_role?: string | null;
          ordinal?: number | null;
          organization_id?: string | null;
          publication_version_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "publication_media_asset_fk";
            columns: ["organization_id", "media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_media_version_fk";
            columns: ["organization_id", "publication_version_id"];
            isOneToOne: false;
            referencedRelation: "publication_versions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      publication_origin_lookup: {
        Row: {
          created_at: string | null;
          currency_code: string | null;
          external_publication_id: string | null;
          external_url: string | null;
          instance_status: string | null;
          organization_id: string | null;
          price_amount: number | null;
          pricing_status: string | null;
          publication_id: string | null;
          publication_instance_id: string | null;
          publication_version_id: string | null;
          social_connection_id: string | null;
          variant_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "publication_instances_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      publication_schedules: {
        Row: {
          code: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          expression_kind: string | null;
          generation: number | null;
          id: string | null;
          last_enqueued_at: string | null;
          name: string | null;
          next_run_at: string | null;
          organization_id: string | null;
          requested_operation: string | null;
          retired_at: string | null;
          schedule_expression: string | null;
          schedule_policy: Json | null;
          selection_criteria: Json | null;
          social_connection_id: string | null;
          status: string | null;
          timezone_name: string | null;
          updated_at: string | null;
          validation_status: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          expression_kind?: string | null;
          generation?: number | null;
          id?: string | null;
          last_enqueued_at?: string | null;
          name?: string | null;
          next_run_at?: string | null;
          organization_id?: string | null;
          requested_operation?: string | null;
          retired_at?: string | null;
          schedule_expression?: string | null;
          schedule_policy?: Json | null;
          selection_criteria?: Json | null;
          social_connection_id?: string | null;
          status?: string | null;
          timezone_name?: string | null;
          updated_at?: string | null;
          validation_status?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          expression_kind?: string | null;
          generation?: number | null;
          id?: string | null;
          last_enqueued_at?: string | null;
          name?: string | null;
          next_run_at?: string | null;
          organization_id?: string | null;
          requested_operation?: string | null;
          retired_at?: string | null;
          schedule_expression?: string | null;
          schedule_policy?: Json | null;
          selection_criteria?: Json | null;
          social_connection_id?: string | null;
          status?: string | null;
          timezone_name?: string | null;
          updated_at?: string | null;
          validation_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "publication_schedules_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      publication_versions: {
        Row: {
          approved_at: string | null;
          approved_by_user_id: string | null;
          availability_snapshot: Json | null;
          body: string | null;
          calculation_method: string | null;
          call_to_action: string | null;
          content_payload: Json | null;
          created_at: string | null;
          created_by_user_id: string | null;
          currency_code: string | null;
          headline: string | null;
          id: string | null;
          organization_id: string | null;
          price_amount: number | null;
          pricing_status: string | null;
          publication_id: string | null;
          source_price_tier_id: string | null;
          source_price_valid_from: string | null;
          source_variant_updated_at: string | null;
          status: string | null;
          version_number: number | null;
        };
        Insert: {
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          availability_snapshot?: Json | null;
          body?: string | null;
          calculation_method?: string | null;
          call_to_action?: string | null;
          content_payload?: Json | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          currency_code?: string | null;
          headline?: string | null;
          id?: string | null;
          organization_id?: string | null;
          price_amount?: number | null;
          pricing_status?: string | null;
          publication_id?: string | null;
          source_price_tier_id?: string | null;
          source_price_valid_from?: string | null;
          source_variant_updated_at?: string | null;
          status?: string | null;
          version_number?: number | null;
        };
        Update: {
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          availability_snapshot?: Json | null;
          body?: string | null;
          calculation_method?: string | null;
          call_to_action?: string | null;
          content_payload?: Json | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          currency_code?: string | null;
          headline?: string | null;
          id?: string | null;
          organization_id?: string | null;
          price_amount?: number | null;
          pricing_status?: string | null;
          publication_id?: string | null;
          source_price_tier_id?: string | null;
          source_price_valid_from?: string | null;
          source_variant_updated_at?: string | null;
          status?: string | null;
          version_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "publication_versions_approved_by_fk";
            columns: ["organization_id", "approved_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "publication_versions_price_tier_fk";
            columns: ["organization_id", "source_price_tier_id"];
            isOneToOne: false;
            referencedRelation: "price_tier_changes";
            referencedColumns: ["organization_id", "previous_price_tier_id"];
          },
          {
            foreignKeyName: "publication_versions_price_tier_fk";
            columns: ["organization_id", "source_price_tier_id"];
            isOneToOne: false;
            referencedRelation: "price_tier_changes";
            referencedColumns: ["organization_id", "price_tier_id"];
          },
          {
            foreignKeyName: "publication_versions_price_tier_fk";
            columns: ["organization_id", "source_price_tier_id"];
            isOneToOne: false;
            referencedRelation: "price_tiers";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_versions_publication_fk";
            columns: ["organization_id", "publication_id"];
            isOneToOne: false;
            referencedRelation: "publications";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      publications: {
        Row: {
          created_at: string | null;
          created_by_user_id: string | null;
          current_version_id: string | null;
          id: string | null;
          organization_id: string | null;
          retired_at: string | null;
          social_connection_id: string | null;
          status: string | null;
          updated_at: string | null;
          variant_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by_user_id?: string | null;
          current_version_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          retired_at?: string | null;
          social_connection_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by_user_id?: string | null;
          current_version_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          retired_at?: string | null;
          social_connection_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "publications_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publications_current_version_fk";
            columns: ["organization_id", "id", "current_version_id"];
            isOneToOne: false;
            referencedRelation: "publication_versions";
            referencedColumns: ["organization_id", "publication_id", "id"];
          },
          {
            foreignKeyName: "publications_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      sale_lines: {
        Row: {
          created_at: string | null;
          id: string | null;
          inventory_effect_status: string | null;
          inventory_operation_id: string | null;
          line_number: number | null;
          line_total_amount: number | null;
          order_line_id: string | null;
          organization_id: string | null;
          product_name_snapshot: string | null;
          quantity: number | null;
          reverses_sale_line_id: string | null;
          sale_id: string | null;
          sku_snapshot: string | null;
          unit_amount: number | null;
          unit_code_snapshot: string | null;
          unit_id: string | null;
          variant_id: string | null;
          variant_name_snapshot: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          inventory_effect_status?: string | null;
          inventory_operation_id?: string | null;
          line_number?: number | null;
          line_total_amount?: number | null;
          order_line_id?: string | null;
          organization_id?: string | null;
          product_name_snapshot?: string | null;
          quantity?: number | null;
          reverses_sale_line_id?: string | null;
          sale_id?: string | null;
          sku_snapshot?: string | null;
          unit_amount?: number | null;
          unit_code_snapshot?: string | null;
          unit_id?: string | null;
          variant_id?: string | null;
          variant_name_snapshot?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          inventory_effect_status?: string | null;
          inventory_operation_id?: string | null;
          line_number?: number | null;
          line_total_amount?: number | null;
          order_line_id?: string | null;
          organization_id?: string | null;
          product_name_snapshot?: string | null;
          quantity?: number | null;
          reverses_sale_line_id?: string | null;
          sale_id?: string | null;
          sku_snapshot?: string | null;
          unit_amount?: number | null;
          unit_code_snapshot?: string | null;
          unit_id?: string | null;
          variant_id?: string | null;
          variant_name_snapshot?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sale_lines_inventory_operation_fk";
            columns: ["organization_id", "inventory_operation_id"];
            isOneToOne: false;
            referencedRelation: "inventory_operations";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sale_lines_order_line_fk";
            columns: ["organization_id", "order_line_id"];
            isOneToOne: false;
            referencedRelation: "order_lines";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sale_lines_reverses_sale_line_fk";
            columns: ["organization_id", "reverses_sale_line_id"];
            isOneToOne: false;
            referencedRelation: "sale_lines";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sale_lines_sale_fk";
            columns: ["organization_id", "sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sale_lines_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sale_lines_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      sales: {
        Row: {
          contact_id: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          currency_code: string | null;
          id: string | null;
          note: string | null;
          occurred_at: string | null;
          opportunity_id: string | null;
          order_id: string | null;
          organization_id: string | null;
          reverses_sale_id: string | null;
          sale_kind: string | null;
          source: string | null;
          subtotal_amount: number | null;
          total_amount: number | null;
        };
        Insert: {
          contact_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          currency_code?: string | null;
          id?: string | null;
          note?: string | null;
          occurred_at?: string | null;
          opportunity_id?: string | null;
          order_id?: string | null;
          organization_id?: string | null;
          reverses_sale_id?: string | null;
          sale_kind?: string | null;
          source?: string | null;
          subtotal_amount?: number | null;
          total_amount?: number | null;
        };
        Update: {
          contact_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          currency_code?: string | null;
          id?: string | null;
          note?: string | null;
          occurred_at?: string | null;
          opportunity_id?: string | null;
          order_id?: string | null;
          organization_id?: string | null;
          reverses_sale_id?: string | null;
          sale_kind?: string | null;
          source?: string | null;
          subtotal_amount?: number | null;
          total_amount?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "sales_contact_fk";
            columns: ["organization_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sales_opportunity_fk";
            columns: ["organization_id", "opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sales_order_fk";
            columns: ["organization_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sales_reverses_fk";
            columns: ["organization_id", "reverses_sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      social_capabilities: {
        Row: {
          capability_code: string | null;
          capability_constraints: Json | null;
          created_at: string | null;
          created_by_user_id: string | null;
          id: string | null;
          observation_source: string | null;
          observed_at: string | null;
          organization_id: string | null;
          social_connection_id: string | null;
          status: string | null;
          valid_until: string | null;
        };
        Insert: {
          capability_code?: string | null;
          capability_constraints?: Json | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          observation_source?: string | null;
          observed_at?: string | null;
          organization_id?: string | null;
          social_connection_id?: string | null;
          status?: string | null;
          valid_until?: string | null;
        };
        Update: {
          capability_code?: string | null;
          capability_constraints?: Json | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          observation_source?: string | null;
          observed_at?: string | null;
          organization_id?: string | null;
          social_connection_id?: string | null;
          status?: string | null;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "social_capabilities_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      social_connections: {
        Row: {
          api_version: string | null;
          connected_at: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          disabled_at: string | null;
          display_name: string | null;
          external_account_id: string | null;
          external_app_id: string | null;
          id: string | null;
          last_verified_at: string | null;
          messenger_channel_connection_id: string | null;
          organization_id: string | null;
          provider: string | null;
          status: string | null;
          surface: string | null;
          updated_at: string | null;
        };
        Insert: {
          api_version?: string | null;
          connected_at?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          disabled_at?: string | null;
          display_name?: string | null;
          external_account_id?: string | null;
          external_app_id?: string | null;
          id?: string | null;
          last_verified_at?: string | null;
          messenger_channel_connection_id?: string | null;
          organization_id?: string | null;
          provider?: string | null;
          status?: string | null;
          surface?: string | null;
          updated_at?: string | null;
        };
        Update: {
          api_version?: string | null;
          connected_at?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          disabled_at?: string | null;
          display_name?: string | null;
          external_account_id?: string | null;
          external_app_id?: string | null;
          id?: string | null;
          last_verified_at?: string | null;
          messenger_channel_connection_id?: string | null;
          organization_id?: string | null;
          provider?: string | null;
          status?: string | null;
          surface?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "social_connections_messenger_connection_fk";
            columns: ["organization_id", "messenger_channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "social_connections_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
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
      apply_inventory_composition_movement: {
        Args: {
          target_allocations: Json;
          target_composition_id: string;
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_occurred_at?: string;
          target_operation_code: string;
          target_organization_id: string;
          target_reason: string;
          target_reference_id?: string;
          target_reference_type?: string;
          target_sale_quantity: number;
        };
        Returns: {
          operation_id: string;
          replayed: boolean;
        }[];
      };
      apply_inventory_movement: {
        Args: {
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_lines: Json;
          target_occurred_at?: string;
          target_operation_code: string;
          target_organization_id: string;
          target_reason: string;
          target_reference_id?: string;
          target_reference_type?: string;
        };
        Returns: {
          operation_id: string;
          replayed: boolean;
        }[];
      };
      approve_publication_version: {
        Args: {
          target_created_by_user_id: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_publication_status: string;
          target_publication_version_id: string;
          target_reason: string;
        };
        Returns: {
          publication_version_id: string;
          was_replayed: boolean;
        }[];
      };
      authorize_publication_job: {
        Args: {
          target_lease_token: string;
          target_now?: string;
          target_organization_id: string;
          target_publication_job_id: string;
        };
        Returns: {
          authorization_reason: string;
          authorization_snapshot: Json;
          authorization_status: string;
        }[];
      };
      cancel_publication_batch: {
        Args: {
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_publication_batch_id: string;
          target_reason: string;
        };
        Returns: {
          jobs_cancelled: number;
          jobs_in_flight: number;
          publication_batch_id: string;
          status: string;
          was_replayed: boolean;
        }[];
      };
      claim_publication_job: {
        Args: {
          target_lease_seconds?: number;
          target_now?: string;
          target_worker_id: string;
        };
        Returns: {
          attempt_count: number;
          capability_code: string;
          external_effect_key: string;
          lease_expires_at: string;
          lease_token: string;
          operation: string;
          organization_id: string;
          publication_id: string;
          publication_job_id: string;
          target_instance_id: string;
          target_version_id: string;
        }[];
      };
      create_handoff: {
        Args: {
          target_context_summary: Json;
          target_idempotency_key: string;
          target_opportunity_id: string;
          target_organization_id: string;
          target_reason: string;
          target_requested_by_user_id?: string;
          target_target_agent_key?: string;
          target_target_kind: string;
          target_target_member_user_id?: string;
        };
        Returns: {
          handoff_id: string;
          handoff_status: string;
          replayed: boolean;
        }[];
      };
      create_inventory_composition_reservation: {
        Args: {
          target_allocations: Json;
          target_composition_id: string;
          target_created_by_user_id?: string;
          target_expires_at: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_reason: string;
          target_reference_id?: string;
          target_reference_type?: string;
          target_sale_quantity: number;
        };
        Returns: {
          replayed: boolean;
          reservation_id: string;
          reservation_status: string;
        }[];
      };
      create_inventory_reservation: {
        Args: {
          target_created_by_user_id?: string;
          target_expires_at: string;
          target_idempotency_key: string;
          target_lines: Json;
          target_organization_id: string;
          target_reason: string;
          target_reference_id?: string;
          target_reference_type?: string;
        };
        Returns: {
          replayed: boolean;
          reservation_id: string;
          reservation_status: string;
        }[];
      };
      create_lead: {
        Args: {
          target_channel_connection_id?: string;
          target_contact_id: string;
          target_conversation_id?: string;
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_interests: Json;
          target_organization_id: string;
          target_source: string;
          target_summary: string;
        };
        Returns: {
          lead_id: string;
          lead_status: string;
          replayed: boolean;
        }[];
      };
      create_opportunity: {
        Args: {
          target_agent_key?: string;
          target_assignee_kind: string;
          target_created_by_user_id?: string;
          target_currency_code?: string;
          target_estimated_amount?: number;
          target_handling_mode: string;
          target_idempotency_key: string;
          target_lead_id: string;
          target_member_user_id?: string;
          target_organization_id: string;
          target_stage_code: string;
          target_title: string;
        };
        Returns: {
          assignment_id: string;
          opportunity_id: string;
          opportunity_status: string;
          replayed: boolean;
        }[];
      };
      create_order: {
        Args: {
          target_channel_connection_id?: string;
          target_contact_id: string;
          target_conversation_id?: string;
          target_created_by_user_id?: string;
          target_customer_note?: string;
          target_handling_mode: string;
          target_idempotency_key: string;
          target_lines: Json;
          target_opportunity_id?: string;
          target_organization_id: string;
          target_origin: string;
          target_preferred_contact_method_id?: string;
          target_quoted_at?: string;
        };
        Returns: {
          order_id: string;
          order_status: string;
          replayed: boolean;
          total_amount: number;
        }[];
      };
      create_pending_request: {
        Args: {
          target_channel_connection_id: string;
          target_collected_context: Json;
          target_contact_id: string;
          target_conversation_id: string;
          target_created_by_user_id?: string;
          target_due_at?: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_request_kind: string;
          target_requested_fields: Json;
          target_requested_quantity?: number;
          target_source_message_id?: string;
          target_unit_id?: string;
          target_variant_id?: string;
        };
        Returns: {
          pending_request_id: string;
          pending_status: string;
          replayed: boolean;
        }[];
      };
      create_publication: {
        Args: {
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_social_connection_id: string;
          target_variant_id: string;
        };
        Returns: {
          publication_id: string;
          was_replayed: boolean;
        }[];
      };
      create_publication_schedule: {
        Args: {
          target_code: string;
          target_created_by_user_id: string;
          target_idempotency_key: string;
          target_name: string;
          target_next_run_at: string;
          target_organization_id: string;
          target_requested_operation: string;
          target_schedule_expression: string;
          target_schedule_policy: Json;
          target_selection_criteria: Json;
          target_social_connection_id: string;
          target_status: string;
          target_timezone_name: string;
          target_validation_status: string;
        };
        Returns: {
          publication_schedule_id: string;
          was_replayed: boolean;
        }[];
      };
      create_publication_version: {
        Args: {
          target_body: string;
          target_call_to_action?: string;
          target_content_payload?: Json;
          target_created_by_user_id?: string;
          target_headline?: string;
          target_idempotency_key: string;
          target_media?: Json;
          target_organization_id: string;
          target_publication_id: string;
          target_source_price_tier_id?: string;
        };
        Returns: {
          publication_version_id: string;
          was_replayed: boolean;
        }[];
      };
      enqueue_publication_batch: {
        Args: {
          target_available_at?: string;
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_max_attempts?: number;
          target_next_schedule_run_at?: string;
          target_organization_id: string;
          target_policy_snapshot: Json;
          target_priority?: number;
          target_publication_ids: Json;
          target_requested_operation: string;
          target_schedule_generation?: number;
          target_schedule_id?: string;
          target_schedule_occurrence_at?: string;
          target_selection_criteria: Json;
          target_social_connection_id: string;
          target_trigger_kind: string;
        };
        Returns: {
          jobs_created: number;
          publication_batch_id: string;
          was_replayed: boolean;
        }[];
      };
      enqueue_publication_job: {
        Args: {
          target_available_at?: string;
          target_capability_code: string;
          target_created_by_user_id?: string;
          target_external_effect_key: string;
          target_idempotency_key: string;
          target_instance_id?: string;
          target_max_attempts?: number;
          target_operation: string;
          target_organization_id: string;
          target_priority?: number;
          target_publication_id: string;
          target_version_id?: string;
        };
        Returns: {
          publication_job_id: string;
          was_replayed: boolean;
        }[];
      };
      link_order_reservation: {
        Args: {
          target_idempotency_key: string;
          target_linked_by_user_id?: string;
          target_order_id: string;
          target_organization_id: string;
          target_purpose: string;
          target_reservation_id: string;
        };
        Returns: {
          order_id: string;
          replayed: boolean;
          reservation_id: string;
        }[];
      };
      mark_publication_effect_started: {
        Args: {
          target_lease_token: string;
          target_organization_id: string;
          target_publication_job_id: string;
          target_started_at?: string;
        };
        Returns: string;
      };
      observe_social_capability: {
        Args: {
          target_capability_code: string;
          target_capability_constraints?: Json;
          target_created_by_user_id?: string;
          target_evidence_summary?: Json;
          target_idempotency_key: string;
          target_observation_source: string;
          target_observed_at?: string;
          target_organization_id: string;
          target_social_connection_id: string;
          target_status: string;
          target_valid_until?: string;
        };
        Returns: {
          social_capability_id: string;
          was_replayed: boolean;
        }[];
      };
      reconcile_publication_batch: {
        Args: {
          target_now?: string;
          target_organization_id: string;
          target_publication_batch_id: string;
        };
        Returns: {
          job_counts: Json;
          publication_batch_id: string;
          status: string;
        }[];
      };
      reconcile_sale_inventory: {
        Args: {
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_inventory_operation_id: string;
          target_occurred_at?: string;
          target_organization_id: string;
          target_reason: string;
          target_sale_line_id: string;
        };
        Returns: {
          inventory_effect_status: string;
          replayed: boolean;
          sale_line_id: string;
        }[];
      };
      record_commercial_notification: {
        Args: {
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_outbox_event_id: string;
          target_subject_id: string;
          target_subject_type: string;
        };
        Returns: {
          notification_status: string;
          replayed: boolean;
          subject_id: string;
        }[];
      };
      record_publication_job_result: {
        Args: {
          target_effect_certainty: string;
          target_error_class?: string;
          target_error_code?: string;
          target_error_summary?: Json;
          target_external_publication_id?: string;
          target_external_url?: string;
          target_instance_status?: string;
          target_lease_token: string;
          target_occurred_at?: string;
          target_organization_id: string;
          target_outcome: string;
          target_provider_request_id?: string;
          target_publication_job_id: string;
          target_response_summary?: Json;
          target_retry_at?: string;
        };
        Returns: {
          publication_instance_id: string;
          publication_job_id: string;
          status: string;
        }[];
      };
      record_sale: {
        Args: {
          target_contact_id?: string;
          target_created_by_user_id?: string;
          target_currency_code: string;
          target_idempotency_key: string;
          target_lines: Json;
          target_note?: string;
          target_occurred_at?: string;
          target_opportunity_id?: string;
          target_order_id?: string;
          target_organization_id: string;
          target_reverses_sale_id?: string;
          target_sale_kind: string;
          target_source: string;
        };
        Returns: {
          order_status: string;
          replayed: boolean;
          sale_id: string;
        }[];
      };
      recover_expired_publication_job: {
        Args: {
          target_now?: string;
          target_organization_id: string;
          target_publication_job_id: string;
        };
        Returns: {
          publication_job_id: string;
          status: string;
        }[];
      };
      register_contact_method: {
        Args: {
          target_consent_purpose: string;
          target_consent_source: string;
          target_consented_at: string;
          target_contact_id: string;
          target_created_by_user_id?: string;
          target_display_hint: string;
          target_encryption_key_ref: string;
          target_idempotency_key: string;
          target_method_kind: string;
          target_organization_id: string;
          target_value_ciphertext: string;
          target_value_fingerprint: string;
        };
        Returns: {
          contact_method_id: string;
          replayed: boolean;
        }[];
      };
      register_social_connection: {
        Args: {
          target_api_version?: string;
          target_connected_at?: string;
          target_created_by_user_id?: string;
          target_credential_reference?: string;
          target_display_name?: string;
          target_external_account_id?: string;
          target_external_app_id?: string;
          target_idempotency_key: string;
          target_last_verified_at?: string;
          target_messenger_channel_connection_id?: string;
          target_organization_id: string;
          target_status: string;
        };
        Returns: {
          social_connection_id: string;
          was_replayed: boolean;
        }[];
      };
      resolve_inventory_requirements: {
        Args: {
          target_composition_id: string;
          target_organization_id: string;
          target_sale_quantity: number;
        };
        Returns: {
          composition_id: string;
          inventory_item_id: string;
          inventory_unit_id: string;
          offered_variant_id: string;
          required_quantity: number;
          sale_unit_id: string;
        }[];
      };
      resolve_pending_request: {
        Args: {
          target_action: string;
          target_idempotency_key: string;
          target_occurred_at?: string;
          target_organization_id: string;
          target_pending_request_id: string;
          target_resolution_kind: string;
          target_resolution_text: string;
          target_resolved_by_user_id?: string;
          target_resolved_currency_code?: string;
          target_resolved_price_amount?: number;
        };
        Returns: {
          pending_request_id: string;
          pending_status: string;
          replayed: boolean;
          response_delivery_status: string;
        }[];
      };
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
      transition_handoff: {
        Args: {
          target_action: string;
          target_decided_by_user_id?: string;
          target_handoff_id: string;
          target_idempotency_key: string;
          target_occurred_at?: string;
          target_organization_id: string;
          target_reason: string;
        };
        Returns: {
          active_assignment_id: string;
          handoff_id: string;
          handoff_status: string;
          replayed: boolean;
        }[];
      };
      transition_inventory_reservation: {
        Args: {
          target_action: string;
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_lines?: Json;
          target_occurred_at?: string;
          target_organization_id: string;
          target_reason: string;
          target_reservation_id: string;
        };
        Returns: {
          replayed: boolean;
          reservation_event_id: string;
          reservation_id: string;
          reservation_status: string;
        }[];
      };
      transition_order: {
        Args: {
          target_action: string;
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_occurred_at?: string;
          target_order_id: string;
          target_organization_id: string;
          target_reason: string;
        };
        Returns: {
          order_id: string;
          order_status: string;
          replayed: boolean;
        }[];
      };
      transition_publication: {
        Args: {
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_publication_id: string;
          target_reason: string;
          target_status: string;
        };
        Returns: {
          publication_id: string;
          was_replayed: boolean;
        }[];
      };
      transition_publication_schedule: {
        Args: {
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_next_run_at?: string;
          target_organization_id: string;
          target_publication_schedule_id: string;
          target_reason: string;
          target_status: string;
        };
        Returns: {
          publication_schedule_id: string;
          was_replayed: boolean;
        }[];
      };
      transition_social_connection: {
        Args: {
          target_api_version?: string;
          target_connected_at?: string;
          target_created_by_user_id?: string;
          target_credential_reference?: string;
          target_display_name?: string;
          target_external_account_id?: string;
          target_external_app_id?: string;
          target_idempotency_key: string;
          target_last_verified_at?: string;
          target_messenger_channel_connection_id?: string;
          target_organization_id: string;
          target_reason: string;
          target_social_connection_id: string;
          target_status: string;
        };
        Returns: {
          social_connection_id: string;
          was_replayed: boolean;
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
      commercial_commands: {
        Row: {
          completed_at: string | null;
          created_at: string;
          created_by_user_id: string | null;
          id: string;
          idempotency_key: string;
          operation: string;
          organization_id: string;
          request_fingerprint: string;
          request_payload: Json;
          result_id: string | null;
          result_type: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          idempotency_key: string;
          operation: string;
          organization_id: string;
          request_fingerprint: string;
          request_payload: Json;
          result_id?: string | null;
          result_type?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          idempotency_key?: string;
          operation?: string;
          organization_id?: string;
          request_fingerprint?: string;
          request_payload?: Json;
          result_id?: string | null;
          result_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "commercial_commands_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      commercial_events: {
        Row: {
          command_id: string;
          created_at: string;
          created_by_user_id: string | null;
          event_payload: Json;
          event_type: string;
          handoff_id: string | null;
          id: string;
          lead_id: string | null;
          new_status: string | null;
          occurred_at: string;
          opportunity_id: string | null;
          order_id: string | null;
          organization_id: string;
          pending_request_id: string | null;
          previous_status: string | null;
          reason: string;
          sale_id: string | null;
        };
        Insert: {
          command_id: string;
          created_at?: string;
          created_by_user_id?: string | null;
          event_payload?: Json;
          event_type: string;
          handoff_id?: string | null;
          id?: string;
          lead_id?: string | null;
          new_status?: string | null;
          occurred_at?: string;
          opportunity_id?: string | null;
          order_id?: string | null;
          organization_id: string;
          pending_request_id?: string | null;
          previous_status?: string | null;
          reason: string;
          sale_id?: string | null;
        };
        Update: {
          command_id?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          event_payload?: Json;
          event_type?: string;
          handoff_id?: string | null;
          id?: string;
          lead_id?: string | null;
          new_status?: string | null;
          occurred_at?: string;
          opportunity_id?: string | null;
          order_id?: string | null;
          organization_id?: string;
          pending_request_id?: string | null;
          previous_status?: string | null;
          reason?: string;
          sale_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "commercial_events_command_fk";
            columns: ["organization_id", "command_id"];
            isOneToOne: true;
            referencedRelation: "commercial_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "commercial_events_handoff_fk";
            columns: ["organization_id", "handoff_id"];
            isOneToOne: false;
            referencedRelation: "handoffs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "commercial_events_lead_fk";
            columns: ["organization_id", "lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "commercial_events_opportunity_fk";
            columns: ["organization_id", "opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "commercial_events_order_fk";
            columns: ["organization_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "commercial_events_pending_request_fk";
            columns: ["organization_id", "pending_request_id"];
            isOneToOne: false;
            referencedRelation: "pending_requests";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "commercial_events_sale_fk";
            columns: ["organization_id", "sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["organization_id", "id"];
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
      contact_methods: {
        Row: {
          consent_purpose: string;
          consent_source: string;
          consented_at: string;
          contact_id: string;
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          display_hint: string;
          encryption_key_ref: string;
          id: string;
          method_kind: string;
          organization_id: string;
          revoked_at: string | null;
          status: string;
          updated_at: string;
          value_ciphertext: string;
          value_fingerprint: string;
        };
        Insert: {
          consent_purpose: string;
          consent_source: string;
          consented_at: string;
          contact_id: string;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          display_hint: string;
          encryption_key_ref: string;
          id?: string;
          method_kind: string;
          organization_id: string;
          revoked_at?: string | null;
          status?: string;
          updated_at?: string;
          value_ciphertext: string;
          value_fingerprint: string;
        };
        Update: {
          consent_purpose?: string;
          consent_source?: string;
          consented_at?: string;
          contact_id?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          display_hint?: string;
          encryption_key_ref?: string;
          id?: string;
          method_kind?: string;
          organization_id?: string;
          revoked_at?: string | null;
          status?: string;
          updated_at?: string;
          value_ciphertext?: string;
          value_fingerprint?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_methods_contact_fk";
            columns: ["organization_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "contact_methods_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "commercial_commands";
            referencedColumns: ["organization_id", "id"];
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
      conversation_assignments: {
        Row: {
          agent_key: string | null;
          assignee_kind: string;
          channel_connection_id: string;
          conversation_id: string;
          created_at: string;
          ended_at: string | null;
          id: string;
          member_user_id: string | null;
          opportunity_id: string;
          organization_id: string;
          reason: string;
          started_at: string;
        };
        Insert: {
          agent_key?: string | null;
          assignee_kind: string;
          channel_connection_id: string;
          conversation_id: string;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          member_user_id?: string | null;
          opportunity_id: string;
          organization_id: string;
          reason: string;
          started_at?: string;
        };
        Update: {
          agent_key?: string | null;
          assignee_kind?: string;
          channel_connection_id?: string;
          conversation_id?: string;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          member_user_id?: string | null;
          opportunity_id?: string;
          organization_id?: string;
          reason?: string;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_assignments_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "conversation_assignments_member_fk";
            columns: ["organization_id", "member_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "conversation_assignments_opportunity_fk";
            columns: ["organization_id", "opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["organization_id", "id"];
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
      handoffs: {
        Row: {
          accepted_assignment_id: string | null;
          channel_connection_id: string;
          context_summary: Json;
          conversation_id: string;
          created_at: string;
          creation_command_id: string;
          decided_at: string | null;
          decided_by_user_id: string | null;
          from_assignment_id: string;
          id: string;
          opportunity_id: string;
          organization_id: string;
          reason: string;
          requested_at: string;
          requested_by_user_id: string | null;
          status: string;
          target_agent_key: string | null;
          target_kind: string;
          target_member_user_id: string | null;
          updated_at: string;
        };
        Insert: {
          accepted_assignment_id?: string | null;
          channel_connection_id: string;
          context_summary: Json;
          conversation_id: string;
          created_at?: string;
          creation_command_id: string;
          decided_at?: string | null;
          decided_by_user_id?: string | null;
          from_assignment_id: string;
          id?: string;
          opportunity_id: string;
          organization_id: string;
          reason: string;
          requested_at?: string;
          requested_by_user_id?: string | null;
          status?: string;
          target_agent_key?: string | null;
          target_kind: string;
          target_member_user_id?: string | null;
          updated_at?: string;
        };
        Update: {
          accepted_assignment_id?: string | null;
          channel_connection_id?: string;
          context_summary?: Json;
          conversation_id?: string;
          created_at?: string;
          creation_command_id?: string;
          decided_at?: string | null;
          decided_by_user_id?: string | null;
          from_assignment_id?: string;
          id?: string;
          opportunity_id?: string;
          organization_id?: string;
          reason?: string;
          requested_at?: string;
          requested_by_user_id?: string | null;
          status?: string;
          target_agent_key?: string | null;
          target_kind?: string;
          target_member_user_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "handoffs_accepted_assignment_fk";
            columns: ["organization_id", "accepted_assignment_id"];
            isOneToOne: false;
            referencedRelation: "conversation_assignments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "handoffs_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "handoffs_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "commercial_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "handoffs_decided_by_fk";
            columns: ["organization_id", "decided_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "handoffs_from_assignment_fk";
            columns: ["organization_id", "from_assignment_id"];
            isOneToOne: false;
            referencedRelation: "conversation_assignments";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "handoffs_opportunity_fk";
            columns: ["organization_id", "opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "handoffs_requested_by_fk";
            columns: ["organization_id", "requested_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "handoffs_target_member_fk";
            columns: ["organization_id", "target_member_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
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
      inventory_balances: {
        Row: {
          available_quantity: number | null;
          created_at: string;
          id: string;
          inventory_item_id: string;
          location_id: string;
          on_hand_quantity: number;
          organization_id: string;
          reserved_quantity: number;
          updated_at: string;
          version: number;
        };
        Insert: {
          available_quantity?: number | null;
          created_at?: string;
          id?: string;
          inventory_item_id: string;
          location_id: string;
          on_hand_quantity?: number;
          organization_id: string;
          reserved_quantity?: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          available_quantity?: number | null;
          created_at?: string;
          id?: string;
          inventory_item_id?: string;
          location_id?: string;
          on_hand_quantity?: number;
          organization_id?: string;
          reserved_quantity?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_balances_item_fk";
            columns: ["organization_id", "inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_balances_location_fk";
            columns: ["organization_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_commands: {
        Row: {
          command_code: string;
          created_at: string;
          id: string;
          idempotency_key: string;
          organization_id: string;
          request_fingerprint: string;
          request_payload: Json;
        };
        Insert: {
          command_code: string;
          created_at?: string;
          id?: string;
          idempotency_key: string;
          organization_id: string;
          request_fingerprint: string;
          request_payload: Json;
        };
        Update: {
          command_code?: string;
          created_at?: string;
          id?: string;
          idempotency_key?: string;
          organization_id?: string;
          request_fingerprint?: string;
          request_payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_commands_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_composition_components: {
        Row: {
          composition_id: string;
          created_at: string;
          created_by_user_id: string | null;
          id: string;
          inventory_item_id: string;
          organization_id: string;
          quantity_per_sale_unit: number;
        };
        Insert: {
          composition_id: string;
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          inventory_item_id: string;
          organization_id: string;
          quantity_per_sale_unit: number;
        };
        Update: {
          composition_id?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          inventory_item_id?: string;
          organization_id?: string;
          quantity_per_sale_unit?: number;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_composition_components_composition_fk";
            columns: ["organization_id", "composition_id"];
            isOneToOne: false;
            referencedRelation: "inventory_compositions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_composition_components_item_fk";
            columns: ["organization_id", "inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_compositions: {
        Row: {
          created_at: string;
          created_by_user_id: string | null;
          effective_at: string | null;
          evidence_id: string | null;
          id: string;
          offered_variant_id: string;
          organization_id: string;
          retired_at: string | null;
          sale_unit_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id?: string | null;
          effective_at?: string | null;
          evidence_id?: string | null;
          id?: string;
          offered_variant_id: string;
          organization_id: string;
          retired_at?: string | null;
          sale_unit_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string | null;
          effective_at?: string | null;
          evidence_id?: string | null;
          id?: string;
          offered_variant_id?: string;
          organization_id?: string;
          retired_at?: string | null;
          sale_unit_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_compositions_evidence_fk";
            columns: ["organization_id", "evidence_id"];
            isOneToOne: false;
            referencedRelation: "catalog_evidence";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_compositions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_compositions_sale_unit_fk";
            columns: ["organization_id", "sale_unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_compositions_variant_fk";
            columns: ["organization_id", "offered_variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_items: {
        Row: {
          created_at: string;
          created_by_user_id: string | null;
          id: string;
          inventory_unit_id: string;
          organization_id: string;
          retired_at: string | null;
          status: string;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          inventory_unit_id: string;
          organization_id: string;
          retired_at?: string | null;
          status?: string;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          inventory_unit_id?: string;
          organization_id?: string;
          retired_at?: string | null;
          status?: string;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_items_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_items_unit_fk";
            columns: ["organization_id", "inventory_unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_items_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: true;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_locations: {
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
            foreignKeyName: "inventory_locations_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          created_at: string;
          id: string;
          inventory_item_id: string;
          location_id: string;
          on_hand_quantity_after: number;
          operation_id: string;
          organization_id: string;
          quantity_delta: number;
          reserved_quantity_after: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          inventory_item_id: string;
          location_id: string;
          on_hand_quantity_after: number;
          operation_id: string;
          organization_id: string;
          quantity_delta: number;
          reserved_quantity_after: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          inventory_item_id?: string;
          location_id?: string;
          on_hand_quantity_after?: number;
          operation_id?: string;
          organization_id?: string;
          quantity_delta?: number;
          reserved_quantity_after?: number;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_fk";
            columns: ["organization_id", "inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_movements_location_fk";
            columns: ["organization_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_movements_operation_fk";
            columns: ["organization_id", "operation_id"];
            isOneToOne: false;
            referencedRelation: "inventory_operations";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_operations: {
        Row: {
          command_id: string;
          composition_id: string | null;
          created_at: string;
          created_by_user_id: string | null;
          id: string;
          occurred_at: string;
          operation_code: string;
          organization_id: string;
          reason: string;
          reference_id: string | null;
          reference_type: string | null;
          sale_quantity: number | null;
        };
        Insert: {
          command_id: string;
          composition_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          occurred_at?: string;
          operation_code: string;
          organization_id: string;
          reason: string;
          reference_id?: string | null;
          reference_type?: string | null;
          sale_quantity?: number | null;
        };
        Update: {
          command_id?: string;
          composition_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          occurred_at?: string;
          operation_code?: string;
          organization_id?: string;
          reason?: string;
          reference_id?: string | null;
          reference_type?: string | null;
          sale_quantity?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_operations_command_fk";
            columns: ["organization_id", "command_id"];
            isOneToOne: true;
            referencedRelation: "inventory_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_operations_composition_fk";
            columns: ["organization_id", "composition_id"];
            isOneToOne: false;
            referencedRelation: "inventory_compositions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_reservation_event_lines: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          quantity: number;
          reservation_event_id: string;
          reservation_line_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          quantity: number;
          reservation_event_id: string;
          reservation_line_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          quantity?: number;
          reservation_event_id?: string;
          reservation_line_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_reservation_event_lines_event_fk";
            columns: ["organization_id", "reservation_event_id"];
            isOneToOne: false;
            referencedRelation: "inventory_reservation_events";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_reservation_event_lines_reservation_line_fk";
            columns: ["organization_id", "reservation_line_id"];
            isOneToOne: false;
            referencedRelation: "inventory_reservation_lines";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_reservation_events: {
        Row: {
          action: string;
          command_id: string;
          created_at: string;
          created_by_user_id: string | null;
          id: string;
          occurred_at: string;
          operation_id: string | null;
          organization_id: string;
          reason: string;
          reservation_id: string;
        };
        Insert: {
          action: string;
          command_id: string;
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          occurred_at?: string;
          operation_id?: string | null;
          organization_id: string;
          reason: string;
          reservation_id: string;
        };
        Update: {
          action?: string;
          command_id?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          occurred_at?: string;
          operation_id?: string | null;
          organization_id?: string;
          reason?: string;
          reservation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_reservation_events_command_fk";
            columns: ["organization_id", "command_id"];
            isOneToOne: true;
            referencedRelation: "inventory_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_reservation_events_operation_fk";
            columns: ["organization_id", "operation_id"];
            isOneToOne: false;
            referencedRelation: "inventory_operations";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_reservation_events_reservation_fk";
            columns: ["organization_id", "reservation_id"];
            isOneToOne: false;
            referencedRelation: "inventory_reservations";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_reservation_lines: {
        Row: {
          consumed_quantity: number;
          created_at: string;
          id: string;
          inventory_item_id: string;
          location_id: string;
          organization_id: string;
          released_quantity: number;
          reservation_id: string;
          reserved_quantity: number;
          updated_at: string;
        };
        Insert: {
          consumed_quantity?: number;
          created_at?: string;
          id?: string;
          inventory_item_id: string;
          location_id: string;
          organization_id: string;
          released_quantity?: number;
          reservation_id: string;
          reserved_quantity: number;
          updated_at?: string;
        };
        Update: {
          consumed_quantity?: number;
          created_at?: string;
          id?: string;
          inventory_item_id?: string;
          location_id?: string;
          organization_id?: string;
          released_quantity?: number;
          reservation_id?: string;
          reserved_quantity?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_reservation_lines_item_fk";
            columns: ["organization_id", "inventory_item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_reservation_lines_location_fk";
            columns: ["organization_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "inventory_locations";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_reservation_lines_reservation_fk";
            columns: ["organization_id", "reservation_id"];
            isOneToOne: false;
            referencedRelation: "inventory_reservations";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      inventory_reservations: {
        Row: {
          closed_at: string | null;
          composition_id: string | null;
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          expires_at: string;
          id: string;
          organization_id: string;
          reason: string;
          reference_id: string | null;
          reference_type: string | null;
          reserved_at: string;
          sale_quantity: number | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          closed_at?: string | null;
          composition_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          expires_at: string;
          id?: string;
          organization_id: string;
          reason: string;
          reference_id?: string | null;
          reference_type?: string | null;
          reserved_at?: string;
          sale_quantity?: number | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          closed_at?: string | null;
          composition_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          expires_at?: string;
          id?: string;
          organization_id?: string;
          reason?: string;
          reference_id?: string | null;
          reference_type?: string | null;
          reserved_at?: string;
          sale_quantity?: number | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_composition_fk";
            columns: ["organization_id", "composition_id"];
            isOneToOne: false;
            referencedRelation: "inventory_compositions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "inventory_reservations_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "inventory_commands";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      lead_interests: {
        Row: {
          captured_context: Json;
          created_at: string;
          id: string;
          lead_id: string;
          organization_id: string;
          requested_quantity: number | null;
          status: string;
          summary: string;
          unit_id: string | null;
          updated_at: string;
          variant_id: string | null;
        };
        Insert: {
          captured_context?: Json;
          created_at?: string;
          id?: string;
          lead_id: string;
          organization_id: string;
          requested_quantity?: number | null;
          status?: string;
          summary: string;
          unit_id?: string | null;
          updated_at?: string;
          variant_id?: string | null;
        };
        Update: {
          captured_context?: Json;
          created_at?: string;
          id?: string;
          lead_id?: string;
          organization_id?: string;
          requested_quantity?: number | null;
          status?: string;
          summary?: string;
          unit_id?: string | null;
          updated_at?: string;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lead_interests_lead_fk";
            columns: ["organization_id", "lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "lead_interests_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "lead_interests_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      leads: {
        Row: {
          captured_at: string;
          channel_connection_id: string | null;
          closed_at: string | null;
          contact_id: string;
          conversation_id: string | null;
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          id: string;
          organization_id: string;
          source: string;
          status: string;
          summary: string;
          updated_at: string;
        };
        Insert: {
          captured_at?: string;
          channel_connection_id?: string | null;
          closed_at?: string | null;
          contact_id: string;
          conversation_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          id?: string;
          organization_id: string;
          source: string;
          status?: string;
          summary: string;
          updated_at?: string;
        };
        Update: {
          captured_at?: string;
          channel_connection_id?: string | null;
          closed_at?: string | null;
          contact_id?: string;
          conversation_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          id?: string;
          organization_id?: string;
          source?: string;
          status?: string;
          summary?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_contact_fk";
            columns: ["organization_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "leads_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "leads_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "commercial_commands";
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
      opportunities: {
        Row: {
          closed_at: string | null;
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          currency_code: string | null;
          estimated_amount: number | null;
          handling_mode: string;
          id: string;
          lead_id: string;
          opened_at: string;
          organization_id: string;
          stage_code: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          closed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          currency_code?: string | null;
          estimated_amount?: number | null;
          handling_mode: string;
          id?: string;
          lead_id: string;
          opened_at?: string;
          organization_id: string;
          stage_code: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          closed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          currency_code?: string | null;
          estimated_amount?: number | null;
          handling_mode?: string;
          id?: string;
          lead_id?: string;
          opened_at?: string;
          organization_id?: string;
          stage_code?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "opportunities_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "commercial_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "opportunities_lead_fk";
            columns: ["organization_id", "lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      order_lines: {
        Row: {
          calculation_method: string | null;
          created_at: string;
          currency_code: string;
          id: string;
          line_number: number;
          line_total_amount: number | null;
          offer_snapshot: Json;
          order_id: string;
          organization_id: string;
          price_amount: number | null;
          price_tier_id: string;
          pricing_status: string;
          product_name_snapshot: string;
          quantity: number;
          quoted_at: string;
          sku_snapshot: string;
          unit_code_snapshot: string;
          unit_id: string;
          variant_id: string;
          variant_name_snapshot: string;
        };
        Insert: {
          calculation_method?: string | null;
          created_at?: string;
          currency_code: string;
          id?: string;
          line_number: number;
          line_total_amount?: number | null;
          offer_snapshot: Json;
          order_id: string;
          organization_id: string;
          price_amount?: number | null;
          price_tier_id: string;
          pricing_status: string;
          product_name_snapshot: string;
          quantity: number;
          quoted_at: string;
          sku_snapshot: string;
          unit_code_snapshot: string;
          unit_id: string;
          variant_id: string;
          variant_name_snapshot: string;
        };
        Update: {
          calculation_method?: string | null;
          created_at?: string;
          currency_code?: string;
          id?: string;
          line_number?: number;
          line_total_amount?: number | null;
          offer_snapshot?: Json;
          order_id?: string;
          organization_id?: string;
          price_amount?: number | null;
          price_tier_id?: string;
          pricing_status?: string;
          product_name_snapshot?: string;
          quantity?: number;
          quoted_at?: string;
          sku_snapshot?: string;
          unit_code_snapshot?: string;
          unit_id?: string;
          variant_id?: string;
          variant_name_snapshot?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_lines_order_fk";
            columns: ["organization_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "order_lines_price_tier_fk";
            columns: ["organization_id", "price_tier_id"];
            isOneToOne: false;
            referencedRelation: "price_tiers";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "order_lines_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "order_lines_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      order_reservation_links: {
        Row: {
          created_at: string;
          id: string;
          linked_at: string;
          linked_by_user_id: string | null;
          order_id: string;
          organization_id: string;
          purpose: string;
          reservation_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          linked_at?: string;
          linked_by_user_id?: string | null;
          order_id: string;
          organization_id: string;
          purpose: string;
          reservation_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          linked_at?: string;
          linked_by_user_id?: string | null;
          order_id?: string;
          organization_id?: string;
          purpose?: string;
          reservation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_reservation_links_linked_by_fk";
            columns: ["organization_id", "linked_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "order_reservation_links_order_fk";
            columns: ["organization_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "order_reservation_links_reservation_fk";
            columns: ["organization_id", "reservation_id"];
            isOneToOne: true;
            referencedRelation: "inventory_reservations";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      orders: {
        Row: {
          channel_connection_id: string | null;
          closed_at: string | null;
          contact_id: string;
          contact_snapshot: Json;
          conversation_id: string | null;
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          currency_code: string | null;
          customer_note: string | null;
          handling_mode: string;
          id: string;
          notification_channel_connection_id: string | null;
          notification_outbox_event_id: string | null;
          notification_status: string;
          notified_at: string | null;
          opportunity_id: string | null;
          organization_id: string;
          origin: string;
          preferred_contact_method_id: string | null;
          status: string;
          submitted_at: string;
          subtotal_amount: number | null;
          total_amount: number | null;
          updated_at: string;
        };
        Insert: {
          channel_connection_id?: string | null;
          closed_at?: string | null;
          contact_id: string;
          contact_snapshot: Json;
          conversation_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          currency_code?: string | null;
          customer_note?: string | null;
          handling_mode: string;
          id?: string;
          notification_channel_connection_id?: string | null;
          notification_outbox_event_id?: string | null;
          notification_status?: string;
          notified_at?: string | null;
          opportunity_id?: string | null;
          organization_id: string;
          origin: string;
          preferred_contact_method_id?: string | null;
          status: string;
          submitted_at?: string;
          subtotal_amount?: number | null;
          total_amount?: number | null;
          updated_at?: string;
        };
        Update: {
          channel_connection_id?: string | null;
          closed_at?: string | null;
          contact_id?: string;
          contact_snapshot?: Json;
          conversation_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          currency_code?: string | null;
          customer_note?: string | null;
          handling_mode?: string;
          id?: string;
          notification_channel_connection_id?: string | null;
          notification_outbox_event_id?: string | null;
          notification_status?: string;
          notified_at?: string | null;
          opportunity_id?: string | null;
          organization_id?: string;
          origin?: string;
          preferred_contact_method_id?: string | null;
          status?: string;
          submitted_at?: string;
          subtotal_amount?: number | null;
          total_amount?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_contact_fk";
            columns: ["organization_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "orders_contact_method_fk";
            columns: ["organization_id", "preferred_contact_method_id"];
            isOneToOne: false;
            referencedRelation: "contact_methods";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "orders_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "orders_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "commercial_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "orders_notification_outbox_fk";
            columns: [
              "organization_id",
              "notification_channel_connection_id",
              "notification_outbox_event_id",
            ];
            isOneToOne: false;
            referencedRelation: "outbox_events";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "orders_opportunity_fk";
            columns: ["organization_id", "opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["organization_id", "id"];
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
      pending_requests: {
        Row: {
          channel_connection_id: string;
          collected_context: Json;
          contact_id: string;
          conversation_id: string;
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          due_at: string | null;
          id: string;
          organization_id: string;
          request_kind: string;
          requested_fields: Json;
          requested_quantity: number | null;
          resolution_kind: string | null;
          resolution_text: string | null;
          resolved_at: string | null;
          resolved_by_user_id: string | null;
          resolved_currency_code: string | null;
          resolved_price_amount: number | null;
          responded_at: string | null;
          response_delivery_status: string;
          response_outbox_event_id: string | null;
          source_message_id: string | null;
          status: string;
          unit_id: string | null;
          updated_at: string;
          variant_id: string | null;
        };
        Insert: {
          channel_connection_id: string;
          collected_context?: Json;
          contact_id: string;
          conversation_id: string;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          due_at?: string | null;
          id?: string;
          organization_id: string;
          request_kind: string;
          requested_fields: Json;
          requested_quantity?: number | null;
          resolution_kind?: string | null;
          resolution_text?: string | null;
          resolved_at?: string | null;
          resolved_by_user_id?: string | null;
          resolved_currency_code?: string | null;
          resolved_price_amount?: number | null;
          responded_at?: string | null;
          response_delivery_status?: string;
          response_outbox_event_id?: string | null;
          source_message_id?: string | null;
          status?: string;
          unit_id?: string | null;
          updated_at?: string;
          variant_id?: string | null;
        };
        Update: {
          channel_connection_id?: string;
          collected_context?: Json;
          contact_id?: string;
          conversation_id?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          due_at?: string | null;
          id?: string;
          organization_id?: string;
          request_kind?: string;
          requested_fields?: Json;
          requested_quantity?: number | null;
          resolution_kind?: string | null;
          resolution_text?: string | null;
          resolved_at?: string | null;
          resolved_by_user_id?: string | null;
          resolved_currency_code?: string | null;
          resolved_price_amount?: number | null;
          responded_at?: string | null;
          response_delivery_status?: string;
          response_outbox_event_id?: string | null;
          source_message_id?: string | null;
          status?: string;
          unit_id?: string | null;
          updated_at?: string;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pending_requests_contact_fk";
            columns: ["organization_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "pending_requests_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "pending_requests_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "commercial_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "pending_requests_outbox_fk";
            columns: ["organization_id", "channel_connection_id", "response_outbox_event_id"];
            isOneToOne: false;
            referencedRelation: "outbox_events";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "pending_requests_resolved_by_fk";
            columns: ["organization_id", "resolved_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "pending_requests_source_message_fk";
            columns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "source_message_id",
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
            foreignKeyName: "pending_requests_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "pending_requests_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
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
      publication_batches: {
        Row: {
          cancel_requested_at: string | null;
          completed_at: string | null;
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          id: string;
          organization_id: string;
          policy_snapshot: Json;
          requested_operation: string;
          schedule_generation: number | null;
          schedule_id: string | null;
          schedule_occurrence_at: string | null;
          selection_criteria_snapshot: Json;
          social_connection_id: string;
          status: string;
          trigger_kind: string;
          updated_at: string;
        };
        Insert: {
          cancel_requested_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          id?: string;
          organization_id: string;
          policy_snapshot?: Json;
          requested_operation: string;
          schedule_generation?: number | null;
          schedule_id?: string | null;
          schedule_occurrence_at?: string | null;
          selection_criteria_snapshot: Json;
          social_connection_id: string;
          status?: string;
          trigger_kind: string;
          updated_at?: string;
        };
        Update: {
          cancel_requested_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          id?: string;
          organization_id?: string;
          policy_snapshot?: Json;
          requested_operation?: string;
          schedule_generation?: number | null;
          schedule_id?: string | null;
          schedule_occurrence_at?: string | null;
          selection_criteria_snapshot?: Json;
          social_connection_id?: string;
          status?: string;
          trigger_kind?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "publication_batches_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_batches_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "publication_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_batches_schedule_fk";
            columns: ["organization_id", "schedule_id"];
            isOneToOne: false;
            referencedRelation: "publication_schedules";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      publication_commands: {
        Row: {
          completed_at: string | null;
          created_at: string;
          created_by_user_id: string | null;
          id: string;
          idempotency_key: string;
          operation: string;
          organization_id: string;
          request_fingerprint: string;
          request_payload: Json;
          result_id: string | null;
          result_type: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          idempotency_key: string;
          operation: string;
          organization_id: string;
          request_fingerprint: string;
          request_payload: Json;
          result_id?: string | null;
          result_type?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          id?: string;
          idempotency_key?: string;
          operation?: string;
          organization_id?: string;
          request_fingerprint?: string;
          request_payload?: Json;
          result_id?: string | null;
          result_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "publication_commands_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      publication_events: {
        Row: {
          batch_id: string | null;
          command_id: string | null;
          created_at: string;
          created_by_user_id: string | null;
          event_payload: Json;
          event_type: string;
          id: string;
          instance_id: string | null;
          job_id: string | null;
          new_status: string | null;
          occurred_at: string;
          organization_id: string;
          previous_status: string | null;
          publication_id: string | null;
          publication_version_id: string | null;
          reason: string | null;
          schedule_id: string | null;
          social_connection_id: string | null;
        };
        Insert: {
          batch_id?: string | null;
          command_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          event_payload?: Json;
          event_type: string;
          id?: string;
          instance_id?: string | null;
          job_id?: string | null;
          new_status?: string | null;
          occurred_at?: string;
          organization_id: string;
          previous_status?: string | null;
          publication_id?: string | null;
          publication_version_id?: string | null;
          reason?: string | null;
          schedule_id?: string | null;
          social_connection_id?: string | null;
        };
        Update: {
          batch_id?: string | null;
          command_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          event_payload?: Json;
          event_type?: string;
          id?: string;
          instance_id?: string | null;
          job_id?: string | null;
          new_status?: string | null;
          occurred_at?: string;
          organization_id?: string;
          previous_status?: string | null;
          publication_id?: string | null;
          publication_version_id?: string | null;
          reason?: string | null;
          schedule_id?: string | null;
          social_connection_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "publication_events_batch_fk";
            columns: ["organization_id", "batch_id"];
            isOneToOne: false;
            referencedRelation: "publication_batches";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_events_command_fk";
            columns: ["organization_id", "command_id"];
            isOneToOne: false;
            referencedRelation: "publication_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_events_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_events_instance_fk";
            columns: ["organization_id", "instance_id"];
            isOneToOne: false;
            referencedRelation: "publication_instances";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_events_job_fk";
            columns: ["organization_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "publication_jobs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_events_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publication_events_publication_fk";
            columns: ["organization_id", "publication_id"];
            isOneToOne: false;
            referencedRelation: "publications";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_events_schedule_fk";
            columns: ["organization_id", "schedule_id"];
            isOneToOne: false;
            referencedRelation: "publication_schedules";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_events_version_fk";
            columns: ["organization_id", "publication_version_id"];
            isOneToOne: false;
            referencedRelation: "publication_versions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      publication_instances: {
        Row: {
          created_at: string;
          creation_job_id: string;
          external_publication_id: string;
          external_url: string | null;
          id: string;
          last_reconciled_at: string | null;
          organization_id: string;
          provider_created_at: string | null;
          provider_updated_at: string | null;
          publication_id: string;
          publication_version_id: string;
          response_summary: Json;
          social_connection_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          creation_job_id: string;
          external_publication_id: string;
          external_url?: string | null;
          id?: string;
          last_reconciled_at?: string | null;
          organization_id: string;
          provider_created_at?: string | null;
          provider_updated_at?: string | null;
          publication_id: string;
          publication_version_id: string;
          response_summary?: Json;
          social_connection_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          creation_job_id?: string;
          external_publication_id?: string;
          external_url?: string | null;
          id?: string;
          last_reconciled_at?: string | null;
          organization_id?: string;
          provider_created_at?: string | null;
          provider_updated_at?: string | null;
          publication_id?: string;
          publication_version_id?: string;
          response_summary?: Json;
          social_connection_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "publication_instances_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_instances_creation_job_fk";
            columns: ["organization_id", "creation_job_id"];
            isOneToOne: true;
            referencedRelation: "publication_jobs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_instances_publication_fk";
            columns: ["organization_id", "publication_id"];
            isOneToOne: false;
            referencedRelation: "publications";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_instances_version_fk";
            columns: ["organization_id", "publication_id", "publication_version_id"];
            isOneToOne: false;
            referencedRelation: "publication_versions";
            referencedColumns: ["organization_id", "publication_id", "id"];
          },
        ];
      };
      publication_jobs: {
        Row: {
          attempt_count: number;
          authorization_snapshot: Json | null;
          authorized_at: string | null;
          available_at: string;
          batch_id: string | null;
          capability_code: string;
          completed_at: string | null;
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          effect_started_at: string | null;
          external_effect_key: string;
          id: string;
          idempotency_key: string;
          last_error_class: string | null;
          last_error_code: string | null;
          last_error_summary: Json | null;
          lease_expires_at: string | null;
          lease_token: string | null;
          max_attempts: number;
          operation: string;
          organization_id: string;
          priority: number;
          processing_started_at: string | null;
          provider_request_id: string | null;
          publication_id: string;
          request_fingerprint: string;
          schedule_id: string | null;
          status: string;
          target_instance_id: string | null;
          target_version_id: string | null;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          authorization_snapshot?: Json | null;
          authorized_at?: string | null;
          available_at?: string;
          batch_id?: string | null;
          capability_code: string;
          completed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          effect_started_at?: string | null;
          external_effect_key: string;
          id?: string;
          idempotency_key: string;
          last_error_class?: string | null;
          last_error_code?: string | null;
          last_error_summary?: Json | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          max_attempts?: number;
          operation: string;
          organization_id: string;
          priority?: number;
          processing_started_at?: string | null;
          provider_request_id?: string | null;
          publication_id: string;
          request_fingerprint: string;
          schedule_id?: string | null;
          status?: string;
          target_instance_id?: string | null;
          target_version_id?: string | null;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          authorization_snapshot?: Json | null;
          authorized_at?: string | null;
          available_at?: string;
          batch_id?: string | null;
          capability_code?: string;
          completed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          effect_started_at?: string | null;
          external_effect_key?: string;
          id?: string;
          idempotency_key?: string;
          last_error_class?: string | null;
          last_error_code?: string | null;
          last_error_summary?: Json | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          max_attempts?: number;
          operation?: string;
          organization_id?: string;
          priority?: number;
          processing_started_at?: string | null;
          provider_request_id?: string | null;
          publication_id?: string;
          request_fingerprint?: string;
          schedule_id?: string | null;
          status?: string;
          target_instance_id?: string | null;
          target_version_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "publication_jobs_batch_fk";
            columns: ["organization_id", "batch_id"];
            isOneToOne: false;
            referencedRelation: "publication_batches";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_jobs_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "publication_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_jobs_publication_fk";
            columns: ["organization_id", "publication_id"];
            isOneToOne: false;
            referencedRelation: "publications";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_jobs_schedule_fk";
            columns: ["organization_id", "schedule_id"];
            isOneToOne: false;
            referencedRelation: "publication_schedules";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_jobs_target_instance_fk";
            columns: ["organization_id", "target_instance_id"];
            isOneToOne: false;
            referencedRelation: "publication_instances";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_jobs_target_version_fk";
            columns: ["organization_id", "publication_id", "target_version_id"];
            isOneToOne: false;
            referencedRelation: "publication_versions";
            referencedColumns: ["organization_id", "publication_id", "id"];
          },
        ];
      };
      publication_media: {
        Row: {
          alt_text: string | null;
          created_at: string;
          id: string;
          media_asset_id: string;
          media_role: string;
          ordinal: number;
          organization_id: string;
          publication_version_id: string;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          media_asset_id: string;
          media_role?: string;
          ordinal: number;
          organization_id: string;
          publication_version_id: string;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          media_asset_id?: string;
          media_role?: string;
          ordinal?: number;
          organization_id?: string;
          publication_version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "publication_media_asset_fk";
            columns: ["organization_id", "media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_media_version_fk";
            columns: ["organization_id", "publication_version_id"];
            isOneToOne: false;
            referencedRelation: "publication_versions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      publication_schedules: {
        Row: {
          code: string;
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          expression_kind: string;
          generation: number;
          id: string;
          last_enqueued_at: string | null;
          name: string;
          next_run_at: string | null;
          organization_id: string;
          requested_operation: string;
          retired_at: string | null;
          schedule_expression: string;
          schedule_policy: Json;
          selection_criteria: Json;
          social_connection_id: string;
          status: string;
          timezone_name: string;
          updated_at: string;
          validation_status: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          expression_kind?: string;
          generation?: number;
          id?: string;
          last_enqueued_at?: string | null;
          name: string;
          next_run_at?: string | null;
          organization_id: string;
          requested_operation: string;
          retired_at?: string | null;
          schedule_expression: string;
          schedule_policy?: Json;
          selection_criteria?: Json;
          social_connection_id: string;
          status?: string;
          timezone_name: string;
          updated_at?: string;
          validation_status?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          expression_kind?: string;
          generation?: number;
          id?: string;
          last_enqueued_at?: string | null;
          name?: string;
          next_run_at?: string | null;
          organization_id?: string;
          requested_operation?: string;
          retired_at?: string | null;
          schedule_expression?: string;
          schedule_policy?: Json;
          selection_criteria?: Json;
          social_connection_id?: string;
          status?: string;
          timezone_name?: string;
          updated_at?: string;
          validation_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "publication_schedules_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_schedules_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "publication_commands";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      publication_versions: {
        Row: {
          approved_at: string | null;
          approved_by_user_id: string | null;
          availability_snapshot: Json;
          body: string;
          calculation_method: string | null;
          call_to_action: string | null;
          content_payload: Json;
          content_sha256: string;
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          currency_code: string | null;
          headline: string | null;
          id: string;
          organization_id: string;
          price_amount: number | null;
          pricing_status: string;
          publication_id: string;
          source_price_tier_id: string | null;
          source_price_valid_from: string | null;
          source_variant_updated_at: string;
          status: string;
          version_number: number;
        };
        Insert: {
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          availability_snapshot?: Json;
          body: string;
          calculation_method?: string | null;
          call_to_action?: string | null;
          content_payload?: Json;
          content_sha256: string;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          currency_code?: string | null;
          headline?: string | null;
          id?: string;
          organization_id: string;
          price_amount?: number | null;
          pricing_status: string;
          publication_id: string;
          source_price_tier_id?: string | null;
          source_price_valid_from?: string | null;
          source_variant_updated_at: string;
          status?: string;
          version_number: number;
        };
        Update: {
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          availability_snapshot?: Json;
          body?: string;
          calculation_method?: string | null;
          call_to_action?: string | null;
          content_payload?: Json;
          content_sha256?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          currency_code?: string | null;
          headline?: string | null;
          id?: string;
          organization_id?: string;
          price_amount?: number | null;
          pricing_status?: string;
          publication_id?: string;
          source_price_tier_id?: string | null;
          source_price_valid_from?: string | null;
          source_variant_updated_at?: string;
          status?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "publication_versions_approved_by_fk";
            columns: ["organization_id", "approved_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "publication_versions_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "publication_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_versions_price_tier_fk";
            columns: ["organization_id", "source_price_tier_id"];
            isOneToOne: false;
            referencedRelation: "price_tiers";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_versions_publication_fk";
            columns: ["organization_id", "publication_id"];
            isOneToOne: false;
            referencedRelation: "publications";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      publications: {
        Row: {
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          current_version_id: string | null;
          id: string;
          organization_id: string;
          retired_at: string | null;
          social_connection_id: string;
          status: string;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          current_version_id?: string | null;
          id?: string;
          organization_id: string;
          retired_at?: string | null;
          social_connection_id: string;
          status?: string;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          current_version_id?: string | null;
          id?: string;
          organization_id?: string;
          retired_at?: string | null;
          social_connection_id?: string;
          status?: string;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "publications_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publications_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "publication_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publications_current_version_fk";
            columns: ["organization_id", "id", "current_version_id"];
            isOneToOne: false;
            referencedRelation: "publication_versions";
            referencedColumns: ["organization_id", "publication_id", "id"];
          },
          {
            foreignKeyName: "publications_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      sale_lines: {
        Row: {
          created_at: string;
          id: string;
          inventory_effect_status: string;
          inventory_operation_id: string | null;
          line_number: number;
          line_total_amount: number;
          order_line_id: string | null;
          organization_id: string;
          product_name_snapshot: string;
          quantity: number;
          reverses_sale_line_id: string | null;
          sale_id: string;
          sku_snapshot: string;
          unit_amount: number;
          unit_code_snapshot: string;
          unit_id: string;
          variant_id: string;
          variant_name_snapshot: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          inventory_effect_status: string;
          inventory_operation_id?: string | null;
          line_number: number;
          line_total_amount: number;
          order_line_id?: string | null;
          organization_id: string;
          product_name_snapshot: string;
          quantity: number;
          reverses_sale_line_id?: string | null;
          sale_id: string;
          sku_snapshot: string;
          unit_amount: number;
          unit_code_snapshot: string;
          unit_id: string;
          variant_id: string;
          variant_name_snapshot: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          inventory_effect_status?: string;
          inventory_operation_id?: string | null;
          line_number?: number;
          line_total_amount?: number;
          order_line_id?: string | null;
          organization_id?: string;
          product_name_snapshot?: string;
          quantity?: number;
          reverses_sale_line_id?: string | null;
          sale_id?: string;
          sku_snapshot?: string;
          unit_amount?: number;
          unit_code_snapshot?: string;
          unit_id?: string;
          variant_id?: string;
          variant_name_snapshot?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sale_lines_inventory_operation_fk";
            columns: ["organization_id", "inventory_operation_id"];
            isOneToOne: false;
            referencedRelation: "inventory_operations";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sale_lines_order_line_fk";
            columns: ["organization_id", "order_line_id"];
            isOneToOne: false;
            referencedRelation: "order_lines";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sale_lines_reverses_sale_line_fk";
            columns: ["organization_id", "reverses_sale_line_id"];
            isOneToOne: false;
            referencedRelation: "sale_lines";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sale_lines_sale_fk";
            columns: ["organization_id", "sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sale_lines_unit_fk";
            columns: ["organization_id", "unit_id"];
            isOneToOne: false;
            referencedRelation: "catalog_units";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sale_lines_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      sales: {
        Row: {
          contact_id: string | null;
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          currency_code: string;
          id: string;
          note: string | null;
          occurred_at: string;
          opportunity_id: string | null;
          order_id: string | null;
          organization_id: string;
          reverses_sale_id: string | null;
          sale_kind: string;
          source: string;
          subtotal_amount: number;
          total_amount: number;
        };
        Insert: {
          contact_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          currency_code: string;
          id?: string;
          note?: string | null;
          occurred_at?: string;
          opportunity_id?: string | null;
          order_id?: string | null;
          organization_id: string;
          reverses_sale_id?: string | null;
          sale_kind: string;
          source: string;
          subtotal_amount: number;
          total_amount: number;
        };
        Update: {
          contact_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          currency_code?: string;
          id?: string;
          note?: string | null;
          occurred_at?: string;
          opportunity_id?: string | null;
          order_id?: string | null;
          organization_id?: string;
          reverses_sale_id?: string | null;
          sale_kind?: string;
          source?: string;
          subtotal_amount?: number;
          total_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sales_contact_fk";
            columns: ["organization_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sales_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "commercial_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sales_opportunity_fk";
            columns: ["organization_id", "opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sales_order_fk";
            columns: ["organization_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "sales_reverses_fk";
            columns: ["organization_id", "reverses_sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      social_capabilities: {
        Row: {
          capability_code: string;
          capability_constraints: Json;
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          evidence_summary: Json;
          id: string;
          observation_source: string;
          observed_at: string;
          organization_id: string;
          social_connection_id: string;
          status: string;
          valid_until: string | null;
        };
        Insert: {
          capability_code: string;
          capability_constraints?: Json;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          evidence_summary?: Json;
          id?: string;
          observation_source: string;
          observed_at: string;
          organization_id: string;
          social_connection_id: string;
          status: string;
          valid_until?: string | null;
        };
        Update: {
          capability_code?: string;
          capability_constraints?: Json;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          evidence_summary?: Json;
          id?: string;
          observation_source?: string;
          observed_at?: string;
          organization_id?: string;
          social_connection_id?: string;
          status?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "social_capabilities_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "social_capabilities_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "publication_commands";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      social_connections: {
        Row: {
          api_version: string | null;
          connected_at: string | null;
          created_at: string;
          created_by_user_id: string | null;
          creation_command_id: string;
          credential_reference: string | null;
          disabled_at: string | null;
          display_name: string | null;
          external_account_id: string | null;
          external_app_id: string | null;
          id: string;
          last_verified_at: string | null;
          messenger_channel_connection_id: string | null;
          organization_id: string;
          provider: string;
          status: string;
          surface: string;
          updated_at: string;
        };
        Insert: {
          api_version?: string | null;
          connected_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id: string;
          credential_reference?: string | null;
          disabled_at?: string | null;
          display_name?: string | null;
          external_account_id?: string | null;
          external_app_id?: string | null;
          id?: string;
          last_verified_at?: string | null;
          messenger_channel_connection_id?: string | null;
          organization_id: string;
          provider?: string;
          status?: string;
          surface?: string;
          updated_at?: string;
        };
        Update: {
          api_version?: string | null;
          connected_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          creation_command_id?: string;
          credential_reference?: string | null;
          disabled_at?: string | null;
          display_name?: string | null;
          external_account_id?: string | null;
          external_app_id?: string | null;
          id?: string;
          last_verified_at?: string | null;
          messenger_channel_connection_id?: string | null;
          organization_id?: string;
          provider?: string;
          status?: string;
          surface?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_connections_creation_command_fk";
            columns: ["organization_id", "creation_command_id"];
            isOneToOne: true;
            referencedRelation: "publication_commands";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "social_connections_messenger_connection_fk";
            columns: ["organization_id", "messenger_channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "social_connections_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
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
      assert_commercial_actor: {
        Args: {
          allowed_roles?: string[];
          target_organization_id: string;
          target_user_id: string;
        };
        Returns: undefined;
      };
      assert_inventory_actor: {
        Args: { target_organization_id: string; target_user_id: string };
        Returns: undefined;
      };
      assert_product_catalog_ready: {
        Args: { target_organization_id: string; target_product_id: string };
        Returns: undefined;
      };
      assert_publication_actor: {
        Args: {
          allowed_roles?: string[];
          target_organization_id: string;
          target_user_id: string;
        };
        Returns: undefined;
      };
      assert_sale_inventory_operation: {
        Args: {
          target_inventory_operation_id: string;
          target_organization_id: string;
          target_quantity: number;
          target_sale_kind: string;
          target_unit_id: string;
          target_variant_id: string;
        };
        Returns: undefined;
      };
      assert_variant_catalog_ready: {
        Args: { target_organization_id: string; target_variant_id: string };
        Returns: undefined;
      };
      claim_commercial_command: {
        Args: {
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_operation: string;
          target_organization_id: string;
          target_request_payload: Json;
        };
        Returns: {
          claimed_command_id: string;
          was_replayed: boolean;
        }[];
      };
      claim_inventory_command: {
        Args: {
          target_command_code: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_request_payload: Json;
        };
        Returns: {
          claimed_command_id: string;
          was_replayed: boolean;
        }[];
      };
      claim_publication_command: {
        Args: {
          target_allowed_roles?: string[];
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_operation: string;
          target_organization_id: string;
          target_request_payload: Json;
        };
        Returns: {
          claimed_command_id: string;
          was_replayed: boolean;
        }[];
      };
      complete_commercial_command: {
        Args: {
          target_command_id: string;
          target_organization_id: string;
          target_result_id: string;
          target_result_type: string;
        };
        Returns: undefined;
      };
      complete_publication_command: {
        Args: {
          target_command_id: string;
          target_organization_id: string;
          target_result_id: string;
          target_result_type: string;
        };
        Returns: undefined;
      };
      create_inventory_reservation_core: {
        Args: {
          target_command_id: string;
          target_composition_id: string;
          target_created_by_user_id: string;
          target_expires_at: string;
          target_lines: Json;
          target_organization_id: string;
          target_reason: string;
          target_reference_id: string;
          target_reference_type: string;
          target_sale_quantity: number;
        };
        Returns: string;
      };
      insert_commercial_event: {
        Args: {
          target_command_id: string;
          target_created_by_user_id: string;
          target_event_payload: Json;
          target_event_type: string;
          target_new_status: string;
          target_occurred_at?: string;
          target_organization_id: string;
          target_previous_status: string;
          target_reason: string;
          target_subject_id: string;
          target_subject_type: string;
        };
        Returns: string;
      };
      insert_publication_event: {
        Args: {
          target_command_id: string;
          target_created_by_user_id: string;
          target_event_payload: Json;
          target_event_type: string;
          target_new_status: string;
          target_occurred_at?: string;
          target_organization_id: string;
          target_previous_status: string;
          target_reason: string;
          target_subject_id: string;
          target_subject_type: string;
        };
        Returns: string;
      };
      post_inventory_movement: {
        Args: {
          target_command_id: string;
          target_composition_id: string;
          target_created_by_user_id: string;
          target_lines: Json;
          target_occurred_at: string;
          target_operation_code: string;
          target_organization_id: string;
          target_reason: string;
          target_reference_id: string;
          target_reference_type: string;
          target_sale_quantity: number;
        };
        Returns: string;
      };
      publication_availability_snapshot: {
        Args: {
          target_captured_at?: string;
          target_organization_id: string;
          target_variant_id: string;
        };
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
