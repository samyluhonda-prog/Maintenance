// Hand-written Supabase-style generated types for the `public` schema, built
// by reading supabase/migrations/0001..0015 directly (the sandbox has no
// Docker, and `supabase gen types typescript --db-url` requires it even in
// that mode). `auth` and `storage` schemas exist in the real database (see
// 0002_organizations_and_roles.sql for auth.users, 0014_storage.sql for
// storage.buckets/storage.objects) but are intentionally omitted here since
// the app only ever queries `public` through the Supabase client; columns
// that reference `auth.users(id)` still appear on their table's Row/Insert/
// Update as a plain `string`/`string | null`, they are just not linked into
// `Relationships` because the referenced table isn't modeled in this file.
// Business logic itself lives in `app.*` (also skipped here); the three
// Functions below are the thin `public.*` RPC wrappers 0015 defines around
// them so `supabase.rpc(...)` calls from client code resolve — PostgREST
// only exposes the `public` schema by default, so client code never calls
// `app.*` directly.
// Regenerate with `supabase gen types typescript` once Docker is available,
// and diff against this file rather than trusting either blindly.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          locale_default: 'fr' | 'en'
          timezone: string
          logo_path: string | null
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          locale_default?: 'fr' | 'en'
          timezone?: string
          logo_path?: string | null
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          locale_default?: 'fr' | 'en'
          timezone?: string
          logo_path?: string | null
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_path: string | null
          locale: 'fr' | 'en'
          phone: string | null
          is_external_contractor: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string
          avatar_path?: string | null
          locale?: 'fr' | 'en'
          phone?: string | null
          is_external_contractor?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          avatar_path?: string | null
          locale?: 'fr' | 'en'
          phone?: string | null
          is_external_contractor?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      roles: {
        Row: {
          id: string
          org_id: string | null
          key: string
          name_fr: string
          name_en: string
          description_fr: string | null
          description_en: string | null
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          key: string
          name_fr: string
          name_en: string
          description_fr?: string | null
          description_en?: string | null
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          key?: string
          name_fr?: string
          name_en?: string
          description_fr?: string | null
          description_en?: string | null
          is_system?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      permissions: {
        Row: {
          id: string
          key: string
          module: string
          action: 'view' | 'create' | 'edit' | 'approve' | 'close' | 'export' | 'admin' | 'delete'
          label_fr: string
          label_en: string
        }
        Insert: {
          id?: string
          key: string
          module: string
          action: 'view' | 'create' | 'edit' | 'approve' | 'close' | 'export' | 'admin' | 'delete'
          label_fr: string
          label_en: string
        }
        Update: {
          id?: string
          key?: string
          module?: string
          action?: 'view' | 'create' | 'edit' | 'approve' | 'close' | 'export' | 'admin' | 'delete'
          label_fr?: string
          label_en?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          role_id: string
          permission_id: string
        }
        Insert: {
          role_id: string
          permission_id: string
        }
        Update: {
          role_id?: string
          permission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          }
        ]
      }
      memberships: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role_id: string
          status: 'active' | 'invited' | 'suspended'
          invited_email: string | null
          job_title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          role_id: string
          status?: 'active' | 'invited' | 'suspended'
          invited_email?: string | null
          job_title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          role_id?: string
          status?: 'active' | 'invited' | 'suspended'
          invited_email?: string | null
          job_title?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      org_invitations: {
        Row: {
          id: string
          org_id: string
          email: string
          role_id: string
          invited_by: string
          token: string
          status: 'pending' | 'accepted' | 'revoked' | 'expired'
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          org_id: string
          email: string
          role_id: string
          invited_by: string
          token?: string
          status?: 'pending' | 'accepted' | 'revoked' | 'expired'
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          email?: string
          role_id?: string
          invited_by?: string
          token?: string
          status?: 'pending' | 'accepted' | 'revoked' | 'expired'
          created_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      locations: {
        Row: {
          id: string
          org_id: string
          parent_id: string | null
          type: 'site' | 'building' | 'zone' | 'production_line' | 'system' | 'other'
          name: string
          code: string | null
          address: string | null
          qr_code: string | null
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          parent_id?: string | null
          type: 'site' | 'building' | 'zone' | 'production_line' | 'system' | 'other'
          name: string
          code?: string | null
          address?: string | null
          qr_code?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          parent_id?: string | null
          type?: 'site' | 'building' | 'zone' | 'production_line' | 'system' | 'other'
          name?: string
          code?: string | null
          address?: string | null
          qr_code?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          }
        ]
      }
      equipment: {
        Row: {
          id: string
          org_id: string
          location_id: string | null
          parent_equipment_id: string | null
          name: string
          internal_code: string | null
          qr_code: string | null
          category: string | null
          status: 'operational' | 'down' | 'in_repair' | 'decommissioned' | 'standby'
          criticality: 'low' | 'medium' | 'high' | 'critical'
          manufacturer: string | null
          model: string | null
          serial_number: string | null
          commissioned_at: string | null
          acquisition_cost: number | null
          expected_lifetime_months: number | null
          warranty_expires_at: string | null
          supplier_id: string | null
          owner_user_id: string | null
          cumulative_cost: number
          cumulative_downtime_minutes: number
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          location_id?: string | null
          parent_equipment_id?: string | null
          name: string
          internal_code?: string | null
          qr_code?: string | null
          category?: string | null
          status?: 'operational' | 'down' | 'in_repair' | 'decommissioned' | 'standby'
          criticality?: 'low' | 'medium' | 'high' | 'critical'
          manufacturer?: string | null
          model?: string | null
          serial_number?: string | null
          commissioned_at?: string | null
          acquisition_cost?: number | null
          expected_lifetime_months?: number | null
          warranty_expires_at?: string | null
          supplier_id?: string | null
          owner_user_id?: string | null
          cumulative_cost?: number
          cumulative_downtime_minutes?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          location_id?: string | null
          parent_equipment_id?: string | null
          name?: string
          internal_code?: string | null
          qr_code?: string | null
          category?: string | null
          status?: 'operational' | 'down' | 'in_repair' | 'decommissioned' | 'standby'
          criticality?: 'low' | 'medium' | 'high' | 'critical'
          manufacturer?: string | null
          model?: string | null
          serial_number?: string | null
          commissioned_at?: string | null
          acquisition_cost?: number | null
          expected_lifetime_months?: number | null
          warranty_expires_at?: string | null
          supplier_id?: string | null
          owner_user_id?: string | null
          cumulative_cost?: number
          cumulative_downtime_minutes?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_parent_equipment_id_fkey"
            columns: ["parent_equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_supplier_fk"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      equipment_documents: {
        Row: {
          id: string
          org_id: string
          equipment_id: string
          kind: 'photo' | 'manual' | 'plan' | 'document'
          storage_path: string
          file_name: string
          mime_type: string | null
          size_bytes: number | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          equipment_id: string
          kind: 'photo' | 'manual' | 'plan' | 'document'
          storage_path: string
          file_name: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          equipment_id?: string
          kind?: 'photo' | 'manual' | 'plan' | 'document'
          storage_path?: string
          file_name?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_documents_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      equipment_moves: {
        Row: {
          id: string
          org_id: string
          equipment_id: string
          from_location_id: string | null
          to_location_id: string | null
          moved_by: string | null
          moved_at: string
          note: string | null
        }
        Insert: {
          id?: string
          org_id: string
          equipment_id: string
          from_location_id?: string | null
          to_location_id?: string | null
          moved_by?: string | null
          moved_at?: string
          note?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          equipment_id?: string
          from_location_id?: string | null
          to_location_id?: string | null
          moved_by?: string | null
          moved_at?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_moves_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_moves_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_moves_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_moves_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_moves_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      meters: {
        Row: {
          id: string
          org_id: string
          equipment_id: string
          name: string
          unit: string
          kind: 'hours' | 'kilometers' | 'cycles' | 'pressure' | 'temperature' | 'vibration' | 'energy' | 'weight' | 'production' | 'custom'
          source: 'manual' | 'api' | 'sensor'
          is_cumulative: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          equipment_id: string
          name: string
          unit: string
          kind?: 'hours' | 'kilometers' | 'cycles' | 'pressure' | 'temperature' | 'vibration' | 'energy' | 'weight' | 'production' | 'custom'
          source?: 'manual' | 'api' | 'sensor'
          is_cumulative?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          equipment_id?: string
          name?: string
          unit?: string
          kind?: 'hours' | 'kilometers' | 'cycles' | 'pressure' | 'temperature' | 'vibration' | 'energy' | 'weight' | 'production' | 'custom'
          source?: 'manual' | 'api' | 'sensor'
          is_cumulative?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meters_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          }
        ]
      }
      meter_readings: {
        Row: {
          id: string
          org_id: string
          meter_id: string
          value: number
          recorded_at: string
          recorded_by: string | null
          source: 'manual' | 'api' | 'sensor'
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          meter_id: string
          value: number
          recorded_at?: string
          recorded_by?: string | null
          source?: 'manual' | 'api' | 'sensor'
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          meter_id?: string
          value?: number
          recorded_at?: string
          recorded_by?: string | null
          source?: 'manual' | 'api' | 'sensor'
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meter_readings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_meter_id_fkey"
            columns: ["meter_id"]
            isOneToOne: false
            referencedRelation: "meters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      parts: {
        Row: {
          id: string
          org_id: string
          number: string
          name: string
          description: string | null
          category: string | null
          manufacturer: string | null
          manufacturer_part_number: string | null
          unit: string
          unit_cost: number
          storage_location_id: string | null
          quantity_on_hand: number
          quantity_reserved: number
          quantity_on_order: number
          min_threshold: number
          optimal_level: number | null
          lead_time_days: number | null
          primary_supplier_id: string | null
          qr_code: string | null
          photo_path: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          number: string
          name: string
          description?: string | null
          category?: string | null
          manufacturer?: string | null
          manufacturer_part_number?: string | null
          unit?: string
          unit_cost?: number
          storage_location_id?: string | null
          quantity_on_hand?: number
          quantity_reserved?: number
          quantity_on_order?: number
          min_threshold?: number
          optimal_level?: number | null
          lead_time_days?: number | null
          primary_supplier_id?: string | null
          qr_code?: string | null
          photo_path?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          number?: string
          name?: string
          description?: string | null
          category?: string | null
          manufacturer?: string | null
          manufacturer_part_number?: string | null
          unit?: string
          unit_cost?: number
          storage_location_id?: string | null
          quantity_on_hand?: number
          quantity_reserved?: number
          quantity_on_order?: number
          min_threshold?: number
          optimal_level?: number | null
          lead_time_days?: number | null
          primary_supplier_id?: string | null
          qr_code?: string | null
          photo_path?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_primary_supplier_fk"
            columns: ["primary_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          }
        ]
      }
      equipment_parts: {
        Row: {
          org_id: string
          equipment_id: string
          part_id: string
        }
        Insert: {
          org_id: string
          equipment_id: string
          part_id: string
        }
        Update: {
          org_id?: string
          equipment_id?: string
          part_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_parts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_parts_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          }
        ]
      }
      part_transactions: {
        Row: {
          id: string
          org_id: string
          part_id: string
          type: 'receipt' | 'usage' | 'reservation' | 'return' | 'transfer' | 'adjustment' | 'cycle_count' | 'scrap'
          quantity: number
          unit_cost: number | null
          work_order_id: string | null
          purchase_order_id: string | null
          from_location_id: string | null
          to_location_id: string | null
          performed_by: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          part_id: string
          type: 'receipt' | 'usage' | 'reservation' | 'return' | 'transfer' | 'adjustment' | 'cycle_count' | 'scrap'
          quantity: number
          unit_cost?: number | null
          work_order_id?: string | null
          purchase_order_id?: string | null
          from_location_id?: string | null
          to_location_id?: string | null
          performed_by?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          part_id?: string
          type?: 'receipt' | 'usage' | 'reservation' | 'return' | 'transfer' | 'adjustment' | 'cycle_count' | 'scrap'
          quantity?: number
          unit_cost?: number | null
          work_order_id?: string | null
          purchase_order_id?: string | null
          from_location_id?: string | null
          to_location_id?: string | null
          performed_by?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_transactions_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_transactions_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_transactions_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_transactions_po_fk"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_transactions_wo_fk"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      suppliers: {
        Row: {
          id: string
          org_id: string
          name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          notes: string | null
          rating: number | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          rating?: number | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          rating?: number | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      supplier_documents: {
        Row: {
          id: string
          org_id: string
          supplier_id: string
          title: string
          kind: 'contract' | 'document'
          storage_path: string
          start_date: string | null
          end_date: string | null
          value: number | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          supplier_id: string
          title: string
          kind?: 'contract' | 'document'
          storage_path: string
          start_date?: string | null
          end_date?: string | null
          value?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          supplier_id?: string
          title?: string
          kind?: 'contract' | 'document'
          storage_path?: string
          start_date?: string | null
          end_date?: string | null
          value?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          }
        ]
      }
      purchase_orders: {
        Row: {
          id: string
          org_id: string
          number: string
          supplier_id: string | null
          status: 'draft' | 'requested' | 'pending_approval' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'closed' | 'cancelled'
          requested_by: string | null
          approved_by: string | null
          approved_at: string | null
          ordered_at: string | null
          expected_at: string | null
          subtotal: number
          tax: number
          shipping: number
          total: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          number: string
          supplier_id?: string | null
          status?: 'draft' | 'requested' | 'pending_approval' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'closed' | 'cancelled'
          requested_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          ordered_at?: string | null
          expected_at?: string | null
          subtotal?: number
          tax?: number
          shipping?: number
          total?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          number?: string
          supplier_id?: string | null
          status?: 'draft' | 'requested' | 'pending_approval' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'closed' | 'cancelled'
          requested_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          ordered_at?: string | null
          expected_at?: string | null
          subtotal?: number
          tax?: number
          shipping?: number
          total?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      purchase_order_lines: {
        Row: {
          id: string
          org_id: string
          purchase_order_id: string
          part_id: string | null
          description: string
          quantity: number
          unit_cost: number
          quantity_received: number
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          purchase_order_id: string
          part_id?: string | null
          description: string
          quantity: number
          unit_cost?: number
          quantity_received?: number
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          purchase_order_id?: string
          part_id?: string | null
          description?: string
          quantity?: number
          unit_cost?: number
          quantity_received?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          }
        ]
      }
      procedure_templates: {
        Row: {
          id: string
          org_id: string
          name: string
          description: string | null
          category: string | null
          version: number
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          description?: string | null
          category?: string | null
          version?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          description?: string | null
          category?: string | null
          version?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedure_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      procedure_fields: {
        Row: {
          id: string
          org_id: string
          template_id: string
          section_id: string | null
          order_index: number
          type: 'section' | 'text' | 'instructions' | 'checkbox' | 'yesno' | 'multiple_choice' | 'number' | 'free_text' | 'datetime' | 'meter_reading' | 'pass_fail' | 'photo' | 'signature' | 'file' | 'amount_range'
          label: string
          is_required: boolean
          config: Json
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          template_id: string
          section_id?: string | null
          order_index?: number
          type: 'section' | 'text' | 'instructions' | 'checkbox' | 'yesno' | 'multiple_choice' | 'number' | 'free_text' | 'datetime' | 'meter_reading' | 'pass_fail' | 'photo' | 'signature' | 'file' | 'amount_range'
          label: string
          is_required?: boolean
          config?: Json
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          template_id?: string
          section_id?: string | null
          order_index?: number
          type?: 'section' | 'text' | 'instructions' | 'checkbox' | 'yesno' | 'multiple_choice' | 'number' | 'free_text' | 'datetime' | 'meter_reading' | 'pass_fail' | 'photo' | 'signature' | 'file' | 'amount_range'
          label?: string
          is_required?: boolean
          config?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_fields_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "procedure_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_fields_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "procedure_fields"
            referencedColumns: ["id"]
          }
        ]
      }
      procedure_runs: {
        Row: {
          id: string
          org_id: string
          template_id: string
          work_order_id: string | null
          equipment_id: string | null
          status: 'in_progress' | 'completed' | 'failed'
          started_by: string | null
          started_at: string
          completed_at: string | null
          score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          template_id: string
          work_order_id?: string | null
          equipment_id?: string | null
          status?: 'in_progress' | 'completed' | 'failed'
          started_by?: string | null
          started_at?: string
          completed_at?: string | null
          score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          template_id?: string
          work_order_id?: string | null
          equipment_id?: string | null
          status?: 'in_progress' | 'completed' | 'failed'
          started_by?: string | null
          started_at?: string
          completed_at?: string | null
          score?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "procedure_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_runs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_runs_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      procedure_run_answers: {
        Row: {
          id: string
          org_id: string
          run_id: string
          field_id: string
          value: Json | null
          flagged: boolean
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          run_id: string
          field_id: string
          value?: Json | null
          flagged?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          run_id?: string
          field_id?: string
          value?: Json | null
          flagged?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_run_answers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_run_answers_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "procedure_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_run_answers_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "procedure_fields"
            referencedColumns: ["id"]
          }
        ]
      }
      requests: {
        Row: {
          id: string
          org_id: string
          number: string
          title: string
          description: string | null
          equipment_id: string | null
          location_id: string | null
          category: string | null
          urgency: 'low' | 'medium' | 'high' | 'critical'
          is_equipment_down: boolean
          status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted'
          requested_by: string
          reviewed_by: string | null
          reviewed_at: string | null
          review_note: string | null
          converted_work_order_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          number: string
          title: string
          description?: string | null
          equipment_id?: string | null
          location_id?: string | null
          category?: string | null
          urgency?: 'low' | 'medium' | 'high' | 'critical'
          is_equipment_down?: boolean
          status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted'
          requested_by: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_note?: string | null
          converted_work_order_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          number?: string
          title?: string
          description?: string | null
          equipment_id?: string | null
          location_id?: string | null
          category?: string | null
          urgency?: 'low' | 'medium' | 'high' | 'critical'
          is_equipment_down?: boolean
          status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted'
          requested_by?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_note?: string | null
          converted_work_order_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_converted_wo_fk"
            columns: ["converted_work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      request_attachments: {
        Row: {
          id: string
          org_id: string
          request_id: string
          storage_path: string
          file_name: string
          mime_type: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          request_id: string
          storage_path: string
          file_name: string
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          request_id?: string
          storage_path?: string
          file_name?: string
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      work_orders: {
        Row: {
          id: string
          org_id: string
          number: string
          title: string
          description: string | null
          type: 'preventive' | 'corrective' | 'inspection' | 'safety' | 'improvement' | 'other'
          priority: 'low' | 'medium' | 'high' | 'critical'
          status: 'draft' | 'open' | 'planned' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'to_review' | 'closed' | 'cancelled' | 'skipped'
          equipment_id: string | null
          location_id: string | null
          request_id: string | null
          parent_work_order_id: string | null
          pm_plan_id: string | null
          procedure_template_id: string | null
          procedure_run_id: string | null
          primary_assignee_id: string | null
          team_id: string | null
          created_by: string | null
          scheduled_start: string | null
          due_at: string | null
          estimate_hours: number | null
          actual_hours: number
          downtime_minutes: number
          labor_cost: number
          parts_cost: number
          external_cost: number
          requires_lockout: boolean
          safety_notes: string | null
          failure_cause: string | null
          resolution: string | null
          follow_up_required: boolean
          follow_up_notes: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          number: string
          title: string
          description?: string | null
          type?: 'preventive' | 'corrective' | 'inspection' | 'safety' | 'improvement' | 'other'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          status?: 'draft' | 'open' | 'planned' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'to_review' | 'closed' | 'cancelled' | 'skipped'
          equipment_id?: string | null
          location_id?: string | null
          request_id?: string | null
          parent_work_order_id?: string | null
          pm_plan_id?: string | null
          procedure_template_id?: string | null
          procedure_run_id?: string | null
          primary_assignee_id?: string | null
          team_id?: string | null
          created_by?: string | null
          scheduled_start?: string | null
          due_at?: string | null
          estimate_hours?: number | null
          actual_hours?: number
          downtime_minutes?: number
          labor_cost?: number
          parts_cost?: number
          external_cost?: number
          requires_lockout?: boolean
          safety_notes?: string | null
          failure_cause?: string | null
          resolution?: string | null
          follow_up_required?: boolean
          follow_up_notes?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          number?: string
          title?: string
          description?: string | null
          type?: 'preventive' | 'corrective' | 'inspection' | 'safety' | 'improvement' | 'other'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          status?: 'draft' | 'open' | 'planned' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'to_review' | 'closed' | 'cancelled' | 'skipped'
          equipment_id?: string | null
          location_id?: string | null
          request_id?: string | null
          parent_work_order_id?: string | null
          pm_plan_id?: string | null
          procedure_template_id?: string | null
          procedure_run_id?: string | null
          primary_assignee_id?: string | null
          team_id?: string | null
          created_by?: string | null
          scheduled_start?: string | null
          due_at?: string | null
          estimate_hours?: number | null
          actual_hours?: number
          downtime_minutes?: number
          labor_cost?: number
          parts_cost?: number
          external_cost?: number
          requires_lockout?: boolean
          safety_notes?: string | null
          failure_cause?: string | null
          resolution?: string | null
          follow_up_required?: boolean
          follow_up_notes?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_parent_work_order_id_fkey"
            columns: ["parent_work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_pm_plan_fk"
            columns: ["pm_plan_id"]
            isOneToOne: false
            referencedRelation: "pm_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_procedure_template_id_fkey"
            columns: ["procedure_template_id"]
            isOneToOne: false
            referencedRelation: "procedure_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_procedure_run_id_fkey"
            columns: ["procedure_run_id"]
            isOneToOne: false
            referencedRelation: "procedure_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_primary_assignee_id_fkey"
            columns: ["primary_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      teams: {
        Row: {
          id: string
          org_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      team_members: {
        Row: {
          team_id: string
          user_id: string
          org_id: string
        }
        Insert: {
          team_id: string
          user_id: string
          org_id: string
        }
        Update: {
          team_id?: string
          user_id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      work_order_assignees: {
        Row: {
          work_order_id: string
          user_id: string
          org_id: string
          role_on_wo: string | null
        }
        Insert: {
          work_order_id: string
          user_id: string
          org_id: string
          role_on_wo?: string | null
        }
        Update: {
          work_order_id?: string
          user_id?: string
          org_id?: string
          role_on_wo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_assignees_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_assignees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      work_order_tasks: {
        Row: {
          id: string
          org_id: string
          work_order_id: string
          label: string
          is_done: boolean
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          work_order_id: string
          label: string
          is_done?: boolean
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          work_order_id?: string
          label?: string
          is_done?: boolean
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_tasks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          }
        ]
      }
      work_order_parts: {
        Row: {
          id: string
          org_id: string
          work_order_id: string
          part_id: string
          quantity_planned: number
          quantity_used: number
          unit_cost: number
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          work_order_id: string
          part_id: string
          quantity_planned?: number
          quantity_used?: number
          unit_cost?: number
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          work_order_id?: string
          part_id?: string
          quantity_planned?: number
          quantity_used?: number
          unit_cost?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_parts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_parts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          }
        ]
      }
      work_order_time_logs: {
        Row: {
          id: string
          org_id: string
          work_order_id: string
          user_id: string
          started_at: string
          ended_at: string | null
          minutes: number | null
          labor_rate: number | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          work_order_id: string
          user_id: string
          started_at: string
          ended_at?: string | null
          minutes?: number | null
          labor_rate?: number | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          work_order_id?: string
          user_id?: string
          started_at?: string
          ended_at?: string | null
          minutes?: number | null
          labor_rate?: number | null
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_time_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_logs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_time_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      work_order_comments: {
        Row: {
          id: string
          org_id: string
          work_order_id: string
          user_id: string
          body: string
          mentioned_user_ids: string[]
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          work_order_id: string
          user_id: string
          body: string
          mentioned_user_ids?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          work_order_id?: string
          user_id?: string
          body?: string
          mentioned_user_ids?: string[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_comments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      work_order_attachments: {
        Row: {
          id: string
          org_id: string
          work_order_id: string
          storage_path: string
          file_name: string
          mime_type: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          work_order_id: string
          storage_path: string
          file_name: string
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          work_order_id?: string
          storage_path?: string
          file_name?: string
          mime_type?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_attachments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_attachments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      work_order_signatures: {
        Row: {
          id: string
          org_id: string
          work_order_id: string
          user_id: string
          signed_at: string
          signature_path: string
        }
        Insert: {
          id?: string
          org_id: string
          work_order_id: string
          user_id: string
          signed_at?: string
          signature_path: string
        }
        Update: {
          id?: string
          org_id?: string
          work_order_id?: string
          user_id?: string
          signed_at?: string
          signature_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_signatures_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_signatures_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      work_order_status_history: {
        Row: {
          id: string
          org_id: string
          work_order_id: string
          from_status: string | null
          to_status: string
          changed_by: string | null
          changed_at: string
          note: string | null
        }
        Insert: {
          id?: string
          org_id: string
          work_order_id: string
          from_status?: string | null
          to_status: string
          changed_by?: string | null
          changed_at?: string
          note?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          work_order_id?: string
          from_status?: string | null
          to_status?: string
          changed_by?: string | null
          changed_at?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_status_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_status_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      pm_plans: {
        Row: {
          id: string
          org_id: string
          name: string
          equipment_id: string
          procedure_template_id: string | null
          wo_title: string
          wo_description: string | null
          wo_priority: 'low' | 'medium' | 'high' | 'critical'
          wo_estimate_hours: number | null
          default_assignee_id: string | null
          lead_time_days: number
          status: 'active' | 'paused' | 'archived'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          equipment_id: string
          procedure_template_id?: string | null
          wo_title: string
          wo_description?: string | null
          wo_priority?: 'low' | 'medium' | 'high' | 'critical'
          wo_estimate_hours?: number | null
          default_assignee_id?: string | null
          lead_time_days?: number
          status?: 'active' | 'paused' | 'archived'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          equipment_id?: string
          procedure_template_id?: string | null
          wo_title?: string
          wo_description?: string | null
          wo_priority?: 'low' | 'medium' | 'high' | 'critical'
          wo_estimate_hours?: number | null
          default_assignee_id?: string | null
          lead_time_days?: number
          status?: 'active' | 'paused' | 'archived'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_plans_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_plans_procedure_template_id_fkey"
            columns: ["procedure_template_id"]
            isOneToOne: false
            referencedRelation: "procedure_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_plans_default_assignee_id_fkey"
            columns: ["default_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      pm_triggers: {
        Row: {
          id: string
          org_id: string
          pm_plan_id: string
          kind: 'calendar' | 'meter' | 'condition'
          frequency_unit: 'day' | 'week' | 'month' | 'year' | 'custom' | null
          frequency_value: number | null
          days_of_week: number[] | null
          fixed_interval: boolean
          tolerance_days: number
          meter_id: string | null
          meter_interval: number | null
          meter_operator: 'gte' | 'lte' | 'eq' | null
          meter_threshold: number | null
          condition_expression: Json | null
          is_active: boolean
          last_generated_at: string | null
          last_generated_meter_value: number | null
          next_due_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          pm_plan_id: string
          kind: 'calendar' | 'meter' | 'condition'
          frequency_unit?: 'day' | 'week' | 'month' | 'year' | 'custom' | null
          frequency_value?: number | null
          days_of_week?: number[] | null
          fixed_interval?: boolean
          tolerance_days?: number
          meter_id?: string | null
          meter_interval?: number | null
          meter_operator?: 'gte' | 'lte' | 'eq' | null
          meter_threshold?: number | null
          condition_expression?: Json | null
          is_active?: boolean
          last_generated_at?: string | null
          last_generated_meter_value?: number | null
          next_due_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          pm_plan_id?: string
          kind?: 'calendar' | 'meter' | 'condition'
          frequency_unit?: 'day' | 'week' | 'month' | 'year' | 'custom' | null
          frequency_value?: number | null
          days_of_week?: number[] | null
          fixed_interval?: boolean
          tolerance_days?: number
          meter_id?: string | null
          meter_interval?: number | null
          meter_operator?: 'gte' | 'lte' | 'eq' | null
          meter_threshold?: number | null
          condition_expression?: Json | null
          is_active?: boolean
          last_generated_at?: string | null
          last_generated_meter_value?: number | null
          next_due_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_triggers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_triggers_pm_plan_id_fkey"
            columns: ["pm_plan_id"]
            isOneToOne: false
            referencedRelation: "pm_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_triggers_meter_id_fkey"
            columns: ["meter_id"]
            isOneToOne: false
            referencedRelation: "meters"
            referencedColumns: ["id"]
          }
        ]
      }
      pm_generated_work_orders: {
        Row: {
          pm_trigger_id: string
          work_order_id: string
          org_id: string
          occurrence_date: string
          generated_at: string
        }
        Insert: {
          pm_trigger_id: string
          work_order_id: string
          org_id: string
          occurrence_date: string
          generated_at?: string
        }
        Update: {
          pm_trigger_id?: string
          work_order_id?: string
          org_id?: string
          occurrence_date?: string
          generated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_generated_work_orders_pm_trigger_id_fkey"
            columns: ["pm_trigger_id"]
            isOneToOne: false
            referencedRelation: "pm_triggers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_generated_work_orders_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_generated_work_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      automation_rules: {
        Row: {
          id: string
          org_id: string
          name: string
          description: string | null
          is_active: boolean
          trigger_event: 'request.created' | 'request.critical_created' | 'equipment.status_changed' | 'equipment.repeat_failure' | 'work_order.created' | 'work_order.completed' | 'work_order.overdue' | 'work_order.unassigned_timeout' | 'procedure.failed' | 'meter.threshold_reached' | 'part.below_min'
          conditions: Json
          actions: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          description?: string | null
          is_active?: boolean
          trigger_event: 'request.created' | 'request.critical_created' | 'equipment.status_changed' | 'equipment.repeat_failure' | 'work_order.created' | 'work_order.completed' | 'work_order.overdue' | 'work_order.unassigned_timeout' | 'procedure.failed' | 'meter.threshold_reached' | 'part.below_min'
          conditions?: Json
          actions?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          trigger_event?: 'request.created' | 'request.critical_created' | 'equipment.status_changed' | 'equipment.repeat_failure' | 'work_order.created' | 'work_order.completed' | 'work_order.overdue' | 'work_order.unassigned_timeout' | 'procedure.failed' | 'meter.threshold_reached' | 'part.below_min'
          conditions?: Json
          actions?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      automation_logs: {
        Row: {
          id: string
          org_id: string
          rule_id: string | null
          triggered_at: string
          context: Json
          actions_taken: Json
          success: boolean
          error: string | null
        }
        Insert: {
          id?: string
          org_id: string
          rule_id?: string | null
          triggered_at?: string
          context?: Json
          actions_taken?: Json
          success?: boolean
          error?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          rule_id?: string | null
          triggered_at?: string
          context?: Json
          actions_taken?: Json
          success?: boolean
          error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          org_id: string
          user_id: string
          type: string
          title: string
          body: string | null
          link: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          type: string
          title: string
          body?: string | null
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_preferences: {
        Row: {
          user_id: string
          org_id: string
          channel: 'inapp' | 'email' | 'push'
          category: string
          enabled: boolean
        }
        Insert: {
          user_id: string
          org_id: string
          channel: 'inapp' | 'email' | 'push'
          category: string
          enabled?: boolean
        }
        Update: {
          user_id?: string
          org_id?: string
          channel?: 'inapp' | 'email' | 'push'
          category?: string
          enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_log: {
        Row: {
          id: string
          org_id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          before: Json | null
          after: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          before?: Json | null
          after?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          before?: Json | null
          after?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      failure_categories: {
        Row: {
          id: string
          org_id: string
          name: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "failure_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      failure_modes: {
        Row: {
          id: string
          org_id: string
          category_id: string | null
          name: string
        }
        Insert: {
          id?: string
          org_id: string
          category_id?: string | null
          name: string
        }
        Update: {
          id?: string
          org_id?: string
          category_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "failure_modes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "failure_modes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "failure_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      rca_records: {
        Row: {
          id: string
          org_id: string
          work_order_id: string | null
          equipment_id: string
          title: string
          problem_statement: string
          failure_mode_id: string | null
          status: 'open' | 'in_progress' | 'completed'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          work_order_id?: string | null
          equipment_id: string
          title: string
          problem_statement: string
          failure_mode_id?: string | null
          status?: 'open' | 'in_progress' | 'completed'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          work_order_id?: string | null
          equipment_id?: string
          title?: string
          problem_statement?: string
          failure_mode_id?: string | null
          status?: 'open' | 'in_progress' | 'completed'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rca_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rca_records_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rca_records_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rca_records_failure_mode_id_fkey"
            columns: ["failure_mode_id"]
            isOneToOne: false
            referencedRelation: "failure_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rca_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      rca_five_whys: {
        Row: {
          id: string
          org_id: string
          rca_id: string
          order_index: number
          question: string
          answer: string | null
        }
        Insert: {
          id?: string
          org_id: string
          rca_id: string
          order_index: number
          question: string
          answer?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          rca_id?: string
          order_index?: number
          question?: string
          answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rca_five_whys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rca_five_whys_rca_id_fkey"
            columns: ["rca_id"]
            isOneToOne: false
            referencedRelation: "rca_records"
            referencedColumns: ["id"]
          }
        ]
      }
      rca_causes: {
        Row: {
          id: string
          org_id: string
          rca_id: string
          category: 'method' | 'machine' | 'material' | 'man' | 'measurement' | 'environment'
          description: string
        }
        Insert: {
          id?: string
          org_id: string
          rca_id: string
          category: 'method' | 'machine' | 'material' | 'man' | 'measurement' | 'environment'
          description: string
        }
        Update: {
          id?: string
          org_id?: string
          rca_id?: string
          category?: 'method' | 'machine' | 'material' | 'man' | 'measurement' | 'environment'
          description?: string
        }
        Relationships: [
          {
            foreignKeyName: "rca_causes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rca_causes_rca_id_fkey"
            columns: ["rca_id"]
            isOneToOne: false
            referencedRelation: "rca_records"
            referencedColumns: ["id"]
          }
        ]
      }
      corrective_actions: {
        Row: {
          id: string
          org_id: string
          rca_id: string
          description: string
          owner_id: string | null
          due_date: string | null
          status: 'open' | 'in_progress' | 'done' | 'verified'
          verified_by: string | null
          verified_at: string | null
          effectiveness_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          rca_id: string
          description: string
          owner_id?: string | null
          due_date?: string | null
          status?: 'open' | 'in_progress' | 'done' | 'verified'
          verified_by?: string | null
          verified_at?: string | null
          effectiveness_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          rca_id?: string
          description?: string
          owner_id?: string | null
          due_date?: string | null
          status?: 'open' | 'in_progress' | 'done' | 'verified'
          verified_by?: string | null
          verified_at?: string | null
          effectiveness_note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corrective_actions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_rca_id_fkey"
            columns: ["rca_id"]
            isOneToOne: false
            referencedRelation: "rca_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      comments: {
        Row: {
          id: string
          org_id: string
          entity_type: string
          entity_id: string
          user_id: string
          body: string
          mentioned_user_ids: string[]
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          entity_type: string
          entity_id: string
          user_id: string
          body: string
          mentioned_user_ids?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          entity_type?: string
          entity_id?: string
          user_id?: string
          body?: string
          mentioned_user_ids?: string[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      attachments: {
        Row: {
          id: string
          org_id: string
          entity_type: string
          entity_id: string
          storage_path: string
          file_name: string
          mime_type: string | null
          size_bytes: number | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          entity_type: string
          entity_id: string
          storage_path: string
          file_name: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          entity_type?: string
          entity_id?: string
          storage_path?: string
          file_name?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization_with_owner: {
        Args: {
          p_name: string
          p_slug: string
          p_locale?: string
          p_timezone?: string
        }
        Returns: string
      }
      receive_purchase_order_line: {
        Args: {
          p_line_id: string
          p_quantity: number
        }
        Returns: undefined
      }
      generate_pm_work_order: {
        Args: {
          p_trigger_id: string
          p_occurrence: string
        }
        Returns: string
      }
      next_number: {
        Args: {
          p_org_id: string
          p_key: string
          p_prefix: string
        }
        Returns: string
      }
      accept_org_invitation: {
        Args: {
          p_token: string
        }
        Returns: string
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
