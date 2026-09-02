export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  api: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      agent_commands: {
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
            foreignKeyName: "agent_commands_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "agent_commands_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_jobs: {
        Row: {
          attempt_count: number | null;
          available_at: string | null;
          checkpoint_sequence: number | null;
          completed_at: string | null;
          created_at: string | null;
          external_effect_state: string | null;
          id: string | null;
          job_kind: string | null;
          last_error_code: string | null;
          lease_expires_at: string | null;
          max_attempts: number | null;
          organization_id: string | null;
          priority: number | null;
          run_id: string | null;
          started_at: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          attempt_count?: number | null;
          available_at?: string | null;
          checkpoint_sequence?: number | null;
          completed_at?: string | null;
          created_at?: string | null;
          external_effect_state?: string | null;
          id?: string | null;
          job_kind?: string | null;
          last_error_code?: string | null;
          lease_expires_at?: string | null;
          max_attempts?: number | null;
          organization_id?: string | null;
          priority?: number | null;
          run_id?: string | null;
          started_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          attempt_count?: number | null;
          available_at?: string | null;
          checkpoint_sequence?: number | null;
          completed_at?: string | null;
          created_at?: string | null;
          external_effect_state?: string | null;
          id?: string | null;
          job_kind?: string | null;
          last_error_code?: string | null;
          lease_expires_at?: string | null;
          max_attempts?: number | null;
          organization_id?: string | null;
          priority?: number | null;
          run_id?: string | null;
          started_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_jobs_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_jobs_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: true;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      agent_messages: {
        Row: {
          channel_connection_id: string | null;
          content_hash: string | null;
          conversation_id: string | null;
          created_at: string | null;
          domain_message_id: string | null;
          id: string | null;
          message_key: string | null;
          message_kind: string | null;
          message_role: string | null;
          organization_id: string | null;
          provider_item_id: string | null;
          run_id: string | null;
          sequence_number: number | null;
          trust_level: string | null;
        };
        Insert: {
          channel_connection_id?: string | null;
          content_hash?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          domain_message_id?: string | null;
          id?: string | null;
          message_key?: string | null;
          message_kind?: string | null;
          message_role?: string | null;
          organization_id?: string | null;
          provider_item_id?: string | null;
          run_id?: string | null;
          sequence_number?: number | null;
          trust_level?: string | null;
        };
        Update: {
          channel_connection_id?: string | null;
          content_hash?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          domain_message_id?: string | null;
          id?: string | null;
          message_key?: string | null;
          message_kind?: string | null;
          message_role?: string | null;
          organization_id?: string | null;
          provider_item_id?: string | null;
          run_id?: string | null;
          sequence_number?: number | null;
          trust_level?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_messages_domain_message_fk";
            columns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "domain_message_id",
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
            foreignKeyName: "agent_messages_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_messages_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      agent_policies: {
        Row: {
          created_at: string | null;
          created_by_user_id: string | null;
          current_version_id: string | null;
          display_name: string | null;
          id: string | null;
          organization_id: string | null;
          policy_key: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by_user_id?: string | null;
          current_version_id?: string | null;
          display_name?: string | null;
          id?: string | null;
          organization_id?: string | null;
          policy_key?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by_user_id?: string | null;
          current_version_id?: string | null;
          display_name?: string | null;
          id?: string | null;
          organization_id?: string | null;
          policy_key?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_policies_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "agent_policies_current_version_fk";
            columns: ["organization_id", "id", "current_version_id"];
            isOneToOne: false;
            referencedRelation: "agent_policy_versions";
            referencedColumns: ["organization_id", "policy_id", "id"];
          },
          {
            foreignKeyName: "agent_policies_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_policy_tools: {
        Row: {
          allowed_actor_kinds: string[] | null;
          allowed_channels: string[] | null;
          authorization_constraints: Json | null;
          created_at: string | null;
          id: string | null;
          organization_id: string | null;
          policy_version_id: string | null;
          required_membership_roles: string[] | null;
          tool_contract_id: string | null;
          tool_contract_version_id: string | null;
        };
        Insert: {
          allowed_actor_kinds?: string[] | null;
          allowed_channels?: string[] | null;
          authorization_constraints?: Json | null;
          created_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          policy_version_id?: string | null;
          required_membership_roles?: string[] | null;
          tool_contract_id?: string | null;
          tool_contract_version_id?: string | null;
        };
        Update: {
          allowed_actor_kinds?: string[] | null;
          allowed_channels?: string[] | null;
          authorization_constraints?: Json | null;
          created_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          policy_version_id?: string | null;
          required_membership_roles?: string[] | null;
          tool_contract_id?: string | null;
          tool_contract_version_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_policy_tools_contract_version_fk";
            columns: ["organization_id", "tool_contract_id", "tool_contract_version_id"];
            isOneToOne: false;
            referencedRelation: "tool_contract_versions";
            referencedColumns: ["organization_id", "tool_contract_id", "id"];
          },
          {
            foreignKeyName: "agent_policy_tools_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_policy_tools_policy_version_fk";
            columns: ["organization_id", "policy_version_id"];
            isOneToOne: false;
            referencedRelation: "agent_policy_versions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      agent_policy_versions: {
        Row: {
          cache_mode: string | null;
          cost_currency: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          fallback_models: Json | null;
          id: string | null;
          max_cost_amount: number | null;
          max_parallel_tools: number | null;
          max_provider_attempts: number | null;
          max_tool_rounds: number | null;
          organization_id: string | null;
          policy_hash: string | null;
          policy_id: string | null;
          prompt_version_id: string | null;
          turn_timeout_ms: number | null;
          unknown_cost_behavior: string | null;
          version_number: number | null;
        };
        Insert: {
          cache_mode?: string | null;
          cost_currency?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          fallback_models?: Json | null;
          id?: string | null;
          max_cost_amount?: number | null;
          max_parallel_tools?: number | null;
          max_provider_attempts?: number | null;
          max_tool_rounds?: number | null;
          organization_id?: string | null;
          policy_hash?: string | null;
          policy_id?: string | null;
          prompt_version_id?: string | null;
          turn_timeout_ms?: number | null;
          unknown_cost_behavior?: string | null;
          version_number?: number | null;
        };
        Update: {
          cache_mode?: string | null;
          cost_currency?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          fallback_models?: Json | null;
          id?: string | null;
          max_cost_amount?: number | null;
          max_parallel_tools?: number | null;
          max_provider_attempts?: number | null;
          max_tool_rounds?: number | null;
          organization_id?: string | null;
          policy_hash?: string | null;
          policy_id?: string | null;
          prompt_version_id?: string | null;
          turn_timeout_ms?: number | null;
          unknown_cost_behavior?: string | null;
          version_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_policy_versions_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "agent_policy_versions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_policy_versions_policy_fk";
            columns: ["organization_id", "policy_id"];
            isOneToOne: false;
            referencedRelation: "agent_policies";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "agent_policy_versions_prompt_fk";
            columns: ["organization_id", "prompt_version_id"];
            isOneToOne: false;
            referencedRelation: "prompt_versions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      agent_run_configurations: {
        Row: {
          configuration_id: string | null;
          configuration_version_id: string | null;
          created_at: string | null;
          id: string | null;
          organization_id: string | null;
          run_id: string | null;
        };
        Insert: {
          configuration_id?: string | null;
          configuration_version_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          run_id?: string | null;
        };
        Update: {
          configuration_id?: string | null;
          configuration_version_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          run_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_run_configurations_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_run_configurations_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "agent_run_configurations_version_fk";
            columns: ["organization_id", "configuration_id", "configuration_version_id"];
            isOneToOne: false;
            referencedRelation: "business_configuration_versions";
            referencedColumns: ["organization_id", "configuration_id", "id"];
          },
        ];
      };
      agent_runs: {
        Row: {
          actor_channel_identity_id: string | null;
          actor_kind: string | null;
          actor_user_id: string | null;
          budget_status: string | null;
          cache_mode: string | null;
          channel_connection_id: string | null;
          completed_at: string | null;
          continuation_sequence: number | null;
          conversation_id: string | null;
          conversation_snapshot_id: string | null;
          correlation_id: string | null;
          cost_currency: string | null;
          created_at: string | null;
          fallback_models: Json | null;
          id: string | null;
          last_termination_reason: string | null;
          max_cost_amount: number | null;
          max_parallel_tools: number | null;
          max_provider_attempts: number | null;
          max_tool_rounds: number | null;
          model: string | null;
          organization_id: string | null;
          policy_version_id: string | null;
          provider: string | null;
          provider_attempt_count: number | null;
          reasoning_effort: string | null;
          run_key: string | null;
          run_kind: string | null;
          source_inbound_event_id: string | null;
          started_at: string | null;
          status: string | null;
          tool_round_count: number | null;
          trace_id: string | null;
          trigger_message_id: string | null;
          turn_timeout_ms: number | null;
          unknown_cost_behavior: string | null;
          updated_at: string | null;
          vision_model: string | null;
          vision_provider: string | null;
        };
        Insert: {
          actor_channel_identity_id?: string | null;
          actor_kind?: string | null;
          actor_user_id?: string | null;
          budget_status?: string | null;
          cache_mode?: string | null;
          channel_connection_id?: string | null;
          completed_at?: string | null;
          continuation_sequence?: number | null;
          conversation_id?: string | null;
          conversation_snapshot_id?: string | null;
          correlation_id?: string | null;
          cost_currency?: string | null;
          created_at?: string | null;
          fallback_models?: Json | null;
          id?: string | null;
          last_termination_reason?: string | null;
          max_cost_amount?: number | null;
          max_parallel_tools?: number | null;
          max_provider_attempts?: number | null;
          max_tool_rounds?: number | null;
          model?: string | null;
          organization_id?: string | null;
          policy_version_id?: string | null;
          provider?: string | null;
          provider_attempt_count?: number | null;
          reasoning_effort?: string | null;
          run_key?: string | null;
          run_kind?: string | null;
          source_inbound_event_id?: string | null;
          started_at?: string | null;
          status?: string | null;
          tool_round_count?: number | null;
          trace_id?: string | null;
          trigger_message_id?: string | null;
          turn_timeout_ms?: number | null;
          unknown_cost_behavior?: string | null;
          updated_at?: string | null;
          vision_model?: string | null;
          vision_provider?: string | null;
        };
        Update: {
          actor_channel_identity_id?: string | null;
          actor_kind?: string | null;
          actor_user_id?: string | null;
          budget_status?: string | null;
          cache_mode?: string | null;
          channel_connection_id?: string | null;
          completed_at?: string | null;
          continuation_sequence?: number | null;
          conversation_id?: string | null;
          conversation_snapshot_id?: string | null;
          correlation_id?: string | null;
          cost_currency?: string | null;
          created_at?: string | null;
          fallback_models?: Json | null;
          id?: string | null;
          last_termination_reason?: string | null;
          max_cost_amount?: number | null;
          max_parallel_tools?: number | null;
          max_provider_attempts?: number | null;
          max_tool_rounds?: number | null;
          model?: string | null;
          organization_id?: string | null;
          policy_version_id?: string | null;
          provider?: string | null;
          provider_attempt_count?: number | null;
          reasoning_effort?: string | null;
          run_key?: string | null;
          run_kind?: string | null;
          source_inbound_event_id?: string | null;
          started_at?: string | null;
          status?: string | null;
          tool_round_count?: number | null;
          trace_id?: string | null;
          trigger_message_id?: string | null;
          turn_timeout_ms?: number | null;
          unknown_cost_behavior?: string | null;
          updated_at?: string | null;
          vision_model?: string | null;
          vision_provider?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_runs_actor_channel_identity_fk";
            columns: ["organization_id", "channel_connection_id", "actor_channel_identity_id"];
            isOneToOne: false;
            referencedRelation: "channel_identities";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "agent_runs_actor_user_fk";
            columns: ["organization_id", "actor_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "agent_runs_channel_connection_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "agent_runs_channel_connection_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "meta_whatsapp_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "agent_runs_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "agent_runs_conversation_snapshot_fk";
            columns: ["organization_id", "conversation_snapshot_id"];
            isOneToOne: false;
            referencedRelation: "conversation_agent_snapshots";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "agent_runs_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_runs_policy_fk";
            columns: ["organization_id", "policy_version_id"];
            isOneToOne: false;
            referencedRelation: "agent_policy_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "agent_runs_trigger_message_fk";
            columns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "trigger_message_id",
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
        ];
      };
      audit_events: {
        Row: {
          actor_kind: string | null;
          actor_user_id: string | null;
          configuration_id: string | null;
          configuration_version_id: string | null;
          correlation_id: string | null;
          event_type: string | null;
          id: string | null;
          job_attempt_id: string | null;
          job_id: string | null;
          metadata_safe: Json | null;
          occurred_at: string | null;
          organization_id: string | null;
          outbox_channel_connection_id: string | null;
          outbox_event_id: string | null;
          run_id: string | null;
          tool_execution_id: string | null;
          trace_id: string | null;
        };
        Insert: {
          actor_kind?: string | null;
          actor_user_id?: string | null;
          configuration_id?: string | null;
          configuration_version_id?: string | null;
          correlation_id?: string | null;
          event_type?: string | null;
          id?: string | null;
          job_attempt_id?: string | null;
          job_id?: string | null;
          metadata_safe?: Json | null;
          occurred_at?: string | null;
          organization_id?: string | null;
          outbox_channel_connection_id?: string | null;
          outbox_event_id?: string | null;
          run_id?: string | null;
          tool_execution_id?: string | null;
          trace_id?: string | null;
        };
        Update: {
          actor_kind?: string | null;
          actor_user_id?: string | null;
          configuration_id?: string | null;
          configuration_version_id?: string | null;
          correlation_id?: string | null;
          event_type?: string | null;
          id?: string | null;
          job_attempt_id?: string | null;
          job_id?: string | null;
          metadata_safe?: Json | null;
          occurred_at?: string | null;
          organization_id?: string | null;
          outbox_channel_connection_id?: string | null;
          outbox_event_id?: string | null;
          run_id?: string | null;
          tool_execution_id?: string | null;
          trace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_user_fk";
            columns: ["organization_id", "actor_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "audit_events_attempt_fk";
            columns: ["organization_id", "job_attempt_id"];
            isOneToOne: false;
            referencedRelation: "job_attempts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "audit_events_configuration_fk";
            columns: ["organization_id", "configuration_id", "configuration_version_id"];
            isOneToOne: false;
            referencedRelation: "business_configuration_versions";
            referencedColumns: ["organization_id", "configuration_id", "id"];
          },
          {
            foreignKeyName: "audit_events_job_fk";
            columns: ["organization_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "agent_jobs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "audit_events_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_events_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "audit_events_tool_fk";
            columns: ["organization_id", "tool_execution_id"];
            isOneToOne: false;
            referencedRelation: "tool_executions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      business_configuration_versions: {
        Row: {
          configuration_id: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          document_hash: string | null;
          id: string | null;
          organization_id: string | null;
          schema_key: string | null;
          schema_version: number | null;
          source_version_id: string | null;
          validation_contract: string | null;
          version_number: number | null;
        };
        Insert: {
          configuration_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          document_hash?: string | null;
          id?: string | null;
          organization_id?: string | null;
          schema_key?: string | null;
          schema_version?: number | null;
          source_version_id?: string | null;
          validation_contract?: string | null;
          version_number?: number | null;
        };
        Update: {
          configuration_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          document_hash?: string | null;
          id?: string | null;
          organization_id?: string | null;
          schema_key?: string | null;
          schema_version?: number | null;
          source_version_id?: string | null;
          validation_contract?: string | null;
          version_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_configuration_versions_configuration_fk";
            columns: ["organization_id", "configuration_id"];
            isOneToOne: false;
            referencedRelation: "business_configurations";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "business_configuration_versions_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "business_configuration_versions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_configuration_versions_source_fk";
            columns: ["organization_id", "configuration_id", "source_version_id"];
            isOneToOne: false;
            referencedRelation: "business_configuration_versions";
            referencedColumns: ["organization_id", "configuration_id", "id"];
          },
        ];
      };
      business_configurations: {
        Row: {
          configuration_key: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          current_version_id: string | null;
          display_name: string | null;
          id: string | null;
          organization_id: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          configuration_key?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          current_version_id?: string | null;
          display_name?: string | null;
          id?: string | null;
          organization_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          configuration_key?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          current_version_id?: string | null;
          display_name?: string | null;
          id?: string | null;
          organization_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_configurations_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "business_configurations_current_version_fk";
            columns: ["organization_id", "id", "current_version_id"];
            isOneToOne: false;
            referencedRelation: "business_configuration_versions";
            referencedColumns: ["organization_id", "configuration_id", "id"];
          },
          {
            foreignKeyName: "business_configurations_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
          meta_application_id: string | null;
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
          meta_application_id?: string | null;
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
          meta_application_id?: string | null;
          organization_id?: string | null;
          provider?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "channel_connections_meta_application_fk";
            columns: ["organization_id", "meta_application_id", "external_app_id"];
            isOneToOne: false;
            referencedRelation: "meta_applications";
            referencedColumns: ["organization_id", "id", "external_app_id"];
          },
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
            foreignKeyName: "channel_identities_connection_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "meta_whatsapp_connections";
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
      conversation_agent_snapshots: {
        Row: {
          channel_connection_id: string | null;
          conversation_id: string | null;
          created_at: string | null;
          id: string | null;
          organization_id: string | null;
          policy_version_id: string | null;
        };
        Insert: {
          channel_connection_id?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          policy_version_id?: string | null;
        };
        Update: {
          channel_connection_id?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          policy_version_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_agent_snapshots_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "conversation_agent_snapshots_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_agent_snapshots_policy_fk";
            columns: ["organization_id", "policy_version_id"];
            isOneToOne: false;
            referencedRelation: "agent_policy_versions";
            referencedColumns: ["organization_id", "id"];
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
            foreignKeyName: "conversations_connection_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "meta_whatsapp_connections";
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
      error_events: {
        Row: {
          error_category: string | null;
          error_code: string | null;
          error_key: string | null;
          id: string | null;
          job_attempt_id: string | null;
          job_id: string | null;
          occurred_at: string | null;
          organization_id: string | null;
          provider: string | null;
          provider_request_id: string | null;
          retryable: boolean | null;
          run_id: string | null;
          severity: string | null;
          summary_redacted: string | null;
          tool_execution_id: string | null;
        };
        Insert: {
          error_category?: string | null;
          error_code?: string | null;
          error_key?: string | null;
          id?: string | null;
          job_attempt_id?: string | null;
          job_id?: string | null;
          occurred_at?: string | null;
          organization_id?: string | null;
          provider?: string | null;
          provider_request_id?: string | null;
          retryable?: boolean | null;
          run_id?: string | null;
          severity?: string | null;
          summary_redacted?: string | null;
          tool_execution_id?: string | null;
        };
        Update: {
          error_category?: string | null;
          error_code?: string | null;
          error_key?: string | null;
          id?: string | null;
          job_attempt_id?: string | null;
          job_id?: string | null;
          occurred_at?: string | null;
          organization_id?: string | null;
          provider?: string | null;
          provider_request_id?: string | null;
          retryable?: boolean | null;
          run_id?: string | null;
          severity?: string | null;
          summary_redacted?: string | null;
          tool_execution_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "error_events_attempt_fk";
            columns: ["organization_id", "job_attempt_id"];
            isOneToOne: false;
            referencedRelation: "job_attempts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "error_events_job_fk";
            columns: ["organization_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "agent_jobs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "error_events_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "error_events_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "error_events_tool_fk";
            columns: ["organization_id", "tool_execution_id"];
            isOneToOne: false;
            referencedRelation: "tool_executions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      facebook_catalog_admin: {
        Row: {
          available_actions: string[] | null;
          created_at: string | null;
          currency_code: string | null;
          external_publication_id: string | null;
          external_url: string | null;
          facebook_page_name: string | null;
          facebook_status: string | null;
          last_error_code: string | null;
          latest_effect_certainty: string | null;
          latest_job_id: string | null;
          latest_job_status: string | null;
          organization_id: string | null;
          price_amount: number | null;
          price_unit_id: string | null;
          pricing_status: string | null;
          product_id: string | null;
          product_name: string | null;
          product_status: string | null;
          publication_id: string | null;
          publication_instance_id: string | null;
          publication_status: string | null;
          publication_version_id: string | null;
          sku: string | null;
          social_connection_id: string | null;
          updated_at: string | null;
          variant_id: string | null;
          variant_name: string | null;
          variant_status: string | null;
        };
        Relationships: [];
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
      job_attempts: {
        Row: {
          attempt_number: number | null;
          completed_at: string | null;
          disposition: string | null;
          fallback_ordinal: number | null;
          id: string | null;
          job_id: string | null;
          model: string | null;
          organization_id: string | null;
          provider: string | null;
          provider_request_id: string | null;
          run_id: string | null;
          started_at: string | null;
          status: string | null;
          termination_reason: string | null;
          worker_id: string | null;
        };
        Insert: {
          attempt_number?: number | null;
          completed_at?: string | null;
          disposition?: string | null;
          fallback_ordinal?: number | null;
          id?: string | null;
          job_id?: string | null;
          model?: string | null;
          organization_id?: string | null;
          provider?: string | null;
          provider_request_id?: string | null;
          run_id?: string | null;
          started_at?: string | null;
          status?: string | null;
          termination_reason?: string | null;
          worker_id?: string | null;
        };
        Update: {
          attempt_number?: number | null;
          completed_at?: string | null;
          disposition?: string | null;
          fallback_ordinal?: number | null;
          id?: string | null;
          job_id?: string | null;
          model?: string | null;
          organization_id?: string | null;
          provider?: string | null;
          provider_request_id?: string | null;
          run_id?: string | null;
          started_at?: string | null;
          status?: string | null;
          termination_reason?: string | null;
          worker_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_attempts_job_run_fk";
            columns: ["organization_id", "job_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_jobs";
            referencedColumns: ["organization_id", "id", "run_id"];
          },
          {
            foreignKeyName: "job_attempts_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
      media_asset_objects: {
        Row: {
          bucket_id: string | null;
          byte_size: number | null;
          created_at: string | null;
          derivation_spec: Json | null;
          height_pixels: number | null;
          id: string | null;
          media_asset_id: string | null;
          mime_type: string | null;
          object_path: string | null;
          organization_id: string | null;
          published_at: string | null;
          rendition_kind: string | null;
          retired_at: string | null;
          status: string | null;
          updated_at: string | null;
          verified_at: string | null;
          width_pixels: number | null;
        };
        Insert: {
          bucket_id?: string | null;
          byte_size?: number | null;
          created_at?: string | null;
          derivation_spec?: Json | null;
          height_pixels?: number | null;
          id?: string | null;
          media_asset_id?: string | null;
          mime_type?: string | null;
          object_path?: string | null;
          organization_id?: string | null;
          published_at?: string | null;
          rendition_kind?: string | null;
          retired_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
          verified_at?: string | null;
          width_pixels?: number | null;
        };
        Update: {
          bucket_id?: string | null;
          byte_size?: number | null;
          created_at?: string | null;
          derivation_spec?: Json | null;
          height_pixels?: number | null;
          id?: string | null;
          media_asset_id?: string | null;
          mime_type?: string | null;
          object_path?: string | null;
          organization_id?: string | null;
          published_at?: string | null;
          rendition_kind?: string | null;
          retired_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
          verified_at?: string | null;
          width_pixels?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_asset_objects_asset_fk";
            columns: ["organization_id", "media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["organization_id", "id"];
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
      memory_entries: {
        Row: {
          channel_connection_id: string | null;
          content_hash: string | null;
          conversation_id: string | null;
          created_at: string | null;
          expires_at: string | null;
          id: string | null;
          organization_id: string | null;
          revoked_at: string | null;
          run_id: string | null;
          scope_key: string | null;
          scope_kind: string | null;
          source_agent_message_id: string | null;
          source_tool_execution_id: string | null;
          status: string | null;
          trust_level: string | null;
        };
        Insert: {
          channel_connection_id?: string | null;
          content_hash?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          revoked_at?: string | null;
          run_id?: string | null;
          scope_key?: string | null;
          scope_kind?: string | null;
          source_agent_message_id?: string | null;
          source_tool_execution_id?: string | null;
          status?: string | null;
          trust_level?: string | null;
        };
        Update: {
          channel_connection_id?: string | null;
          content_hash?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string | null;
          organization_id?: string | null;
          revoked_at?: string | null;
          run_id?: string | null;
          scope_key?: string | null;
          scope_kind?: string | null;
          source_agent_message_id?: string | null;
          source_tool_execution_id?: string | null;
          status?: string | null;
          trust_level?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "memory_entries_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "memory_entries_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memory_entries_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "memory_entries_source_message_fk";
            columns: ["organization_id", "source_agent_message_id"];
            isOneToOne: false;
            referencedRelation: "agent_messages";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "memory_entries_source_tool_fk";
            columns: ["organization_id", "source_tool_execution_id"];
            isOneToOne: false;
            referencedRelation: "tool_executions";
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
      meta_applications: {
        Row: {
          api_version: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          disabled_at: string | null;
          display_name: string | null;
          external_app_id: string | null;
          id: string | null;
          organization_id: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          api_version?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          disabled_at?: string | null;
          display_name?: string | null;
          external_app_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          api_version?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          disabled_at?: string | null;
          display_name?: string | null;
          external_app_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meta_applications_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      meta_credential_versions: {
        Row: {
          activated_at: string | null;
          channel_connection_id: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          credential_kind: string | null;
          id: string | null;
          meta_application_id: string | null;
          organization_id: string | null;
          retire_after: string | null;
          revoked_at: string | null;
          status: string | null;
          version_number: number | null;
          webhook_endpoint_id: string | null;
        };
        Insert: {
          activated_at?: string | null;
          channel_connection_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          credential_kind?: string | null;
          id?: string | null;
          meta_application_id?: string | null;
          organization_id?: string | null;
          retire_after?: string | null;
          revoked_at?: string | null;
          status?: string | null;
          version_number?: number | null;
          webhook_endpoint_id?: string | null;
        };
        Update: {
          activated_at?: string | null;
          channel_connection_id?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          credential_kind?: string | null;
          id?: string | null;
          meta_application_id?: string | null;
          organization_id?: string | null;
          retire_after?: string | null;
          revoked_at?: string | null;
          status?: string | null;
          version_number?: number | null;
          webhook_endpoint_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meta_credential_versions_application_fk";
            columns: ["organization_id", "meta_application_id"];
            isOneToOne: false;
            referencedRelation: "meta_applications";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "meta_credential_versions_channel_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "meta_credential_versions_channel_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "meta_whatsapp_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "meta_credential_versions_webhook_fk";
            columns: ["organization_id", "meta_application_id", "webhook_endpoint_id"];
            isOneToOne: false;
            referencedRelation: "meta_webhook_endpoints";
            referencedColumns: ["organization_id", "meta_application_id", "id"];
          },
        ];
      };
      meta_webhook_endpoints: {
        Row: {
          created_at: string | null;
          disabled_at: string | null;
          endpoint_key: string | null;
          id: string | null;
          last_challenge_at: string | null;
          meta_application_id: string | null;
          organization_id: string | null;
          status: string | null;
          updated_at: string | null;
          verified_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          disabled_at?: string | null;
          endpoint_key?: string | null;
          id?: string | null;
          last_challenge_at?: string | null;
          meta_application_id?: string | null;
          organization_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
          verified_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          disabled_at?: string | null;
          endpoint_key?: string | null;
          id?: string | null;
          last_challenge_at?: string | null;
          meta_application_id?: string | null;
          organization_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meta_webhook_endpoints_application_fk";
            columns: ["organization_id", "meta_application_id"];
            isOneToOne: false;
            referencedRelation: "meta_applications";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      meta_whatsapp_connections: {
        Row: {
          api_version: string | null;
          connected_at: string | null;
          created_at: string | null;
          data_access_expires_at: string | null;
          disabled_at: string | null;
          display_phone_number: string | null;
          external_app_id: string | null;
          granted_scopes: string[] | null;
          id: string | null;
          last_validated_at: string | null;
          meta_application_id: string | null;
          name_status: string | null;
          organization_id: string | null;
          phone_number_id: string | null;
          quality_rating: string | null;
          status: string | null;
          subscribed_at: string | null;
          token_expires_at: string | null;
          token_type: string | null;
          updated_at: string | null;
          verified_name: string | null;
          waba_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "channel_connections_meta_application_fk";
            columns: ["organization_id", "meta_application_id", "external_app_id"];
            isOneToOne: false;
            referencedRelation: "meta_applications";
            referencedColumns: ["organization_id", "id", "external_app_id"];
          },
          {
            foreignKeyName: "channel_connections_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
      product_media: {
        Row: {
          alt_text: string | null;
          approved_at: string | null;
          approved_by_user_id: string | null;
          created_at: string | null;
          id: string | null;
          media_asset_id: string | null;
          media_role: string | null;
          ordinal: number | null;
          organization_id: string | null;
          product_id: string | null;
          retired_at: string | null;
          status: string | null;
          updated_at: string | null;
          variant_id: string | null;
        };
        Insert: {
          alt_text?: string | null;
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          media_asset_id?: string | null;
          media_role?: string | null;
          ordinal?: number | null;
          organization_id?: string | null;
          product_id?: string | null;
          retired_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Update: {
          alt_text?: string | null;
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          created_at?: string | null;
          id?: string | null;
          media_asset_id?: string | null;
          media_role?: string | null;
          ordinal?: number | null;
          organization_id?: string | null;
          product_id?: string | null;
          retired_at?: string | null;
          status?: string | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_media_approved_by_user_fk";
            columns: ["organization_id", "approved_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "product_media_asset_fk";
            columns: ["organization_id", "media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "product_media_product_fk";
            columns: ["organization_id", "product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "product_media_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
          },
          {
            foreignKeyName: "product_media_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
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
      prompt_versions: {
        Row: {
          content_hash: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          id: string | null;
          organization_id: string | null;
          prompt_key: string | null;
          template_format: string | null;
          version_number: number | null;
        };
        Insert: {
          content_hash?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          prompt_key?: string | null;
          template_format?: string | null;
          version_number?: number | null;
        };
        Update: {
          content_hash?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          id?: string | null;
          organization_id?: string | null;
          prompt_key?: string | null;
          template_format?: string | null;
          version_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_versions_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "prompt_versions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      publication_batch_subscriptions: {
        Row: {
          attempt_count: number | null;
          available_at: string | null;
          channel_connection_id: string | null;
          completed_at: string | null;
          conversation_id: string | null;
          created_at: string | null;
          destination_identity_id: string | null;
          id: string | null;
          last_error_code: string | null;
          max_attempts: number | null;
          message_id: string | null;
          organization_id: string | null;
          origin_agent_run_id: string | null;
          outbox_event_id: string | null;
          provider_request_id: string | null;
          publication_batch_id: string | null;
          status: string | null;
          summary_payload: Json | null;
          updated_at: string | null;
        };
        Insert: {
          attempt_count?: number | null;
          available_at?: string | null;
          channel_connection_id?: string | null;
          completed_at?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          destination_identity_id?: string | null;
          id?: string | null;
          last_error_code?: string | null;
          max_attempts?: number | null;
          message_id?: string | null;
          organization_id?: string | null;
          origin_agent_run_id?: string | null;
          outbox_event_id?: string | null;
          provider_request_id?: string | null;
          publication_batch_id?: string | null;
          status?: string | null;
          summary_payload?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          attempt_count?: number | null;
          available_at?: string | null;
          channel_connection_id?: string | null;
          completed_at?: string | null;
          conversation_id?: string | null;
          created_at?: string | null;
          destination_identity_id?: string | null;
          id?: string | null;
          last_error_code?: string | null;
          max_attempts?: number | null;
          message_id?: string | null;
          organization_id?: string | null;
          origin_agent_run_id?: string | null;
          outbox_event_id?: string | null;
          provider_request_id?: string | null;
          publication_batch_id?: string | null;
          status?: string | null;
          summary_payload?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "publication_batch_subscriptions_batch_fk";
            columns: ["organization_id", "publication_batch_id"];
            isOneToOne: true;
            referencedRelation: "publication_batches";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_batch_subscriptions_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "publication_batch_subscriptions_destination_fk";
            columns: ["organization_id", "channel_connection_id", "destination_identity_id"];
            isOneToOne: false;
            referencedRelation: "channel_identities";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "publication_batch_subscriptions_message_fk";
            columns: ["organization_id", "channel_connection_id", "message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "publication_batch_subscriptions_run_fk";
            columns: ["organization_id", "origin_agent_run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
            foreignKeyName: "social_connections_messenger_connection_fk";
            columns: ["organization_id", "messenger_channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "meta_whatsapp_connections";
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
      social_rate_limit_observations: {
        Row: {
          blocked_until: string | null;
          created_at: string | null;
          id: string | null;
          observation_source: string | null;
          observed_at: string | null;
          organization_id: string | null;
          provider_request_id: string | null;
          publication_job_id: string | null;
          retry_after_at: string | null;
          social_connection_id: string | null;
          usage_snapshot: Json | null;
        };
        Insert: {
          blocked_until?: string | null;
          created_at?: string | null;
          id?: string | null;
          observation_source?: string | null;
          observed_at?: string | null;
          organization_id?: string | null;
          provider_request_id?: string | null;
          publication_job_id?: string | null;
          retry_after_at?: string | null;
          social_connection_id?: string | null;
          usage_snapshot?: Json | null;
        };
        Update: {
          blocked_until?: string | null;
          created_at?: string | null;
          id?: string | null;
          observation_source?: string | null;
          observed_at?: string | null;
          organization_id?: string | null;
          provider_request_id?: string | null;
          publication_job_id?: string | null;
          retry_after_at?: string | null;
          social_connection_id?: string | null;
          usage_snapshot?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "social_rate_limit_observations_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "social_rate_limit_observations_job_fk";
            columns: ["organization_id", "publication_job_id"];
            isOneToOne: false;
            referencedRelation: "publication_jobs";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      tool_contract_versions: {
        Row: {
          contract_hash: string | null;
          created_at: string | null;
          created_by_user_id: string | null;
          description: string | null;
          effect_class: string | null;
          id: string | null;
          input_schema: Json | null;
          organization_id: string | null;
          output_schema: Json | null;
          tool_contract_id: string | null;
          version_number: number | null;
        };
        Insert: {
          contract_hash?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          description?: string | null;
          effect_class?: string | null;
          id?: string | null;
          input_schema?: Json | null;
          organization_id?: string | null;
          output_schema?: Json | null;
          tool_contract_id?: string | null;
          version_number?: number | null;
        };
        Update: {
          contract_hash?: string | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          description?: string | null;
          effect_class?: string | null;
          id?: string | null;
          input_schema?: Json | null;
          organization_id?: string | null;
          output_schema?: Json | null;
          tool_contract_id?: string | null;
          version_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "tool_contract_versions_contract_fk";
            columns: ["organization_id", "tool_contract_id"];
            isOneToOne: false;
            referencedRelation: "tool_contracts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "tool_contract_versions_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "tool_contract_versions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      tool_contracts: {
        Row: {
          created_at: string | null;
          created_by_user_id: string | null;
          current_version_id: string | null;
          display_name: string | null;
          id: string | null;
          organization_id: string | null;
          status: string | null;
          tool_name: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by_user_id?: string | null;
          current_version_id?: string | null;
          display_name?: string | null;
          id?: string | null;
          organization_id?: string | null;
          status?: string | null;
          tool_name?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by_user_id?: string | null;
          current_version_id?: string | null;
          display_name?: string | null;
          id?: string | null;
          organization_id?: string | null;
          status?: string | null;
          tool_name?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tool_contracts_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "tool_contracts_current_version_fk";
            columns: ["organization_id", "id", "current_version_id"];
            isOneToOne: false;
            referencedRelation: "tool_contract_versions";
            referencedColumns: ["organization_id", "tool_contract_id", "id"];
          },
          {
            foreignKeyName: "tool_contracts_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      tool_executions: {
        Row: {
          arguments_hash: string | null;
          authorization_reason: string | null;
          authorization_status: string | null;
          authorized_at: string | null;
          completed_at: string | null;
          created_at: string | null;
          effect_certainty: string | null;
          effect_class: string | null;
          effect_started_at: string | null;
          id: string | null;
          job_attempt_id: string | null;
          organization_id: string | null;
          outbox_channel_connection_id: string | null;
          outbox_event_id: string | null;
          policy_tool_id: string | null;
          provider_tool_call_id: string | null;
          result_hash: string | null;
          run_id: string | null;
          status: string | null;
          tool_contract_id: string | null;
          tool_contract_version_id: string | null;
          tool_round: number | null;
        };
        Insert: {
          arguments_hash?: string | null;
          authorization_reason?: string | null;
          authorization_status?: string | null;
          authorized_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          effect_certainty?: string | null;
          effect_class?: string | null;
          effect_started_at?: string | null;
          id?: string | null;
          job_attempt_id?: string | null;
          organization_id?: string | null;
          outbox_channel_connection_id?: string | null;
          outbox_event_id?: string | null;
          policy_tool_id?: string | null;
          provider_tool_call_id?: string | null;
          result_hash?: string | null;
          run_id?: string | null;
          status?: string | null;
          tool_contract_id?: string | null;
          tool_contract_version_id?: string | null;
          tool_round?: number | null;
        };
        Update: {
          arguments_hash?: string | null;
          authorization_reason?: string | null;
          authorization_status?: string | null;
          authorized_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          effect_certainty?: string | null;
          effect_class?: string | null;
          effect_started_at?: string | null;
          id?: string | null;
          job_attempt_id?: string | null;
          organization_id?: string | null;
          outbox_channel_connection_id?: string | null;
          outbox_event_id?: string | null;
          policy_tool_id?: string | null;
          provider_tool_call_id?: string | null;
          result_hash?: string | null;
          run_id?: string | null;
          status?: string | null;
          tool_contract_id?: string | null;
          tool_contract_version_id?: string | null;
          tool_round?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "tool_executions_attempt_fk";
            columns: ["organization_id", "job_attempt_id"];
            isOneToOne: false;
            referencedRelation: "job_attempts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "tool_executions_contract_version_fk";
            columns: ["organization_id", "tool_contract_id", "tool_contract_version_id"];
            isOneToOne: false;
            referencedRelation: "tool_contract_versions";
            referencedColumns: ["organization_id", "tool_contract_id", "id"];
          },
          {
            foreignKeyName: "tool_executions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tool_executions_policy_tool_fk";
            columns: ["organization_id", "policy_tool_id"];
            isOneToOne: false;
            referencedRelation: "agent_policy_tools";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "tool_executions_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      usage_events: {
        Row: {
          cache_write_input_tokens: number | null;
          cached_input_tokens: number | null;
          cost_amount: number | null;
          cost_currency: string | null;
          cost_status: string | null;
          id: string | null;
          input_tokens: number | null;
          job_attempt_id: string | null;
          latency_ms: number | null;
          model: string | null;
          occurred_at: string | null;
          operation: string | null;
          organization_id: string | null;
          output_tokens: number | null;
          provider: string | null;
          reasoning_tokens: number | null;
          request_count: number | null;
          run_id: string | null;
          tool_execution_id: string | null;
          total_tokens: number | null;
          usage_key: string | null;
        };
        Insert: {
          cache_write_input_tokens?: number | null;
          cached_input_tokens?: number | null;
          cost_amount?: number | null;
          cost_currency?: string | null;
          cost_status?: string | null;
          id?: string | null;
          input_tokens?: number | null;
          job_attempt_id?: string | null;
          latency_ms?: number | null;
          model?: string | null;
          occurred_at?: string | null;
          operation?: string | null;
          organization_id?: string | null;
          output_tokens?: number | null;
          provider?: string | null;
          reasoning_tokens?: number | null;
          request_count?: number | null;
          run_id?: string | null;
          tool_execution_id?: string | null;
          total_tokens?: number | null;
          usage_key?: string | null;
        };
        Update: {
          cache_write_input_tokens?: number | null;
          cached_input_tokens?: number | null;
          cost_amount?: number | null;
          cost_currency?: string | null;
          cost_status?: string | null;
          id?: string | null;
          input_tokens?: number | null;
          job_attempt_id?: string | null;
          latency_ms?: number | null;
          model?: string | null;
          occurred_at?: string | null;
          operation?: string | null;
          organization_id?: string | null;
          output_tokens?: number | null;
          provider?: string | null;
          reasoning_tokens?: number | null;
          request_count?: number | null;
          run_id?: string | null;
          tool_execution_id?: string | null;
          total_tokens?: number | null;
          usage_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "usage_events_attempt_fk";
            columns: ["organization_id", "job_attempt_id"];
            isOneToOne: false;
            referencedRelation: "job_attempts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "usage_events_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usage_events_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "usage_events_tool_execution_fk";
            columns: ["organization_id", "tool_execution_id"];
            isOneToOne: false;
            referencedRelation: "tool_executions";
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
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
            referencedRelation: "facebook_catalog_admin";
            referencedColumns: ["organization_id", "variant_id"];
          },
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
      accept_meta_webhook_challenge: {
        Args: {
          target_correlation_id: string;
          target_endpoint_key: string;
          target_mode: string;
          target_trace_id?: string;
          target_verify_token: string;
        };
        Returns: {
          credential_version_id: string;
          external_app_id: string;
          meta_application_id: string;
          organization_id: string;
          webhook_endpoint_id: string;
        }[];
      };
      admin_enqueue_facebook_catalog: {
        Args: {
          target_actor_user_id: string;
          target_idempotency_key: string;
          target_operation: string;
          target_organization_id: string;
          target_social_connection_id: string;
        };
        Returns: Json;
      };
      admin_enqueue_facebook_publication: {
        Args: {
          target_actor_user_id: string;
          target_idempotency_key: string;
          target_operation: string;
          target_organization_id: string;
          target_social_connection_id: string;
          target_variant_id: string;
        };
        Returns: Json;
      };
      admin_retry_facebook_publication: {
        Args: {
          target_actor_user_id: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_publication_job_id: string;
        };
        Returns: Json;
      };
      admin_set_catalog_offer_status: {
        Args: {
          target_actor_user_id: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_reason: string;
          target_status: string;
          target_variant_id: string;
        };
        Returns: Json;
      };
      admin_set_facebook_batch_state: {
        Args: {
          target_action: string;
          target_actor_user_id: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_publication_batch_id: string;
          target_reason: string;
        };
        Returns: Json;
      };
      append_agent_message: {
        Args: {
          target_channel_connection_id: string;
          target_content: Json;
          target_conversation_id: string;
          target_domain_message_id: string;
          target_message_key: string;
          target_message_kind: string;
          target_message_role: string;
          target_organization_id: string;
          target_provider_item_id: string;
          target_run_id: string;
          target_trust_level: string;
        };
        Returns: {
          agent_message_id: string;
          sequence_number: number;
          was_replayed: boolean;
        }[];
      };
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
      authorize_tool_execution: {
        Args: {
          target_organization_id: string;
          target_tool_execution_id: string;
        };
        Returns: {
          authorization_constraints: Json;
          authorization_reason: string;
          authorization_status: string;
          status: string;
          tool_execution_id: string;
          was_replayed: boolean;
        }[];
      };
      begin_facebook_page_oauth: {
        Args: {
          target_actor_user_id: string;
          target_organization_id: string;
          target_redirect_uri: string;
          target_state: string;
        };
        Returns: {
          api_version: string;
          external_app_id: string;
          oauth_session_id: string;
        }[];
      };
      begin_media_asset_ingest: {
        Args: {
          target_actor_kind: string;
          target_actor_user_id: string;
          target_byte_size: number;
          target_content_sha256: string;
          target_correlation_id: string;
          target_height_pixels: number;
          target_mime_type: string;
          target_organization_id: string;
          target_original_file_name: string;
          target_source_kind: string;
          target_source_message_id: string;
          target_trace_id?: string;
          target_width_pixels: number;
        };
        Returns: {
          ingest_status: string;
          media_asset_id: string;
          was_replayed: boolean;
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
      checkpoint_whatsapp_agent_turn: {
        Args: {
          target_job_attempt_id: string;
          target_lease_token: string;
          target_organization_id: string;
          target_partial_text: string;
          target_provider_request_id: string;
          target_response_metadata_safe?: Json;
          target_worker_id: string;
        };
        Returns: {
          agent_run_id: string;
          checkpoint_reference: string;
          was_replayed: boolean;
        }[];
      };
      claim_agent_job: {
        Args: {
          target_lease_seconds?: number;
          target_organization_id: string;
          target_worker_id: string;
        };
        Returns: {
          agent_job_id: string;
          agent_run_id: string;
          attempt_number: number;
          lease_expires_at: string;
          lease_token: string;
          payload_safe: Json;
        }[];
      };
      claim_facebook_page_oauth_exchange: {
        Args: { target_actor_user_id: string; target_state: string };
        Returns: {
          api_version: string;
          app_secret: string;
          exchange_lease_token: string;
          external_app_id: string;
          oauth_session_id: string;
          organization_id: string;
          redirect_uri: string;
        }[];
      };
      claim_facebook_publication_job: {
        Args: {
          target_lease_seconds?: number;
          target_now?: string;
          target_organization_id?: string;
          target_worker_id: string;
        };
        Returns: {
          access_token: string;
          api_version: string;
          attempt_count: number;
          body: string;
          call_to_action: string;
          content_payload: Json;
          currency_code: string;
          external_effect_key: string;
          headline: string;
          lease_expires_at: string;
          lease_token: string;
          max_attempts: number;
          media: Json;
          operation: string;
          organization_id: string;
          page_id: string;
          price_amount: number;
          pricing_status: string;
          publication_batch_id: string;
          publication_id: string;
          publication_job_id: string;
          publication_version_id: string;
        }[];
      };
      claim_meta_webhook_delivery: {
        Args: {
          target_lease_seconds?: number;
          target_max_attempts?: number;
          target_provider_object_type: string;
          target_worker_id: string;
        };
        Returns: {
          attempt_number: number;
          correlation_id: string;
          delivery_id: string;
          lease_expires_at: string;
          lease_token: string;
          meta_application_id: string;
          organization_id: string;
          provider_object_type: string;
          trace_id: string;
        }[];
      };
      claim_meta_whatsapp_message_event: {
        Args: {
          target_lease_seconds?: number;
          target_max_attempts?: number;
          target_worker_id: string;
        };
        Returns: {
          attempt_number: number;
          channel_connection_id: string;
          correlation_id: string;
          inbound_event_id: string;
          lease_expires_at: string;
          lease_token: string;
          organization_id: string;
          trace_id: string;
        }[];
      };
      claim_publication_batch_notification: {
        Args: {
          target_lease_seconds?: number;
          target_organization_id?: string;
          target_worker_id: string;
        };
        Returns: {
          attempt_count: number;
          lease_expires_at: string;
          lease_token: string;
          model: string;
          organization_id: string;
          provider: string;
          publication_batch_id: string;
          publication_batch_subscription_id: string;
          reasoning_effort: string;
          summary_payload: Json;
          system_prompt: string;
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
      claim_whatsapp_agent_turn: {
        Args: {
          target_lease_seconds?: number;
          target_model: string;
          target_organization_id?: string;
          target_provider: string;
          target_reasoning_effort: string;
          target_vision_model: string;
          target_vision_provider: string;
          target_worker_id: string;
        };
        Returns: {
          agent_job_id: string;
          agent_run_id: string;
          attempt_number: number;
          channel_connection_id: string;
          continuation_parts: Json;
          conversation_history: Json;
          conversation_id: string;
          correlation_id: string;
          job_attempt_id: string;
          lease_expires_at: string;
          lease_token: string;
          model: string;
          organization_id: string;
          provider: string;
          reasoning_effort: string;
          system_prompt: string;
          trace_id: string;
          trigger_message_id: string;
        }[];
      };
      claim_whatsapp_media_ingest: {
        Args: {
          target_lease_seconds?: number;
          target_max_attempts?: number;
          target_organization_id?: string;
          target_worker_id: string;
        };
        Returns: {
          access_token: string;
          api_version: string;
          attempt_number: number;
          channel_connection_id: string;
          correlation_id: string;
          declared_file_size: number;
          declared_mime_type: string;
          declared_sha256_hex: string;
          lease_expires_at: string;
          lease_token: string;
          message_id: string;
          organization_id: string;
          phone_number_id: string;
          provider_media_id: string;
          request_id: string;
          trace_id: string;
        }[];
      };
      claim_whatsapp_outbox_event: {
        Args: {
          target_lease_seconds?: number;
          target_max_attempts?: number;
          target_organization_id?: string;
          target_worker_id: string;
        };
        Returns: {
          access_token: string;
          api_version: string;
          attempt_number: number;
          correlation_id: string;
          destination: string;
          lease_expires_at: string;
          lease_token: string;
          message_id: string;
          organization_id: string;
          outbox_event_id: string;
          payload: Json;
          phone_number_id: string;
        }[];
      };
      complete_facebook_page_oauth: {
        Args: {
          target_actor_user_id: string;
          target_oauth_session_id: string;
          target_page_id: string;
        };
        Returns: {
          page_name: string;
          social_connection_id: string;
        }[];
      };
      complete_media_asset_ingest: {
        Args: {
          target_actor_kind: string;
          target_actor_user_id: string;
          target_correlation_id: string;
          target_media_asset_id: string;
          target_organization_id: string;
          target_trace_id?: string;
        };
        Returns: {
          ingest_status: string;
          media_asset_id: string;
          was_replayed: boolean;
        }[];
      };
      complete_publication_batch_notification: {
        Args: {
          target_lease_token: string;
          target_organization_id: string;
          target_provider_request_id: string;
          target_subscription_id: string;
          target_visible_text: string;
        };
        Returns: {
          message_id: string;
          outbox_event_id: string;
          publication_batch_subscription_id: string;
          status: string;
        }[];
      };
      complete_whatsapp_agent_turn: {
        Args: {
          target_job_attempt_id: string;
          target_lease_token: string;
          target_organization_id: string;
          target_provider_request_id: string;
          target_response_metadata_safe?: Json;
          target_visible_text: string;
          target_worker_id: string;
        };
        Returns: {
          agent_run_id: string;
          outbound_message_count: number;
          outbox_event_ids: string[];
          was_replayed: boolean;
        }[];
      };
      complete_whatsapp_media_ingest: {
        Args: {
          target_lease_token: string;
          target_media_asset_id: string;
          target_organization_id: string;
          target_request_id: string;
          target_worker_id: string;
        };
        Returns: {
          media_asset_id: string;
          request_id: string;
          status: string;
          was_replayed: boolean;
        }[];
      };
      confirm_meta_webhook_verification: {
        Args: {
          target_correlation_id: string;
          target_credential_version_id: string;
          target_endpoint_key: string;
          target_trace_id?: string;
        };
        Returns: undefined;
      };
      create_agent_policy_version: {
        Args: {
          target_activate: boolean;
          target_cache_mode: string;
          target_correlation_id: string;
          target_cost_currency: string;
          target_created_by_user_id: string;
          target_display_name: string;
          target_expected_current_version_id: string;
          target_fallback_models: Json;
          target_idempotency_key: string;
          target_max_cost_amount: number;
          target_max_parallel_tools: number;
          target_max_provider_attempts: number;
          target_max_tool_rounds: number;
          target_organization_id: string;
          target_policy_key: string;
          target_prompt_version_id: string;
          target_tool_bindings: Json;
          target_trace_id?: string;
          target_turn_timeout_ms: number;
          target_unknown_cost_behavior: string;
        };
        Returns: {
          agent_policy_id: string;
          agent_policy_version_id: string;
          tools_bound: number;
          version_number: number;
          was_replayed: boolean;
        }[];
      };
      create_business_configuration_version: {
        Args: {
          target_activate: boolean;
          target_configuration_key: string;
          target_correlation_id: string;
          target_created_by_user_id: string;
          target_display_name: string;
          target_document: Json;
          target_expected_current_version_id: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_schema_key: string;
          target_schema_version: number;
          target_trace_id?: string;
          target_validation_contract: string;
        };
        Returns: {
          configuration_id: string;
          configuration_version_id: string;
          version_number: number;
          was_replayed: boolean;
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
      enqueue_agent_run: {
        Args: {
          target_actor_channel_identity_id: string;
          target_actor_kind: string;
          target_actor_user_id: string;
          target_cache_key_hash: string;
          target_channel_connection_id: string;
          target_conversation_id: string;
          target_correlation_id: string;
          target_idempotency_key: string;
          target_model: string;
          target_organization_id: string;
          target_payload_safe: Json;
          target_policy_key: string;
          target_priority: number;
          target_provider: string;
          target_reasoning_effort: string;
          target_run_key: string;
          target_run_kind: string;
          target_source_inbound_event_id: string;
          target_trace_id?: string;
          target_trigger_message_id: string;
          target_vision_model: string;
          target_vision_provider: string;
        };
        Returns: {
          agent_job_id: string;
          agent_run_id: string;
          conversation_snapshot_id: string;
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
      execute_whatsapp_read_only_tool_call: {
        Args: {
          target_arguments_safe: Json;
          target_job_attempt_id: string;
          target_lease_token: string;
          target_organization_id: string;
          target_provider: string;
          target_provider_request_id: string;
          target_provider_state: Json;
          target_provider_tool_call_id: string;
          target_response_metadata_safe: Json;
          target_run_id: string;
          target_tool_name: string;
          target_tool_round: number;
          target_worker_id: string;
        };
        Returns: {
          job_status: string;
          run_status: string;
          tool_execution_id: string;
          tool_result: Json;
          tool_status: string;
          was_replayed: boolean;
        }[];
      };
      execute_whatsapp_tool_call: {
        Args: {
          target_arguments_safe: Json;
          target_job_attempt_id: string;
          target_lease_token: string;
          target_organization_id: string;
          target_provider: string;
          target_provider_request_id: string;
          target_provider_state: Json;
          target_provider_tool_call_id: string;
          target_response_metadata_safe: Json;
          target_run_id: string;
          target_tool_name: string;
          target_tool_round: number;
          target_worker_id: string;
        };
        Returns: {
          job_status: string;
          run_status: string;
          tool_execution_id: string;
          tool_result: Json;
          tool_status: string;
          was_replayed: boolean;
        }[];
      };
      fail_facebook_page_oauth: {
        Args: {
          target_actor_user_id: string;
          target_exchange_lease_token: string;
          target_oauth_session_id: string;
        };
        Returns: undefined;
      };
      fail_meta_webhook_delivery: {
        Args: {
          target_delivery_id: string;
          target_error_code: string;
          target_lease_token: string;
          target_max_attempts?: number;
          target_retry_delay_seconds?: number;
          target_retryable: boolean;
        };
        Returns: {
          attempt_count: number;
          delivery_id: string;
          delivery_status: string;
        }[];
      };
      fail_meta_whatsapp_message_event: {
        Args: {
          target_error_code: string;
          target_inbound_event_id: string;
          target_lease_token: string;
          target_max_attempts?: number;
          target_retry_delay_seconds?: number;
          target_retryable: boolean;
        };
        Returns: {
          attempt_count: number;
          event_status: string;
          inbound_event_id: string;
        }[];
      };
      fail_publication_batch_notification: {
        Args: {
          target_error_code: string;
          target_lease_token: string;
          target_organization_id: string;
          target_retry_at?: string;
          target_retryable: boolean;
          target_subscription_id: string;
        };
        Returns: {
          publication_batch_subscription_id: string;
          status: string;
        }[];
      };
      fail_whatsapp_media_ingest: {
        Args: {
          target_error_code: string;
          target_lease_token: string;
          target_max_attempts?: number;
          target_organization_id: string;
          target_request_id: string;
          target_retry_delay_seconds?: number;
          target_retryable: boolean;
          target_worker_id: string;
        };
        Returns: {
          request_id: string;
          status: string;
          was_replayed: boolean;
        }[];
      };
      get_agent_turn_tool_context: {
        Args: {
          target_job_attempt_id: string;
          target_lease_token: string;
          target_organization_id: string;
          target_run_id: string;
          target_worker_id: string;
        };
        Returns: {
          next_tool_round: number;
          tool_definitions: Json;
          tool_history: Json;
        }[];
      };
      get_facebook_catalog_admin_page: {
        Args: {
          target_actor_user_id: string;
          target_cursor_updated_at?: string;
          target_cursor_variant_id?: string;
          target_organization_id: string;
          target_page_size?: number;
          target_search?: string;
          target_social_connection_id?: string;
          target_status?: string;
        };
        Returns: Json;
      };
      get_publication_batch_status: {
        Args: {
          target_organization_id: string;
          target_publication_batch_id: string;
        };
        Returns: Json;
      };
      get_whatsapp_media_visual_inputs: {
        Args: {
          target_job_attempt_id: string;
          target_lease_token: string;
          target_message_ids: string[];
          target_organization_id: string;
          target_worker_id: string;
        };
        Returns: {
          analysis_sha256_hex: string;
          media_asset_id: string;
          message_id: string;
          mime_type: string;
        }[];
      };
      ingest_meta_webhook_delivery: {
        Args: {
          target_endpoint_key: string;
          target_raw_body_base64: string;
          target_request_id: string;
          target_signature_hex: string;
          target_trace_id?: string;
        };
        Returns: {
          credential_version_id: string;
          delivery_count: number;
          delivery_id: string;
          delivery_status: string;
          meta_application_id: string;
          organization_id: string;
          provider_object_type: string;
          replayed: boolean;
          webhook_endpoint_id: string;
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
      link_product_media: {
        Args: {
          target_actor_user_id: string;
          target_alt_text: string;
          target_correlation_id: string;
          target_media_asset_id: string;
          target_media_role: string;
          target_ordinal: number;
          target_organization_id: string;
          target_product_id: string;
          target_trace_id?: string;
          target_variant_id: string;
        };
        Returns: {
          media_status: string;
          product_media_id: string;
          was_replayed: boolean;
        }[];
      };
      link_whatsapp_member_identity: {
        Args: {
          target_actor_user_id: string;
          target_channel_identity_id: string;
          target_correlation_id: string;
          target_idempotency_key: string;
          target_member_user_id: string;
          target_organization_id: string;
          target_trace_id?: string;
        };
        Returns: {
          channel_identity_id: string;
          member_user_id: string;
          was_replayed: boolean;
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
      mark_tool_effect_started: {
        Args: {
          target_organization_id: string;
          target_tool_execution_id: string;
          target_worker_id: string;
        };
        Returns: {
          effect_certainty: string;
          status: string;
          tool_execution_id: string;
          was_replayed: boolean;
        }[];
      };
      normalize_meta_whatsapp_message: {
        Args: { target_inbound_event_id: string; target_lease_token: string };
        Returns: {
          channel_identity_id: string;
          content_kind: string;
          conversation_id: string;
          inbound_event_id: string;
          message_id: string;
          principal_type: string;
          was_replayed: boolean;
        }[];
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
      prepare_customer_assistant_read_tools: {
        Args: { target_limit?: number };
        Returns: {
          organizations_failed: number;
          organizations_prepared: number;
        }[];
      };
      prepare_customer_assistant_tools: {
        Args: { target_limit?: number };
        Returns: {
          organizations_failed: number;
          organizations_prepared: number;
        }[];
      };
      propose_tool_execution: {
        Args: {
          target_arguments_safe: Json;
          target_execution_key: string;
          target_external_effect_key: string;
          target_job_attempt_id: string;
          target_organization_id: string;
          target_provider_tool_call_id: string;
          target_run_id: string;
          target_tool_name: string;
          target_tool_round: number;
        };
        Returns: {
          authorization_status: string;
          effect_class: string;
          tool_execution_id: string;
          was_replayed: boolean;
        }[];
      };
      reconcile_due_publication_batches: {
        Args: {
          target_limit?: number;
          target_now?: string;
          target_organization_id?: string;
        };
        Returns: {
          notifications_ready: number;
          scanned_count: number;
          terminal_count: number;
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
      reconcile_publication_batch_notifications: {
        Args: {
          target_now?: string;
          target_organization_id: string;
          target_publication_batch_id: string;
        };
        Returns: {
          job_counts: Json;
          notifications_ready: number;
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
      record_agent_attempt_result: {
        Args: {
          target_checkpoint_hash?: string;
          target_checkpoint_reference?: string;
          target_disposition: string;
          target_job_attempt_id: string;
          target_last_error_code?: string;
          target_lease_token: string;
          target_organization_id: string;
          target_provider_request_id: string;
          target_response_metadata_safe: Json;
          target_termination_reason: string;
          target_worker_id: string;
        };
        Returns: {
          attempt_status: string;
          job_attempt_id: string;
          job_status: string;
          run_status: string;
          was_replayed: boolean;
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
      record_error_event: {
        Args: {
          target_correlation_id: string;
          target_detail_reference: string;
          target_error_category: string;
          target_error_code: string;
          target_error_key: string;
          target_job_attempt_id: string;
          target_job_id: string;
          target_organization_id: string;
          target_provider: string;
          target_provider_request_id: string;
          target_retryable: boolean;
          target_run_id: string;
          target_severity: string;
          target_summary_redacted: string;
          target_tool_execution_id: string;
          target_trace_id?: string;
        };
        Returns: {
          error_event_id: string;
          was_replayed: boolean;
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
      record_social_rate_limit_observation: {
        Args: {
          target_blocked_until: string;
          target_lease_token: string;
          target_observation_source: string;
          target_observed_at?: string;
          target_organization_id: string;
          target_provider_request_id: string;
          target_publication_job_id: string;
          target_retry_after_at: string;
          target_usage_snapshot: Json;
        };
        Returns: {
          next_dispatch_at: string;
          social_connection_id: string;
          social_rate_limit_observation_id: string;
        }[];
      };
      record_tool_execution_result: {
        Args: {
          target_effect_certainty: string;
          target_organization_id: string;
          target_outbox_channel_connection_id?: string;
          target_outbox_event_id?: string;
          target_result_safe: Json;
          target_status: string;
          target_tool_execution_id: string;
        };
        Returns: {
          effect_certainty: string;
          status: string;
          tool_execution_id: string;
          was_replayed: boolean;
        }[];
      };
      record_usage_event: {
        Args: {
          target_cache_write_input_tokens: number;
          target_cached_input_tokens: number;
          target_cost_amount: number;
          target_cost_currency: string;
          target_cost_status: string;
          target_input_tokens: number;
          target_job_attempt_id: string;
          target_latency_ms: number;
          target_model: string;
          target_operation: string;
          target_organization_id: string;
          target_output_tokens: number;
          target_provider: string;
          target_provider_usage_safe?: Json;
          target_reasoning_tokens: number;
          target_request_count: number;
          target_run_id: string;
          target_tool_execution_id: string;
          target_total_tokens: number;
          target_usage_key: string;
        };
        Returns: {
          budget_status: string;
          total_known_cost: number;
          usage_event_id: string;
          was_replayed: boolean;
        }[];
      };
      record_whatsapp_outbox_result: {
        Args: {
          target_error_code: string;
          target_lease_token: string;
          target_organization_id: string;
          target_outbox_event_id: string;
          target_outcome: string;
          target_provider_message_id: string;
          target_retry_delay_seconds?: number;
          target_worker_id: string;
        };
        Returns: {
          message_status: string;
          outbox_event_id: string;
          outbox_status: string;
          was_replayed: boolean;
        }[];
      };
      recover_expired_agent_job: {
        Args: {
          target_job_id: string;
          target_organization_id: string;
          target_recovery_worker_id: string;
          target_retry_delay_seconds?: number;
        };
        Returns: {
          agent_job_id: string;
          agent_run_id: string;
          job_status: string;
          recovered: boolean;
          recovery_disposition: string;
          run_status: string;
        }[];
      };
      recover_expired_facebook_publication_jobs: {
        Args: {
          target_limit?: number;
          target_now?: string;
          target_organization_id?: string;
        };
        Returns: {
          failed_count: number;
          retryable_count: number;
          scanned_count: number;
          uncertain_count: number;
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
      recover_expired_whatsapp_agent_turns: {
        Args: {
          target_limit?: number;
          target_organization_id?: string;
          target_retry_delay_seconds?: number;
          target_worker_id: string;
        };
        Returns: {
          failed_count: number;
          recovered_count: number;
          retryable_count: number;
          scanned_count: number;
          uncertain_count: number;
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
      register_media_asset_object: {
        Args: {
          target_actor_kind: string;
          target_actor_user_id: string;
          target_bucket_id: string;
          target_byte_size: number;
          target_content_sha256: string;
          target_correlation_id: string;
          target_derivation_spec: Json;
          target_height_pixels: number;
          target_media_asset_id: string;
          target_mime_type: string;
          target_object_path: string;
          target_organization_id: string;
          target_rendition_kind: string;
          target_trace_id?: string;
          target_width_pixels: number;
        };
        Returns: {
          media_asset_object_id: string;
          object_status: string;
          was_replayed: boolean;
        }[];
      };
      register_meta_application: {
        Args: {
          target_actor_user_id: string;
          target_api_version: string;
          target_app_secret: string;
          target_correlation_id: string;
          target_display_name: string;
          target_external_app_id: string;
          target_organization_id: string;
          target_trace_id?: string;
          target_webhook_verify_token: string;
        };
        Returns: {
          endpoint_key: string;
          meta_application_id: string;
          webhook_endpoint_id: string;
        }[];
      };
      register_meta_whatsapp_connection: {
        Args: {
          target_access_token: string;
          target_actor_user_id: string;
          target_correlation_id: string;
          target_data_access_expires_at: string;
          target_display_phone_number: string;
          target_granted_scopes: string[];
          target_meta_application_id: string;
          target_name_status: string;
          target_organization_id: string;
          target_phone_number_id: string;
          target_quality_rating: string;
          target_token_expires_at: string;
          target_token_type: string;
          target_trace_id?: string;
          target_verified_name: string;
          target_waba_id: string;
        };
        Returns: {
          channel_connection_id: string;
          connection_status: string;
          display_phone_number: string;
          verified_name: string;
        }[];
      };
      register_prompt_version: {
        Args: {
          target_content_template: string;
          target_correlation_id: string;
          target_created_by_user_id: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_prompt_key: string;
          target_template_format: string;
          target_trace_id?: string;
        };
        Returns: {
          prompt_version_id: string;
          version_number: number;
          was_replayed: boolean;
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
      register_tool_contract_version: {
        Args: {
          target_correlation_id: string;
          target_created_by_user_id: string;
          target_description: string;
          target_display_name: string;
          target_effect_class: string;
          target_expected_current_version_id: string;
          target_handler_key: string;
          target_idempotency_key: string;
          target_input_schema: Json;
          target_organization_id: string;
          target_output_schema: Json;
          target_status: string;
          target_tool_name: string;
          target_trace_id?: string;
        };
        Returns: {
          tool_contract_id: string;
          tool_contract_version_id: string;
          version_number: number;
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
      resume_agent_run_after_tools: {
        Args: { target_job_id: string; target_organization_id: string };
        Returns: {
          agent_job_id: string;
          agent_run_id: string;
          job_status: string;
          run_status: string;
        }[];
      };
      retry_publication_job: {
        Args: {
          target_available_at?: string;
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_publication_job_id: string;
        };
        Returns: {
          publication_job_id: string;
          retry_of_job_id: string;
          was_replayed: boolean;
        }[];
      };
      rollback_business_configuration: {
        Args: {
          target_configuration_id: string;
          target_correlation_id: string;
          target_created_by_user_id: string;
          target_expected_current_version_id: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_reason: string;
          target_source_version_id: string;
          target_trace_id?: string;
        };
        Returns: {
          configuration_version_id: string;
          version_number: number;
          was_replayed: boolean;
        }[];
      };
      rotate_meta_credential: {
        Args: {
          target_actor_user_id: string;
          target_channel_connection_id: string;
          target_correlation_id: string;
          target_credential_kind: string;
          target_meta_application_id: string;
          target_organization_id: string;
          target_overlap_seconds: number;
          target_secret_value: string;
          target_trace_id?: string;
          target_webhook_endpoint_id: string;
        };
        Returns: {
          activated_at: string;
          credential_version_id: string;
          version_number: number;
        }[];
      };
      route_meta_whatsapp_delivery: {
        Args: { target_delivery_id: string; target_lease_token: string };
        Returns: {
          delivery_id: string;
          delivery_status: string;
          ignored_change_count: number;
          inserted_event_count: number;
          replayed_event_count: number;
        }[];
      };
      stage_facebook_page_oauth_pages: {
        Args: {
          target_actor_user_id: string;
          target_exchange_lease_token: string;
          target_oauth_session_id: string;
          target_page_candidates: Json;
          target_token_bundle: string;
        };
        Returns: undefined;
      };
      start_agent_job_attempt: {
        Args: {
          target_fallback_ordinal: number;
          target_job_id: string;
          target_lease_token: string;
          target_organization_id: string;
          target_request_metadata_safe?: Json;
          target_worker_id: string;
        };
        Returns: {
          agent_run_id: string;
          attempt_number: number;
          fallback_ordinal: number;
          job_attempt_id: string;
          model: string;
          provider: string;
        }[];
      };
      subscribe_publication_batch: {
        Args: {
          target_agent_run_id: string;
          target_organization_id: string;
          target_publication_batch_id: string;
        };
        Returns: {
          publication_batch_subscription_id: string;
          status: string;
          was_replayed: boolean;
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
      transition_product_media: {
        Args: {
          target_actor_user_id: string;
          target_correlation_id: string;
          target_expected_updated_at: string;
          target_organization_id: string;
          target_product_media_id: string;
          target_status: string;
          target_trace_id?: string;
        };
        Returns: {
          media_status: string;
          product_media_id: string;
          updated_at: string;
          was_replayed: boolean;
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
      transition_publication_batch_pause: {
        Args: {
          target_action: string;
          target_created_by_user_id?: string;
          target_idempotency_key: string;
          target_organization_id: string;
          target_publication_batch_id: string;
          target_reason: string;
          target_resume_at?: string;
        };
        Returns: {
          publication_batch_id: string;
          status: string;
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
      verify_meta_webhook_challenge: {
        Args: { target_endpoint_key: string; target_verify_token: string };
        Returns: {
          credential_version_id: string;
          external_app_id: string;
          meta_application_id: string;
          organization_id: string;
          webhook_endpoint_id: string;
        }[];
      };
      verify_meta_webhook_signature: {
        Args: {
          target_endpoint_key: string;
          target_raw_body: string;
          target_signature: string;
        };
        Returns: {
          credential_version_id: string;
          external_app_id: string;
          meta_application_id: string;
          organization_id: string;
          webhook_endpoint_id: string;
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
      admin_catalog_commands: {
        Row: {
          completed_at: string | null;
          created_at: string;
          created_by_user_id: string;
          id: string;
          idempotency_key: string;
          operation: string;
          organization_id: string;
          request_fingerprint: string;
          request_payload: Json;
          result_payload: Json | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          created_by_user_id: string;
          id?: string;
          idempotency_key: string;
          operation: string;
          organization_id: string;
          request_fingerprint: string;
          request_payload: Json;
          result_payload?: Json | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string;
          id?: string;
          idempotency_key?: string;
          operation?: string;
          organization_id?: string;
          request_fingerprint?: string;
          request_payload?: Json;
          result_payload?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_catalog_commands_created_by_user_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "admin_catalog_commands_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_commands: {
        Row: {
          completed_at: string | null;
          created_at: string;
          created_by_user_id: string | null;
          id: string;
          idempotency_key: string;
          operation: string;
          organization_id: string;
          request_fingerprint: string;
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
          result_id?: string | null;
          result_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_commands_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "agent_commands_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_jobs: {
        Row: {
          attempt_count: number;
          available_at: string;
          checkpoint_hash: string | null;
          checkpoint_reference: string | null;
          checkpoint_sequence: number;
          completed_at: string | null;
          created_at: string;
          external_effect_state: string;
          id: string;
          idempotency_key: string;
          job_kind: string;
          last_error_code: string | null;
          lease_expires_at: string | null;
          lease_token: string | null;
          max_attempts: number;
          organization_id: string;
          payload_safe: Json;
          priority: number;
          run_id: string;
          started_at: string | null;
          status: string;
          updated_at: string;
          worker_id: string | null;
        };
        Insert: {
          attempt_count?: number;
          available_at?: string;
          checkpoint_hash?: string | null;
          checkpoint_reference?: string | null;
          checkpoint_sequence?: number;
          completed_at?: string | null;
          created_at?: string;
          external_effect_state?: string;
          id?: string;
          idempotency_key: string;
          job_kind: string;
          last_error_code?: string | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          max_attempts: number;
          organization_id: string;
          payload_safe?: Json;
          priority?: number;
          run_id: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          worker_id?: string | null;
        };
        Update: {
          attempt_count?: number;
          available_at?: string;
          checkpoint_hash?: string | null;
          checkpoint_reference?: string | null;
          checkpoint_sequence?: number;
          completed_at?: string | null;
          created_at?: string;
          external_effect_state?: string;
          id?: string;
          idempotency_key?: string;
          job_kind?: string;
          last_error_code?: string | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          max_attempts?: number;
          organization_id?: string;
          payload_safe?: Json;
          priority?: number;
          run_id?: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          worker_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_jobs_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_jobs_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: true;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      agent_messages: {
        Row: {
          channel_connection_id: string | null;
          content: Json;
          content_hash: string;
          conversation_id: string | null;
          created_at: string;
          domain_message_id: string | null;
          id: string;
          message_key: string;
          message_kind: string;
          message_role: string;
          organization_id: string;
          provider_item_id: string | null;
          run_id: string;
          sequence_number: number;
          trust_level: string;
        };
        Insert: {
          channel_connection_id?: string | null;
          content: Json;
          content_hash: string;
          conversation_id?: string | null;
          created_at?: string;
          domain_message_id?: string | null;
          id?: string;
          message_key: string;
          message_kind: string;
          message_role: string;
          organization_id: string;
          provider_item_id?: string | null;
          run_id: string;
          sequence_number: number;
          trust_level: string;
        };
        Update: {
          channel_connection_id?: string | null;
          content?: Json;
          content_hash?: string;
          conversation_id?: string | null;
          created_at?: string;
          domain_message_id?: string | null;
          id?: string;
          message_key?: string;
          message_kind?: string;
          message_role?: string;
          organization_id?: string;
          provider_item_id?: string | null;
          run_id?: string;
          sequence_number?: number;
          trust_level?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_messages_domain_message_fk";
            columns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "domain_message_id",
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
            foreignKeyName: "agent_messages_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_messages_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      agent_policies: {
        Row: {
          created_at: string;
          created_by_user_id: string;
          current_version_id: string | null;
          display_name: string;
          id: string;
          organization_id: string;
          policy_key: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id: string;
          current_version_id?: string | null;
          display_name: string;
          id?: string;
          organization_id: string;
          policy_key: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string;
          current_version_id?: string | null;
          display_name?: string;
          id?: string;
          organization_id?: string;
          policy_key?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_policies_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "agent_policies_current_version_fk";
            columns: ["organization_id", "id", "current_version_id"];
            isOneToOne: false;
            referencedRelation: "agent_policy_versions";
            referencedColumns: ["organization_id", "policy_id", "id"];
          },
          {
            foreignKeyName: "agent_policies_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_policy_tools: {
        Row: {
          allowed_actor_kinds: string[];
          allowed_channels: string[];
          authorization_constraints: Json;
          created_at: string;
          id: string;
          organization_id: string;
          policy_version_id: string;
          required_membership_roles: string[];
          tool_contract_id: string;
          tool_contract_version_id: string;
        };
        Insert: {
          allowed_actor_kinds: string[];
          allowed_channels?: string[];
          authorization_constraints?: Json;
          created_at?: string;
          id?: string;
          organization_id: string;
          policy_version_id: string;
          required_membership_roles?: string[];
          tool_contract_id: string;
          tool_contract_version_id: string;
        };
        Update: {
          allowed_actor_kinds?: string[];
          allowed_channels?: string[];
          authorization_constraints?: Json;
          created_at?: string;
          id?: string;
          organization_id?: string;
          policy_version_id?: string;
          required_membership_roles?: string[];
          tool_contract_id?: string;
          tool_contract_version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_policy_tools_contract_version_fk";
            columns: ["organization_id", "tool_contract_id", "tool_contract_version_id"];
            isOneToOne: false;
            referencedRelation: "tool_contract_versions";
            referencedColumns: ["organization_id", "tool_contract_id", "id"];
          },
          {
            foreignKeyName: "agent_policy_tools_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_policy_tools_policy_version_fk";
            columns: ["organization_id", "policy_version_id"];
            isOneToOne: false;
            referencedRelation: "agent_policy_versions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      agent_policy_versions: {
        Row: {
          cache_mode: string;
          cost_currency: string | null;
          created_at: string;
          created_by_user_id: string;
          fallback_models: Json;
          id: string;
          max_cost_amount: number | null;
          max_parallel_tools: number;
          max_provider_attempts: number;
          max_tool_rounds: number;
          organization_id: string;
          policy_hash: string;
          policy_id: string;
          prompt_version_id: string;
          turn_timeout_ms: number;
          unknown_cost_behavior: string;
          version_number: number;
        };
        Insert: {
          cache_mode: string;
          cost_currency?: string | null;
          created_at?: string;
          created_by_user_id: string;
          fallback_models?: Json;
          id?: string;
          max_cost_amount?: number | null;
          max_parallel_tools: number;
          max_provider_attempts: number;
          max_tool_rounds: number;
          organization_id: string;
          policy_hash: string;
          policy_id: string;
          prompt_version_id: string;
          turn_timeout_ms: number;
          unknown_cost_behavior: string;
          version_number: number;
        };
        Update: {
          cache_mode?: string;
          cost_currency?: string | null;
          created_at?: string;
          created_by_user_id?: string;
          fallback_models?: Json;
          id?: string;
          max_cost_amount?: number | null;
          max_parallel_tools?: number;
          max_provider_attempts?: number;
          max_tool_rounds?: number;
          organization_id?: string;
          policy_hash?: string;
          policy_id?: string;
          prompt_version_id?: string;
          turn_timeout_ms?: number;
          unknown_cost_behavior?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "agent_policy_versions_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "agent_policy_versions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_policy_versions_policy_fk";
            columns: ["organization_id", "policy_id"];
            isOneToOne: false;
            referencedRelation: "agent_policies";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "agent_policy_versions_prompt_fk";
            columns: ["organization_id", "prompt_version_id"];
            isOneToOne: false;
            referencedRelation: "prompt_versions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      agent_run_configurations: {
        Row: {
          configuration_id: string;
          configuration_version_id: string;
          created_at: string;
          id: string;
          organization_id: string;
          run_id: string;
        };
        Insert: {
          configuration_id: string;
          configuration_version_id: string;
          created_at?: string;
          id?: string;
          organization_id: string;
          run_id: string;
        };
        Update: {
          configuration_id?: string;
          configuration_version_id?: string;
          created_at?: string;
          id?: string;
          organization_id?: string;
          run_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_run_configurations_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_run_configurations_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "agent_run_configurations_version_fk";
            columns: ["organization_id", "configuration_id", "configuration_version_id"];
            isOneToOne: false;
            referencedRelation: "business_configuration_versions";
            referencedColumns: ["organization_id", "configuration_id", "id"];
          },
        ];
      };
      agent_runs: {
        Row: {
          actor_channel_identity_id: string | null;
          actor_kind: string;
          actor_user_id: string | null;
          budget_status: string;
          cache_key_hash: string | null;
          cache_mode: string;
          channel_connection_id: string | null;
          completed_at: string | null;
          continuation_sequence: number;
          conversation_id: string | null;
          conversation_snapshot_id: string | null;
          correlation_id: string;
          cost_currency: string | null;
          created_at: string;
          fallback_models: Json;
          id: string;
          last_termination_reason: string | null;
          max_cost_amount: number | null;
          max_parallel_tools: number;
          max_provider_attempts: number;
          max_tool_rounds: number;
          model: string;
          organization_id: string;
          policy_version_id: string;
          provider: string;
          provider_attempt_count: number;
          provider_state_hash: string | null;
          provider_state_reference: string | null;
          reasoning_effort: string | null;
          run_key: string;
          run_kind: string;
          source_inbound_event_id: string | null;
          started_at: string | null;
          status: string;
          tool_round_count: number;
          trace_id: string | null;
          trigger_message_id: string | null;
          turn_timeout_ms: number;
          unknown_cost_behavior: string;
          updated_at: string;
          vision_model: string | null;
          vision_provider: string | null;
        };
        Insert: {
          actor_channel_identity_id?: string | null;
          actor_kind: string;
          actor_user_id?: string | null;
          budget_status?: string;
          cache_key_hash?: string | null;
          cache_mode: string;
          channel_connection_id?: string | null;
          completed_at?: string | null;
          continuation_sequence?: number;
          conversation_id?: string | null;
          conversation_snapshot_id?: string | null;
          correlation_id: string;
          cost_currency?: string | null;
          created_at?: string;
          fallback_models: Json;
          id?: string;
          last_termination_reason?: string | null;
          max_cost_amount?: number | null;
          max_parallel_tools: number;
          max_provider_attempts: number;
          max_tool_rounds: number;
          model: string;
          organization_id: string;
          policy_version_id: string;
          provider: string;
          provider_attempt_count?: number;
          provider_state_hash?: string | null;
          provider_state_reference?: string | null;
          reasoning_effort?: string | null;
          run_key: string;
          run_kind: string;
          source_inbound_event_id?: string | null;
          started_at?: string | null;
          status?: string;
          tool_round_count?: number;
          trace_id?: string | null;
          trigger_message_id?: string | null;
          turn_timeout_ms: number;
          unknown_cost_behavior: string;
          updated_at?: string;
          vision_model?: string | null;
          vision_provider?: string | null;
        };
        Update: {
          actor_channel_identity_id?: string | null;
          actor_kind?: string;
          actor_user_id?: string | null;
          budget_status?: string;
          cache_key_hash?: string | null;
          cache_mode?: string;
          channel_connection_id?: string | null;
          completed_at?: string | null;
          continuation_sequence?: number;
          conversation_id?: string | null;
          conversation_snapshot_id?: string | null;
          correlation_id?: string;
          cost_currency?: string | null;
          created_at?: string;
          fallback_models?: Json;
          id?: string;
          last_termination_reason?: string | null;
          max_cost_amount?: number | null;
          max_parallel_tools?: number;
          max_provider_attempts?: number;
          max_tool_rounds?: number;
          model?: string;
          organization_id?: string;
          policy_version_id?: string;
          provider?: string;
          provider_attempt_count?: number;
          provider_state_hash?: string | null;
          provider_state_reference?: string | null;
          reasoning_effort?: string | null;
          run_key?: string;
          run_kind?: string;
          source_inbound_event_id?: string | null;
          started_at?: string | null;
          status?: string;
          tool_round_count?: number;
          trace_id?: string | null;
          trigger_message_id?: string | null;
          turn_timeout_ms?: number;
          unknown_cost_behavior?: string;
          updated_at?: string;
          vision_model?: string | null;
          vision_provider?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_runs_actor_channel_identity_fk";
            columns: ["organization_id", "channel_connection_id", "actor_channel_identity_id"];
            isOneToOne: false;
            referencedRelation: "channel_identities";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "agent_runs_actor_user_fk";
            columns: ["organization_id", "actor_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "agent_runs_channel_connection_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "agent_runs_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "agent_runs_conversation_snapshot_fk";
            columns: ["organization_id", "conversation_snapshot_id"];
            isOneToOne: false;
            referencedRelation: "conversation_agent_snapshots";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "agent_runs_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_runs_policy_fk";
            columns: ["organization_id", "policy_version_id"];
            isOneToOne: false;
            referencedRelation: "agent_policy_versions";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "agent_runs_source_inbound_event_fk";
            columns: ["organization_id", "channel_connection_id", "source_inbound_event_id"];
            isOneToOne: false;
            referencedRelation: "inbound_events";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "agent_runs_trigger_message_fk";
            columns: [
              "organization_id",
              "channel_connection_id",
              "conversation_id",
              "trigger_message_id",
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
        ];
      };
      audit_events: {
        Row: {
          actor_kind: string;
          actor_user_id: string | null;
          configuration_id: string | null;
          configuration_version_id: string | null;
          correlation_id: string;
          event_type: string;
          id: string;
          job_attempt_id: string | null;
          job_id: string | null;
          metadata_safe: Json;
          occurred_at: string;
          organization_id: string;
          outbox_channel_connection_id: string | null;
          outbox_event_id: string | null;
          run_id: string | null;
          tool_execution_id: string | null;
          trace_id: string | null;
        };
        Insert: {
          actor_kind: string;
          actor_user_id?: string | null;
          configuration_id?: string | null;
          configuration_version_id?: string | null;
          correlation_id: string;
          event_type: string;
          id?: string;
          job_attempt_id?: string | null;
          job_id?: string | null;
          metadata_safe?: Json;
          occurred_at?: string;
          organization_id: string;
          outbox_channel_connection_id?: string | null;
          outbox_event_id?: string | null;
          run_id?: string | null;
          tool_execution_id?: string | null;
          trace_id?: string | null;
        };
        Update: {
          actor_kind?: string;
          actor_user_id?: string | null;
          configuration_id?: string | null;
          configuration_version_id?: string | null;
          correlation_id?: string;
          event_type?: string;
          id?: string;
          job_attempt_id?: string | null;
          job_id?: string | null;
          metadata_safe?: Json;
          occurred_at?: string;
          organization_id?: string;
          outbox_channel_connection_id?: string | null;
          outbox_event_id?: string | null;
          run_id?: string | null;
          tool_execution_id?: string | null;
          trace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_user_fk";
            columns: ["organization_id", "actor_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "audit_events_attempt_fk";
            columns: ["organization_id", "job_attempt_id"];
            isOneToOne: false;
            referencedRelation: "job_attempts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "audit_events_configuration_fk";
            columns: ["organization_id", "configuration_id", "configuration_version_id"];
            isOneToOne: false;
            referencedRelation: "business_configuration_versions";
            referencedColumns: ["organization_id", "configuration_id", "id"];
          },
          {
            foreignKeyName: "audit_events_job_fk";
            columns: ["organization_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "agent_jobs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "audit_events_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_events_outbox_fk";
            columns: ["organization_id", "outbox_channel_connection_id", "outbox_event_id"];
            isOneToOne: false;
            referencedRelation: "outbox_events";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "audit_events_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "audit_events_tool_fk";
            columns: ["organization_id", "tool_execution_id"];
            isOneToOne: false;
            referencedRelation: "tool_executions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      business_configuration_versions: {
        Row: {
          configuration_id: string;
          created_at: string;
          created_by_user_id: string;
          document: Json;
          document_hash: string;
          id: string;
          organization_id: string;
          schema_key: string;
          schema_version: number;
          source_version_id: string | null;
          validation_contract: string;
          version_number: number;
        };
        Insert: {
          configuration_id: string;
          created_at?: string;
          created_by_user_id: string;
          document: Json;
          document_hash: string;
          id?: string;
          organization_id: string;
          schema_key: string;
          schema_version: number;
          source_version_id?: string | null;
          validation_contract: string;
          version_number: number;
        };
        Update: {
          configuration_id?: string;
          created_at?: string;
          created_by_user_id?: string;
          document?: Json;
          document_hash?: string;
          id?: string;
          organization_id?: string;
          schema_key?: string;
          schema_version?: number;
          source_version_id?: string | null;
          validation_contract?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "business_configuration_versions_configuration_fk";
            columns: ["organization_id", "configuration_id"];
            isOneToOne: false;
            referencedRelation: "business_configurations";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "business_configuration_versions_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "business_configuration_versions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_configuration_versions_source_fk";
            columns: ["organization_id", "configuration_id", "source_version_id"];
            isOneToOne: false;
            referencedRelation: "business_configuration_versions";
            referencedColumns: ["organization_id", "configuration_id", "id"];
          },
        ];
      };
      business_configurations: {
        Row: {
          configuration_key: string;
          created_at: string;
          created_by_user_id: string;
          current_version_id: string | null;
          display_name: string;
          id: string;
          organization_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          configuration_key: string;
          created_at?: string;
          created_by_user_id: string;
          current_version_id?: string | null;
          display_name: string;
          id?: string;
          organization_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          configuration_key?: string;
          created_at?: string;
          created_by_user_id?: string;
          current_version_id?: string | null;
          display_name?: string;
          id?: string;
          organization_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_configurations_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "business_configurations_current_version_fk";
            columns: ["organization_id", "id", "current_version_id"];
            isOneToOne: false;
            referencedRelation: "business_configuration_versions";
            referencedColumns: ["organization_id", "configuration_id", "id"];
          },
          {
            foreignKeyName: "business_configurations_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
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
          meta_application_id: string | null;
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
          meta_application_id?: string | null;
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
          meta_application_id?: string | null;
          organization_id?: string;
          provider?: string;
          status?: string;
          updated_at?: string;
          webhook_secret_reference?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "channel_connections_meta_application_fk";
            columns: ["organization_id", "meta_application_id", "external_app_id"];
            isOneToOne: false;
            referencedRelation: "meta_applications";
            referencedColumns: ["organization_id", "id", "external_app_id"];
          },
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
      conversation_agent_snapshots: {
        Row: {
          actor_kind: string;
          actor_lane_enforced: boolean;
          channel_connection_id: string;
          configuration_snapshot: Json;
          conversation_id: string;
          created_at: string;
          id: string;
          organization_id: string;
          policy_version_id: string;
        };
        Insert: {
          actor_kind: string;
          actor_lane_enforced: boolean;
          channel_connection_id: string;
          configuration_snapshot: Json;
          conversation_id: string;
          created_at?: string;
          id?: string;
          organization_id: string;
          policy_version_id: string;
        };
        Update: {
          actor_kind?: string;
          actor_lane_enforced?: boolean;
          channel_connection_id?: string;
          configuration_snapshot?: Json;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          organization_id?: string;
          policy_version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_agent_snapshots_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "conversation_agent_snapshots_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_agent_snapshots_policy_fk";
            columns: ["organization_id", "policy_version_id"];
            isOneToOne: false;
            referencedRelation: "agent_policy_versions";
            referencedColumns: ["organization_id", "id"];
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
      error_events: {
        Row: {
          detail_reference: string | null;
          error_category: string;
          error_code: string;
          error_key: string;
          id: string;
          job_attempt_id: string | null;
          job_id: string | null;
          occurred_at: string;
          organization_id: string;
          provider: string | null;
          provider_request_id: string | null;
          retryable: boolean;
          run_id: string | null;
          severity: string;
          summary_redacted: string;
          tool_execution_id: string | null;
        };
        Insert: {
          detail_reference?: string | null;
          error_category: string;
          error_code: string;
          error_key: string;
          id?: string;
          job_attempt_id?: string | null;
          job_id?: string | null;
          occurred_at?: string;
          organization_id: string;
          provider?: string | null;
          provider_request_id?: string | null;
          retryable: boolean;
          run_id?: string | null;
          severity: string;
          summary_redacted: string;
          tool_execution_id?: string | null;
        };
        Update: {
          detail_reference?: string | null;
          error_category?: string;
          error_code?: string;
          error_key?: string;
          id?: string;
          job_attempt_id?: string | null;
          job_id?: string | null;
          occurred_at?: string;
          organization_id?: string;
          provider?: string | null;
          provider_request_id?: string | null;
          retryable?: boolean;
          run_id?: string | null;
          severity?: string;
          summary_redacted?: string;
          tool_execution_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "error_events_attempt_fk";
            columns: ["organization_id", "job_attempt_id"];
            isOneToOne: false;
            referencedRelation: "job_attempts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "error_events_job_fk";
            columns: ["organization_id", "job_id"];
            isOneToOne: false;
            referencedRelation: "agent_jobs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "error_events_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "error_events_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "error_events_tool_fk";
            columns: ["organization_id", "tool_execution_id"];
            isOneToOne: false;
            referencedRelation: "tool_executions";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      facebook_page_credentials: {
        Row: {
          activated_at: string;
          created_at: string;
          created_by_user_id: string | null;
          data_access_expires_at: string | null;
          id: string;
          meta_application_id: string;
          organization_id: string;
          revoked_at: string | null;
          social_connection_id: string;
          status: string;
          token_expires_at: string | null;
          vault_secret_id: string;
          version_number: number;
        };
        Insert: {
          activated_at?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          data_access_expires_at?: string | null;
          id?: string;
          meta_application_id: string;
          organization_id: string;
          revoked_at?: string | null;
          social_connection_id: string;
          status?: string;
          token_expires_at?: string | null;
          vault_secret_id: string;
          version_number?: number;
        };
        Update: {
          activated_at?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          data_access_expires_at?: string | null;
          id?: string;
          meta_application_id?: string;
          organization_id?: string;
          revoked_at?: string | null;
          social_connection_id?: string;
          status?: string;
          token_expires_at?: string | null;
          vault_secret_id?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "facebook_page_credentials_application_fk";
            columns: ["organization_id", "meta_application_id"];
            isOneToOne: false;
            referencedRelation: "meta_applications";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "facebook_page_credentials_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      facebook_page_oauth_sessions: {
        Row: {
          actor_user_id: string;
          completed_at: string | null;
          created_at: string;
          exchange_lease_expires_at: string | null;
          exchange_lease_token: string | null;
          expires_at: string;
          id: string;
          meta_application_id: string;
          organization_id: string;
          page_candidates: Json;
          redirect_uri: string;
          state_sha256: string;
          status: string;
          token_bundle_vault_secret_id: string | null;
          updated_at: string;
        };
        Insert: {
          actor_user_id: string;
          completed_at?: string | null;
          created_at?: string;
          exchange_lease_expires_at?: string | null;
          exchange_lease_token?: string | null;
          expires_at: string;
          id?: string;
          meta_application_id: string;
          organization_id: string;
          page_candidates?: Json;
          redirect_uri: string;
          state_sha256: string;
          status?: string;
          token_bundle_vault_secret_id?: string | null;
          updated_at?: string;
        };
        Update: {
          actor_user_id?: string;
          completed_at?: string | null;
          created_at?: string;
          exchange_lease_expires_at?: string | null;
          exchange_lease_token?: string | null;
          expires_at?: string;
          id?: string;
          meta_application_id?: string;
          organization_id?: string;
          page_candidates?: Json;
          redirect_uri?: string;
          state_sha256?: string;
          status?: string;
          token_bundle_vault_secret_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facebook_page_oauth_sessions_application_fk";
            columns: ["organization_id", "meta_application_id"];
            isOneToOne: false;
            referencedRelation: "meta_applications";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "facebook_page_oauth_sessions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
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
          lease_expires_at: string | null;
          lease_owner: string | null;
          lease_token: string | null;
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
          lease_expires_at?: string | null;
          lease_owner?: string | null;
          lease_token?: string | null;
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
          lease_expires_at?: string | null;
          lease_owner?: string | null;
          lease_token?: string | null;
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
      job_attempts: {
        Row: {
          attempt_number: number;
          completed_at: string | null;
          disposition: string | null;
          fallback_ordinal: number;
          id: string;
          job_id: string;
          lease_token: string;
          model: string;
          organization_id: string;
          provider: string;
          provider_request_id: string | null;
          request_metadata_safe: Json;
          response_metadata_safe: Json;
          run_id: string;
          started_at: string;
          status: string;
          termination_reason: string | null;
          worker_id: string;
        };
        Insert: {
          attempt_number: number;
          completed_at?: string | null;
          disposition?: string | null;
          fallback_ordinal?: number;
          id?: string;
          job_id: string;
          lease_token: string;
          model: string;
          organization_id: string;
          provider: string;
          provider_request_id?: string | null;
          request_metadata_safe?: Json;
          response_metadata_safe?: Json;
          run_id: string;
          started_at?: string;
          status?: string;
          termination_reason?: string | null;
          worker_id: string;
        };
        Update: {
          attempt_number?: number;
          completed_at?: string | null;
          disposition?: string | null;
          fallback_ordinal?: number;
          id?: string;
          job_id?: string;
          lease_token?: string;
          model?: string;
          organization_id?: string;
          provider?: string;
          provider_request_id?: string | null;
          request_metadata_safe?: Json;
          response_metadata_safe?: Json;
          run_id?: string;
          started_at?: string;
          status?: string;
          termination_reason?: string | null;
          worker_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_attempts_job_run_fk";
            columns: ["organization_id", "job_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_jobs";
            referencedColumns: ["organization_id", "id", "run_id"];
          },
          {
            foreignKeyName: "job_attempts_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
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
      media_asset_objects: {
        Row: {
          bucket_id: string;
          byte_size: number;
          content_sha256: string;
          created_at: string;
          derivation_spec: Json;
          height_pixels: number;
          id: string;
          media_asset_id: string;
          mime_type: string;
          object_path: string;
          organization_id: string;
          published_at: string | null;
          rendition_kind: string;
          retired_at: string | null;
          status: string;
          updated_at: string;
          verified_at: string;
          width_pixels: number;
        };
        Insert: {
          bucket_id: string;
          byte_size: number;
          content_sha256: string;
          created_at?: string;
          derivation_spec?: Json;
          height_pixels: number;
          id?: string;
          media_asset_id: string;
          mime_type: string;
          object_path: string;
          organization_id: string;
          published_at?: string | null;
          rendition_kind: string;
          retired_at?: string | null;
          status: string;
          updated_at?: string;
          verified_at?: string;
          width_pixels: number;
        };
        Update: {
          bucket_id?: string;
          byte_size?: number;
          content_sha256?: string;
          created_at?: string;
          derivation_spec?: Json;
          height_pixels?: number;
          id?: string;
          media_asset_id?: string;
          mime_type?: string;
          object_path?: string;
          organization_id?: string;
          published_at?: string | null;
          rendition_kind?: string;
          retired_at?: string | null;
          status?: string;
          updated_at?: string;
          verified_at?: string;
          width_pixels?: number;
        };
        Relationships: [
          {
            foreignKeyName: "media_asset_objects_asset_fk";
            columns: ["organization_id", "media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
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
      media_ingest_requests: {
        Row: {
          attempt_count: number;
          available_at: string;
          channel_connection_id: string;
          completed_at: string | null;
          created_at: string;
          declared_file_size: number | null;
          declared_mime_type: string | null;
          declared_sha256_hex: string | null;
          id: string;
          last_error_code: string | null;
          lease_expires_at: string | null;
          lease_owner: string | null;
          lease_token: string | null;
          media_asset_id: string | null;
          message_id: string;
          organization_id: string;
          processing_started_at: string | null;
          provider_media_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          available_at?: string;
          channel_connection_id: string;
          completed_at?: string | null;
          created_at?: string;
          declared_file_size?: number | null;
          declared_mime_type?: string | null;
          declared_sha256_hex?: string | null;
          id?: string;
          last_error_code?: string | null;
          lease_expires_at?: string | null;
          lease_owner?: string | null;
          lease_token?: string | null;
          media_asset_id?: string | null;
          message_id: string;
          organization_id: string;
          processing_started_at?: string | null;
          provider_media_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          available_at?: string;
          channel_connection_id?: string;
          completed_at?: string | null;
          created_at?: string;
          declared_file_size?: number | null;
          declared_mime_type?: string | null;
          declared_sha256_hex?: string | null;
          id?: string;
          last_error_code?: string | null;
          lease_expires_at?: string | null;
          lease_owner?: string | null;
          lease_token?: string | null;
          media_asset_id?: string | null;
          message_id?: string;
          organization_id?: string;
          processing_started_at?: string | null;
          provider_media_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_ingest_requests_asset_fk";
            columns: ["organization_id", "media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "media_ingest_requests_connection_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "media_ingest_requests_message_fk";
            columns: ["organization_id", "channel_connection_id", "message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
        ];
      };
      memory_entries: {
        Row: {
          channel_connection_id: string | null;
          content: Json;
          content_hash: string;
          conversation_id: string | null;
          created_at: string;
          expires_at: string | null;
          id: string;
          organization_id: string;
          provenance_safe: Json;
          revoked_at: string | null;
          run_id: string;
          scope_key: string;
          scope_kind: string;
          source_agent_message_id: string | null;
          source_tool_execution_id: string | null;
          status: string;
          trust_level: string;
        };
        Insert: {
          channel_connection_id?: string | null;
          content: Json;
          content_hash: string;
          conversation_id?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          organization_id: string;
          provenance_safe?: Json;
          revoked_at?: string | null;
          run_id: string;
          scope_key: string;
          scope_kind: string;
          source_agent_message_id?: string | null;
          source_tool_execution_id?: string | null;
          status?: string;
          trust_level: string;
        };
        Update: {
          channel_connection_id?: string | null;
          content?: Json;
          content_hash?: string;
          conversation_id?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          organization_id?: string;
          provenance_safe?: Json;
          revoked_at?: string | null;
          run_id?: string;
          scope_key?: string;
          scope_kind?: string;
          source_agent_message_id?: string | null;
          source_tool_execution_id?: string | null;
          status?: string;
          trust_level?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memory_entries_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "memory_entries_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memory_entries_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "memory_entries_source_message_fk";
            columns: ["organization_id", "source_agent_message_id"];
            isOneToOne: false;
            referencedRelation: "agent_messages";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "memory_entries_source_tool_fk";
            columns: ["organization_id", "source_tool_execution_id"];
            isOneToOne: false;
            referencedRelation: "tool_executions";
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
      meta_applications: {
        Row: {
          api_version: string;
          created_at: string;
          created_by_user_id: string | null;
          disabled_at: string | null;
          display_name: string;
          external_app_id: string;
          id: string;
          organization_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          api_version: string;
          created_at?: string;
          created_by_user_id?: string | null;
          disabled_at?: string | null;
          display_name: string;
          external_app_id: string;
          id?: string;
          organization_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          api_version?: string;
          created_at?: string;
          created_by_user_id?: string | null;
          disabled_at?: string | null;
          display_name?: string;
          external_app_id?: string;
          id?: string;
          organization_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meta_applications_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      meta_credential_versions: {
        Row: {
          activated_at: string;
          channel_connection_id: string | null;
          created_at: string;
          created_by_user_id: string | null;
          credential_kind: string;
          id: string;
          meta_application_id: string;
          organization_id: string;
          retire_after: string | null;
          revoked_at: string | null;
          status: string;
          vault_secret_id: string;
          version_number: number;
          webhook_endpoint_id: string | null;
        };
        Insert: {
          activated_at?: string;
          channel_connection_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          credential_kind: string;
          id?: string;
          meta_application_id: string;
          organization_id: string;
          retire_after?: string | null;
          revoked_at?: string | null;
          status?: string;
          vault_secret_id: string;
          version_number: number;
          webhook_endpoint_id?: string | null;
        };
        Update: {
          activated_at?: string;
          channel_connection_id?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          credential_kind?: string;
          id?: string;
          meta_application_id?: string;
          organization_id?: string;
          retire_after?: string | null;
          revoked_at?: string | null;
          status?: string;
          vault_secret_id?: string;
          version_number?: number;
          webhook_endpoint_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meta_credential_versions_application_fk";
            columns: ["organization_id", "meta_application_id"];
            isOneToOne: false;
            referencedRelation: "meta_applications";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "meta_credential_versions_channel_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "meta_credential_versions_webhook_fk";
            columns: ["organization_id", "meta_application_id", "webhook_endpoint_id"];
            isOneToOne: false;
            referencedRelation: "meta_webhook_endpoints";
            referencedColumns: ["organization_id", "meta_application_id", "id"];
          },
        ];
      };
      meta_webhook_deliveries: {
        Row: {
          attempt_count: number;
          available_at: string;
          completed_at: string | null;
          delivery_count: number;
          first_received_at: string;
          first_request_id: string;
          first_trace_id: string | null;
          id: string;
          initial_credential_version_id: string;
          last_error_code: string | null;
          last_received_at: string;
          latest_credential_version_id: string;
          latest_request_id: string;
          latest_trace_id: string | null;
          lease_expires_at: string | null;
          lease_owner: string | null;
          lease_token: string | null;
          meta_application_id: string;
          organization_id: string;
          payload: Json;
          payload_sha256: string;
          processing_started_at: string | null;
          provider_object_type: string;
          signature_verified_at: string;
          status: string;
          updated_at: string;
          webhook_endpoint_id: string;
        };
        Insert: {
          attempt_count?: number;
          available_at?: string;
          completed_at?: string | null;
          delivery_count?: number;
          first_received_at?: string;
          first_request_id: string;
          first_trace_id?: string | null;
          id?: string;
          initial_credential_version_id: string;
          last_error_code?: string | null;
          last_received_at?: string;
          latest_credential_version_id: string;
          latest_request_id: string;
          latest_trace_id?: string | null;
          lease_expires_at?: string | null;
          lease_owner?: string | null;
          lease_token?: string | null;
          meta_application_id: string;
          organization_id: string;
          payload: Json;
          payload_sha256: string;
          processing_started_at?: string | null;
          provider_object_type: string;
          signature_verified_at?: string;
          status?: string;
          updated_at?: string;
          webhook_endpoint_id: string;
        };
        Update: {
          attempt_count?: number;
          available_at?: string;
          completed_at?: string | null;
          delivery_count?: number;
          first_received_at?: string;
          first_request_id?: string;
          first_trace_id?: string | null;
          id?: string;
          initial_credential_version_id?: string;
          last_error_code?: string | null;
          last_received_at?: string;
          latest_credential_version_id?: string;
          latest_request_id?: string;
          latest_trace_id?: string | null;
          lease_expires_at?: string | null;
          lease_owner?: string | null;
          lease_token?: string | null;
          meta_application_id?: string;
          organization_id?: string;
          payload?: Json;
          payload_sha256?: string;
          processing_started_at?: string | null;
          provider_object_type?: string;
          signature_verified_at?: string;
          status?: string;
          updated_at?: string;
          webhook_endpoint_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meta_webhook_deliveries_application_fk";
            columns: ["organization_id", "meta_application_id"];
            isOneToOne: false;
            referencedRelation: "meta_applications";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "meta_webhook_deliveries_endpoint_fk";
            columns: ["organization_id", "meta_application_id", "webhook_endpoint_id"];
            isOneToOne: false;
            referencedRelation: "meta_webhook_endpoints";
            referencedColumns: ["organization_id", "meta_application_id", "id"];
          },
          {
            foreignKeyName: "meta_webhook_deliveries_initial_credential_fk";
            columns: ["organization_id", "meta_application_id", "initial_credential_version_id"];
            isOneToOne: false;
            referencedRelation: "meta_credential_versions";
            referencedColumns: ["organization_id", "meta_application_id", "id"];
          },
          {
            foreignKeyName: "meta_webhook_deliveries_latest_credential_fk";
            columns: ["organization_id", "meta_application_id", "latest_credential_version_id"];
            isOneToOne: false;
            referencedRelation: "meta_credential_versions";
            referencedColumns: ["organization_id", "meta_application_id", "id"];
          },
        ];
      };
      meta_webhook_endpoints: {
        Row: {
          created_at: string;
          disabled_at: string | null;
          endpoint_key: string;
          id: string;
          last_challenge_at: string | null;
          meta_application_id: string;
          organization_id: string;
          status: string;
          updated_at: string;
          verified_at: string | null;
        };
        Insert: {
          created_at?: string;
          disabled_at?: string | null;
          endpoint_key?: string;
          id?: string;
          last_challenge_at?: string | null;
          meta_application_id: string;
          organization_id: string;
          status?: string;
          updated_at?: string;
          verified_at?: string | null;
        };
        Update: {
          created_at?: string;
          disabled_at?: string | null;
          endpoint_key?: string;
          id?: string;
          last_challenge_at?: string | null;
          meta_application_id?: string;
          organization_id?: string;
          status?: string;
          updated_at?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meta_webhook_endpoints_application_fk";
            columns: ["organization_id", "meta_application_id"];
            isOneToOne: false;
            referencedRelation: "meta_applications";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      meta_whatsapp_connection_profiles: {
        Row: {
          channel_connection_id: string;
          created_at: string;
          data_access_expires_at: string | null;
          display_phone_number: string;
          granted_scopes: string[];
          last_validated_at: string;
          name_status: string | null;
          organization_id: string;
          quality_rating: string | null;
          subscribed_at: string;
          token_expires_at: string | null;
          token_type: string;
          updated_at: string;
          verified_name: string;
        };
        Insert: {
          channel_connection_id: string;
          created_at?: string;
          data_access_expires_at?: string | null;
          display_phone_number: string;
          granted_scopes: string[];
          last_validated_at?: string;
          name_status?: string | null;
          organization_id: string;
          quality_rating?: string | null;
          subscribed_at?: string;
          token_expires_at?: string | null;
          token_type: string;
          updated_at?: string;
          verified_name: string;
        };
        Update: {
          channel_connection_id?: string;
          created_at?: string;
          data_access_expires_at?: string | null;
          display_phone_number?: string;
          granted_scopes?: string[];
          last_validated_at?: string;
          name_status?: string | null;
          organization_id?: string;
          quality_rating?: string | null;
          subscribed_at?: string;
          token_expires_at?: string | null;
          token_type?: string;
          updated_at?: string;
          verified_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meta_whatsapp_profiles_channel_fk";
            columns: ["organization_id", "channel_connection_id"];
            isOneToOne: false;
            referencedRelation: "channel_connections";
            referencedColumns: ["organization_id", "id"];
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
          lease_owner: string | null;
          lease_token: string | null;
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
          lease_owner?: string | null;
          lease_token?: string | null;
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
          lease_owner?: string | null;
          lease_token?: string | null;
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
      product_media: {
        Row: {
          alt_text: string | null;
          approved_at: string | null;
          approved_by_user_id: string | null;
          created_at: string;
          created_by_user_id: string;
          id: string;
          media_asset_id: string;
          media_role: string;
          ordinal: number;
          organization_id: string;
          product_id: string;
          retired_at: string | null;
          status: string;
          updated_at: string;
          variant_id: string | null;
        };
        Insert: {
          alt_text?: string | null;
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          created_at?: string;
          created_by_user_id: string;
          id?: string;
          media_asset_id: string;
          media_role?: string;
          ordinal: number;
          organization_id: string;
          product_id: string;
          retired_at?: string | null;
          status?: string;
          updated_at?: string;
          variant_id?: string | null;
        };
        Update: {
          alt_text?: string | null;
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          created_at?: string;
          created_by_user_id?: string;
          id?: string;
          media_asset_id?: string;
          media_role?: string;
          ordinal?: number;
          organization_id?: string;
          product_id?: string;
          retired_at?: string | null;
          status?: string;
          updated_at?: string;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_media_approved_by_user_fk";
            columns: ["organization_id", "approved_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "product_media_asset_fk";
            columns: ["organization_id", "media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "product_media_created_by_user_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "product_media_product_fk";
            columns: ["organization_id", "product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "product_media_variant_fk";
            columns: ["organization_id", "variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
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
      prompt_versions: {
        Row: {
          content_hash: string;
          content_template: string;
          created_at: string;
          created_by_user_id: string;
          id: string;
          organization_id: string;
          prompt_key: string;
          template_format: string;
          version_number: number;
        };
        Insert: {
          content_hash: string;
          content_template: string;
          created_at?: string;
          created_by_user_id: string;
          id?: string;
          organization_id: string;
          prompt_key: string;
          template_format: string;
          version_number: number;
        };
        Update: {
          content_hash?: string;
          content_template?: string;
          created_at?: string;
          created_by_user_id?: string;
          id?: string;
          organization_id?: string;
          prompt_key?: string;
          template_format?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_versions_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "prompt_versions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      publication_batch_subscriptions: {
        Row: {
          attempt_count: number;
          available_at: string;
          channel_connection_id: string;
          completed_at: string | null;
          conversation_id: string;
          created_at: string;
          destination_identity_id: string;
          id: string;
          last_error_code: string | null;
          lease_expires_at: string | null;
          lease_token: string | null;
          max_attempts: number;
          message_id: string | null;
          organization_id: string;
          origin_agent_run_id: string;
          outbox_event_id: string | null;
          provider_request_id: string | null;
          publication_batch_id: string;
          status: string;
          summary_payload: Json | null;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          available_at?: string;
          channel_connection_id: string;
          completed_at?: string | null;
          conversation_id: string;
          created_at?: string;
          destination_identity_id: string;
          id?: string;
          last_error_code?: string | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          max_attempts?: number;
          message_id?: string | null;
          organization_id: string;
          origin_agent_run_id: string;
          outbox_event_id?: string | null;
          provider_request_id?: string | null;
          publication_batch_id: string;
          status?: string;
          summary_payload?: Json | null;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          available_at?: string;
          channel_connection_id?: string;
          completed_at?: string | null;
          conversation_id?: string;
          created_at?: string;
          destination_identity_id?: string;
          id?: string;
          last_error_code?: string | null;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          max_attempts?: number;
          message_id?: string | null;
          organization_id?: string;
          origin_agent_run_id?: string;
          outbox_event_id?: string | null;
          provider_request_id?: string | null;
          publication_batch_id?: string;
          status?: string;
          summary_payload?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "publication_batch_subscriptions_batch_fk";
            columns: ["organization_id", "publication_batch_id"];
            isOneToOne: true;
            referencedRelation: "publication_batches";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "publication_batch_subscriptions_conversation_fk";
            columns: ["organization_id", "channel_connection_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "publication_batch_subscriptions_destination_fk";
            columns: ["organization_id", "channel_connection_id", "destination_identity_id"];
            isOneToOne: false;
            referencedRelation: "channel_identities";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "publication_batch_subscriptions_message_fk";
            columns: ["organization_id", "channel_connection_id", "message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "publication_batch_subscriptions_outbox_fk";
            columns: ["organization_id", "channel_connection_id", "outbox_event_id"];
            isOneToOne: false;
            referencedRelation: "outbox_events";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "publication_batch_subscriptions_run_fk";
            columns: ["organization_id", "origin_agent_run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
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
          retry_of_job_id: string | null;
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
          retry_of_job_id?: string | null;
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
          retry_of_job_id?: string | null;
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
            foreignKeyName: "publication_jobs_retry_of_fk";
            columns: ["organization_id", "retry_of_job_id"];
            isOneToOne: false;
            referencedRelation: "publication_jobs";
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
      social_publication_dispatch_states: {
        Row: {
          last_publication_job_id: string | null;
          next_dispatch_at: string;
          organization_id: string;
          social_connection_id: string;
          updated_at: string;
        };
        Insert: {
          last_publication_job_id?: string | null;
          next_dispatch_at?: string;
          organization_id: string;
          social_connection_id: string;
          updated_at?: string;
        };
        Update: {
          last_publication_job_id?: string | null;
          next_dispatch_at?: string;
          organization_id?: string;
          social_connection_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_publication_dispatch_states_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: true;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "social_publication_dispatch_states_last_job_fk";
            columns: ["organization_id", "last_publication_job_id"];
            isOneToOne: false;
            referencedRelation: "publication_jobs";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      social_rate_limit_observations: {
        Row: {
          blocked_until: string | null;
          created_at: string;
          id: string;
          observation_source: string;
          observed_at: string;
          organization_id: string;
          provider_request_id: string | null;
          publication_job_id: string | null;
          retry_after_at: string | null;
          social_connection_id: string;
          usage_snapshot: Json;
        };
        Insert: {
          blocked_until?: string | null;
          created_at?: string;
          id?: string;
          observation_source: string;
          observed_at: string;
          organization_id: string;
          provider_request_id?: string | null;
          publication_job_id?: string | null;
          retry_after_at?: string | null;
          social_connection_id: string;
          usage_snapshot?: Json;
        };
        Update: {
          blocked_until?: string | null;
          created_at?: string;
          id?: string;
          observation_source?: string;
          observed_at?: string;
          organization_id?: string;
          provider_request_id?: string | null;
          publication_job_id?: string | null;
          retry_after_at?: string | null;
          social_connection_id?: string;
          usage_snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "social_rate_limit_observations_connection_fk";
            columns: ["organization_id", "social_connection_id"];
            isOneToOne: false;
            referencedRelation: "social_connections";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "social_rate_limit_observations_job_fk";
            columns: ["organization_id", "publication_job_id"];
            isOneToOne: false;
            referencedRelation: "publication_jobs";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      tool_contract_versions: {
        Row: {
          contract_hash: string;
          created_at: string;
          created_by_user_id: string;
          description: string;
          effect_class: string;
          handler_key: string;
          id: string;
          input_schema: Json;
          organization_id: string;
          output_schema: Json;
          tool_contract_id: string;
          version_number: number;
        };
        Insert: {
          contract_hash: string;
          created_at?: string;
          created_by_user_id: string;
          description: string;
          effect_class: string;
          handler_key: string;
          id?: string;
          input_schema: Json;
          organization_id: string;
          output_schema: Json;
          tool_contract_id: string;
          version_number: number;
        };
        Update: {
          contract_hash?: string;
          created_at?: string;
          created_by_user_id?: string;
          description?: string;
          effect_class?: string;
          handler_key?: string;
          id?: string;
          input_schema?: Json;
          organization_id?: string;
          output_schema?: Json;
          tool_contract_id?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tool_contract_versions_contract_fk";
            columns: ["organization_id", "tool_contract_id"];
            isOneToOne: false;
            referencedRelation: "tool_contracts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "tool_contract_versions_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "tool_contract_versions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      tool_contracts: {
        Row: {
          created_at: string;
          created_by_user_id: string;
          current_version_id: string | null;
          display_name: string;
          id: string;
          organization_id: string;
          status: string;
          tool_name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id: string;
          current_version_id?: string | null;
          display_name: string;
          id?: string;
          organization_id: string;
          status?: string;
          tool_name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string;
          current_version_id?: string | null;
          display_name?: string;
          id?: string;
          organization_id?: string;
          status?: string;
          tool_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tool_contracts_created_by_fk";
            columns: ["organization_id", "created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "organization_memberships";
            referencedColumns: ["organization_id", "user_id"];
          },
          {
            foreignKeyName: "tool_contracts_current_version_fk";
            columns: ["organization_id", "id", "current_version_id"];
            isOneToOne: false;
            referencedRelation: "tool_contract_versions";
            referencedColumns: ["organization_id", "tool_contract_id", "id"];
          },
          {
            foreignKeyName: "tool_contracts_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      tool_executions: {
        Row: {
          arguments_hash: string;
          arguments_safe: Json;
          authorization_reason: string | null;
          authorization_status: string;
          authorized_at: string | null;
          completed_at: string | null;
          created_at: string;
          effect_certainty: string;
          effect_class: string;
          effect_started_at: string | null;
          execution_key: string;
          external_effect_key: string | null;
          id: string;
          job_attempt_id: string;
          organization_id: string;
          outbox_channel_connection_id: string | null;
          outbox_event_id: string | null;
          policy_tool_id: string;
          provider_tool_call_id: string;
          result_hash: string | null;
          result_safe: Json | null;
          run_id: string;
          status: string;
          tool_contract_id: string;
          tool_contract_version_id: string;
          tool_round: number;
        };
        Insert: {
          arguments_hash: string;
          arguments_safe: Json;
          authorization_reason?: string | null;
          authorization_status?: string;
          authorized_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          effect_certainty?: string;
          effect_class: string;
          effect_started_at?: string | null;
          execution_key: string;
          external_effect_key?: string | null;
          id?: string;
          job_attempt_id: string;
          organization_id: string;
          outbox_channel_connection_id?: string | null;
          outbox_event_id?: string | null;
          policy_tool_id: string;
          provider_tool_call_id: string;
          result_hash?: string | null;
          result_safe?: Json | null;
          run_id: string;
          status?: string;
          tool_contract_id: string;
          tool_contract_version_id: string;
          tool_round: number;
        };
        Update: {
          arguments_hash?: string;
          arguments_safe?: Json;
          authorization_reason?: string | null;
          authorization_status?: string;
          authorized_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          effect_certainty?: string;
          effect_class?: string;
          effect_started_at?: string | null;
          execution_key?: string;
          external_effect_key?: string | null;
          id?: string;
          job_attempt_id?: string;
          organization_id?: string;
          outbox_channel_connection_id?: string | null;
          outbox_event_id?: string | null;
          policy_tool_id?: string;
          provider_tool_call_id?: string;
          result_hash?: string | null;
          result_safe?: Json | null;
          run_id?: string;
          status?: string;
          tool_contract_id?: string;
          tool_contract_version_id?: string;
          tool_round?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tool_executions_attempt_fk";
            columns: ["organization_id", "job_attempt_id"];
            isOneToOne: false;
            referencedRelation: "job_attempts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "tool_executions_contract_version_fk";
            columns: ["organization_id", "tool_contract_id", "tool_contract_version_id"];
            isOneToOne: false;
            referencedRelation: "tool_contract_versions";
            referencedColumns: ["organization_id", "tool_contract_id", "id"];
          },
          {
            foreignKeyName: "tool_executions_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tool_executions_outbox_fk";
            columns: ["organization_id", "outbox_channel_connection_id", "outbox_event_id"];
            isOneToOne: false;
            referencedRelation: "outbox_events";
            referencedColumns: ["organization_id", "channel_connection_id", "id"];
          },
          {
            foreignKeyName: "tool_executions_policy_tool_fk";
            columns: ["organization_id", "policy_tool_id"];
            isOneToOne: false;
            referencedRelation: "agent_policy_tools";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "tool_executions_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      usage_events: {
        Row: {
          cache_write_input_tokens: number | null;
          cached_input_tokens: number | null;
          cost_amount: number | null;
          cost_currency: string | null;
          cost_status: string;
          id: string;
          input_tokens: number | null;
          job_attempt_id: string | null;
          latency_ms: number | null;
          model: string;
          occurred_at: string;
          operation: string;
          organization_id: string;
          output_tokens: number | null;
          provider: string;
          provider_usage_safe: Json;
          reasoning_tokens: number | null;
          request_count: number;
          run_id: string;
          tool_execution_id: string | null;
          total_tokens: number | null;
          usage_key: string;
        };
        Insert: {
          cache_write_input_tokens?: number | null;
          cached_input_tokens?: number | null;
          cost_amount?: number | null;
          cost_currency?: string | null;
          cost_status: string;
          id?: string;
          input_tokens?: number | null;
          job_attempt_id?: string | null;
          latency_ms?: number | null;
          model: string;
          occurred_at?: string;
          operation: string;
          organization_id: string;
          output_tokens?: number | null;
          provider: string;
          provider_usage_safe?: Json;
          reasoning_tokens?: number | null;
          request_count?: number;
          run_id: string;
          tool_execution_id?: string | null;
          total_tokens?: number | null;
          usage_key: string;
        };
        Update: {
          cache_write_input_tokens?: number | null;
          cached_input_tokens?: number | null;
          cost_amount?: number | null;
          cost_currency?: string | null;
          cost_status?: string;
          id?: string;
          input_tokens?: number | null;
          job_attempt_id?: string | null;
          latency_ms?: number | null;
          model?: string;
          occurred_at?: string;
          operation?: string;
          organization_id?: string;
          output_tokens?: number | null;
          provider?: string;
          provider_usage_safe?: Json;
          reasoning_tokens?: number | null;
          request_count?: number;
          run_id?: string;
          tool_execution_id?: string | null;
          total_tokens?: number | null;
          usage_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_events_attempt_fk";
            columns: ["organization_id", "job_attempt_id"];
            isOneToOne: false;
            referencedRelation: "job_attempts";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "usage_events_organization_fk";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usage_events_run_fk";
            columns: ["organization_id", "run_id"];
            isOneToOne: false;
            referencedRelation: "agent_runs";
            referencedColumns: ["organization_id", "id"];
          },
          {
            foreignKeyName: "usage_events_tool_execution_fk";
            columns: ["organization_id", "tool_execution_id"];
            isOneToOne: false;
            referencedRelation: "tool_executions";
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
      agent_model_route_is_valid: {
        Args: { target_route: Json };
        Returns: boolean;
      };
      assert_agent_actor: {
        Args: {
          allow_system?: boolean;
          allowed_roles?: string[];
          target_organization_id: string;
          target_user_id: string;
        };
        Returns: undefined;
      };
      assert_commercial_actor: {
        Args: {
          allowed_roles?: string[];
          target_organization_id: string;
          target_user_id: string;
        };
        Returns: undefined;
      };
      assert_facebook_oauth_owner: {
        Args: { target_actor_user_id: string; target_organization_id: string };
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
      catalog_offer_for_agent: {
        Args: { target_arguments: Json; target_organization_id: string };
        Returns: Json;
      };
      catalog_recent_for_owner_agent: {
        Args: { target_arguments: Json; target_organization_id: string };
        Returns: Json;
      };
      catalog_search_for_agent: {
        Args: { target_arguments: Json; target_organization_id: string };
        Returns: Json;
      };
      catalog_set_offer_status_for_owner_agent: {
        Args: {
          target_arguments: Json;
          target_execution_key: string;
          target_organization_id: string;
          target_run_id: string;
        };
        Returns: Json;
      };
      claim_admin_catalog_command: {
        Args: {
          target_actor_user_id: string;
          target_idempotency_key: string;
          target_operation: string;
          target_organization_id: string;
          target_request_payload: Json;
        };
        Returns: {
          admin_catalog_command_id: string;
          previous_result_payload: Json;
          was_replayed: boolean;
        }[];
      };
      claim_agent_command: {
        Args: {
          target_allow_system?: boolean;
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
      complete_admin_catalog_command: {
        Args: {
          target_admin_catalog_command_id: string;
          target_organization_id: string;
          target_result_payload: Json;
        };
        Returns: undefined;
      };
      complete_agent_command: {
        Args: {
          target_command_id: string;
          target_organization_id: string;
          target_result_id: string;
          target_result_type: string;
        };
        Returns: undefined;
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
      constant_time_bytea_equal: {
        Args: { left_value: string; right_value: string };
        Returns: boolean;
      };
      conversation_context_for_agent: {
        Args: {
          target_arguments: Json;
          target_organization_id: string;
          target_run_id: string;
        };
        Returns: Json;
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
      customer_assistant_read_tools_ready: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      ensure_customer_assistant_policy: {
        Args: { target_organization_id: string };
        Returns: string;
      };
      ensure_customer_assistant_publication_tools: {
        Args: { target_organization_id: string };
        Returns: string;
      };
      ensure_customer_assistant_read_tools: {
        Args: { target_organization_id: string };
        Returns: string;
      };
      expire_facebook_page_oauth_sessions: { Args: never; Returns: number };
      facebook_dispatch_policy_for_agent: {
        Args: {
          target_organization_id: string;
          target_social_connection_id: string;
        };
        Returns: Json;
      };
      insert_agent_audit_event: {
        Args: {
          target_actor_kind: string;
          target_actor_user_id: string;
          target_configuration_id?: string;
          target_configuration_version_id?: string;
          target_correlation_id: string;
          target_event_type: string;
          target_job_attempt_id?: string;
          target_job_id?: string;
          target_metadata_safe?: Json;
          target_occurred_at?: string;
          target_organization_id: string;
          target_outbox_channel_connection_id?: string;
          target_outbox_event_id?: string;
          target_run_id?: string;
          target_tool_execution_id?: string;
          target_trace_id?: string;
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
      insert_meta_credential_version: {
        Args: {
          target_actor_user_id: string;
          target_channel_connection_id: string;
          target_credential_kind: string;
          target_meta_application_id: string;
          target_organization_id: string;
          target_overlap_seconds: number;
          target_secret_value: string;
          target_webhook_endpoint_id: string;
        };
        Returns: {
          activated_at: string;
          channel_connection_id: string | null;
          created_at: string;
          created_by_user_id: string | null;
          credential_kind: string;
          id: string;
          meta_application_id: string;
          organization_id: string;
          retire_after: string | null;
          revoked_at: string | null;
          status: string;
          vault_secret_id: string;
          version_number: number;
          webhook_endpoint_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "meta_credential_versions";
          isOneToOne: true;
          isSetofReturn: false;
        };
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
      media_actor_is_authorized: {
        Args: {
          target_actor_kind: string;
          target_actor_user_id: string;
          target_allowed_roles: string[];
          target_organization_id: string;
        };
        Returns: boolean;
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
      publication_batch_state_for_owner_agent: {
        Args: {
          target_arguments: Json;
          target_execution_key: string;
          target_organization_id: string;
          target_run_id: string;
        };
        Returns: Json;
      };
      publication_enqueue_catalog_for_owner_agent: {
        Args: {
          target_arguments: Json;
          target_execution_key: string;
          target_organization_id: string;
          target_run_id: string;
        };
        Returns: Json;
      };
      publication_publish_for_owner_agent: {
        Args: {
          target_arguments: Json;
          target_execution_key: string;
          target_organization_id: string;
          target_run_id: string;
        };
        Returns: Json;
      };
      publication_retry_for_owner_agent: {
        Args: {
          target_arguments: Json;
          target_execution_key: string;
          target_organization_id: string;
          target_run_id: string;
        };
        Returns: Json;
      };
      publication_status_for_owner_agent: {
        Args: { target_arguments: Json; target_organization_id: string };
        Returns: Json;
      };
      resolve_whatsapp_agent_actor: {
        Args: {
          target_channel_connection_id: string;
          target_conversation_id: string;
          target_organization_id: string;
        };
        Returns: {
          actor_channel_identity_id: string;
          actor_kind: string;
          actor_user_id: string;
        }[];
      };
      whatsapp_agent_run_actor_is_current: {
        Args: { target_organization_id: string; target_run_id: string };
        Returns: boolean;
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
