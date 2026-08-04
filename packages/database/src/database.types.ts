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
    };
    Functions: {
      [_ in never]: never;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
