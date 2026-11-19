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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          end_date: string
          fiscal_year_id: string
          id: string
          name: string
          start_date: string
          status: string
          tenant_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          end_date: string
          fiscal_year_id: string
          id?: string
          name: string
          start_date: string
          status?: string
          tenant_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          end_date?: string
          fiscal_year_id?: string
          id?: string
          name?: string
          start_date?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_fiscal_year_id_fkey"
            columns: ["fiscal_year_id"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          cash_flow_category: string
          code: string
          created_at: string
          currency_code: string | null
          description: string | null
          id: string
          is_active: boolean
          is_group: boolean
          is_system: boolean
          name_ar: string
          name_en: string | null
          parent_id: string | null
          subtype: string | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          cash_flow_category?: string
          code: string
          created_at?: string
          currency_code?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_group?: boolean
          is_system?: boolean
          name_ar: string
          name_en?: string | null
          parent_id?: string | null
          subtype?: string | null
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          cash_flow_category?: string
          code?: string
          created_at?: string
          currency_code?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_group?: boolean
          is_system?: boolean
          name_ar?: string
          name_en?: string | null
          parent_id?: string | null
          subtype?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          comment: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          entity_id: string
          entity_type: string
          id: string
          requested_by: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          requested_by?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          requested_by?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip: string | null
          scope: string
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip?: string | null
          scope: string
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip?: string | null
          scope?: string
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      bank_reconciliations: {
        Row: {
          financial_account_id: string
          line_id: string
          reconciled_at: string
          reconciled_by: string | null
          statement_date: string | null
          tenant_id: string
        }
        Insert: {
          financial_account_id: string
          line_id: string
          reconciled_at?: string
          reconciled_by?: string | null
          statement_date?: string | null
          tenant_id: string
        }
        Update: {
          financial_account_id?: string
          line_id?: string
          reconciled_at?: string
          reconciled_by?: string | null
          statement_date?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: true
            referencedRelation: "journal_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_main: boolean
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_main?: boolean
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_main?: boolean
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          approval_note: string | null
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          category_id: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          description: string | null
          exchange_rate: number
          financial_account_id: string
          id: string
          journal_entry_id: string | null
          kind: string
          number: string
          party_id: string | null
          payment_method: string
          reference: string | null
          status: string
          tax_amount: number
          tax_rate_id: string | null
          tenant_id: string
          total: number
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          category_id: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code: string
          description?: string | null
          exchange_rate?: number
          financial_account_id: string
          id?: string
          journal_entry_id?: string | null
          kind: string
          number: string
          party_id?: string | null
          payment_method?: string
          reference?: string | null
          status: string
          tax_amount?: number
          tax_rate_id?: string | null
          tenant_id: string
          total: number
          transaction_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          category_id?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          exchange_rate?: number
          financial_account_id?: string
          id?: string
          journal_entry_id?: string | null
          kind?: string
          number?: string
          party_id?: string | null
          payment_method?: string
          reference?: string | null
          status?: string
          tax_amount?: number
          tax_rate_id?: string | null
          tenant_id?: string
          total?: number
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cash_transactions_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_active: boolean
          kind: string
          name_ar: string
          name_en: string | null
          tenant_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          name_ar: string
          name_en?: string | null
          tenant_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          name_ar?: string
          name_en?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency_code: string
          exchange_rate: number
          id: string
          journal_entry_id: string | null
          kind: string
          note_date: string
          number: string
          party_id: string
          purchase_invoice_id: string | null
          reason: string
          sales_invoice_id: string | null
          status: string
          tax_amount: number
          tenant_id: string
          total: number
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency_code: string
          exchange_rate?: number
          id?: string
          journal_entry_id?: string | null
          kind: string
          note_date: string
          number: string
          party_id: string
          purchase_invoice_id?: string | null
          reason: string
          sales_invoice_id?: string | null
          status?: string
          tax_amount?: number
          tenant_id: string
          total: number
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency_code?: string
          exchange_rate?: number
          id?: string
          journal_entry_id?: string | null
          kind?: string
          note_date?: string
          number?: string
          party_id?: string
          purchase_invoice_id?: string | null
          reason?: string
          sales_invoice_id?: string | null
          status?: string
          tax_amount?: number
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "credit_notes_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_sales_invoice_id_fkey"
            columns: ["sales_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          decimals: number
          is_active: boolean
          name_ar: string
          name_en: string
          symbol: string
        }
        Insert: {
          code: string
          decimals?: number
          is_active?: boolean
          name_ar: string
          name_en: string
          symbol: string
        }
        Update: {
          code?: string
          decimals?: number
          is_active?: boolean
          name_ar?: string
          name_en?: string
          symbol?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          created_at: string
          created_by: string | null
          currency_code: string
          id: string
          rate: number
          rate_date: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency_code: string
          id?: string
          rate: number
          rate_date: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          rate?: number
          rate_date?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_id: string
          account_number: string | null
          bank_name: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          iban: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          account_number?: string | null
          bank_name?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code: string
          iban?: string | null
          id?: string
          is_active?: boolean
          kind: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_number?: string | null
          bank_name?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "financial_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_years: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_entry_id: string | null
          created_at: string
          end_date: string
          id: string
          name: string
          start_date: string
          status: string
          tenant_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_entry_id?: string | null
          created_at?: string
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: string
          tenant_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_entry_id?: string | null
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_years_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          approved_by: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          id: string
          number: string | null
          period_id: string | null
          posted_at: string | null
          posted_by: string | null
          reversal_of: string | null
          reversed_by: string | null
          source_id: string | null
          source_type: string
          status: string
          tenant_id: string
          total_credit: number
          total_debit: number
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date: string
          id?: string
          number?: string | null
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          tenant_id: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          id?: string
          number?: string | null
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          tenant_id?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          branch_id: string | null
          cost_center_id: string | null
          created_at: string
          credit: number
          currency_code: string | null
          debit: number
          description: string | null
          entry_id: string
          fc_amount: number | null
          fx_rate: number
          id: string
          line_no: number
          party_id: string | null
          tenant_id: string
        }
        Insert: {
          account_id: string
          branch_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          currency_code?: string | null
          debit?: number
          description?: string | null
          entry_id: string
          fc_amount?: number | null
          fx_rate?: number
          id?: string
          line_no: number
          party_id?: string | null
          tenant_id: string
        }
        Update: {
          account_id?: string
          branch_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          currency_code?: string | null
          debit?: number
          description?: string | null
          entry_id?: string
          fc_amount?: number | null
          fx_rate?: number
          id?: string
          line_no?: number
          party_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          tenant_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          tenant_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          tenant_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      numbering_sequences: {
        Row: {
          key: string
          next_value: number
          padding: number
          prefix: string
          tenant_id: string
        }
        Insert: {
          key: string
          next_value?: number
          padding?: number
          prefix: string
          tenant_id: string
        }
        Update: {
          key?: string
          next_value?: number
          padding?: number
          prefix?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "numbering_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          address: string | null
          city: string | null
          code: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          credit_limit: number
          email: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          notes: string | null
          payment_terms_days: number
          phone: string | null
          tax_number: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number
          email?: string | null
          id?: string
          is_active?: boolean
          kind: string
          name: string
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          tax_number?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number
          email?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          tax_number?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          id: string
          payment_id: string
          purchase_invoice_id: string | null
          sales_invoice_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          id?: string
          payment_id: string
          purchase_invoice_id?: string | null
          sales_invoice_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          id?: string
          payment_id?: string
          purchase_invoice_id?: string | null
          sales_invoice_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_sales_invoice_id_fkey"
            columns: ["sales_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency_code: string
          direction: string
          exchange_rate: number
          financial_account_id: string
          id: string
          journal_entry_id: string | null
          method: string
          notes: string | null
          number: string
          party_id: string
          payment_date: string
          reference: string | null
          status: string
          tenant_id: string
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency_code: string
          direction: string
          exchange_rate?: number
          financial_account_id: string
          id?: string
          journal_entry_id?: string | null
          method?: string
          notes?: string | null
          number: string
          party_id: string
          payment_date: string
          reference?: string | null
          status?: string
          tenant_id: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency_code?: string
          direction?: string
          exchange_rate?: number
          financial_account_id?: string
          id?: string
          journal_entry_id?: string | null
          method?: string
          notes?: string | null
          number?: string
          party_id?: string
          payment_date?: string
          reference?: string | null
          status?: string
          tenant_id?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payments_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          module: string
          name_ar: string
          name_en: string
          sort: number
        }
        Insert: {
          code: string
          module: string
          name_ar: string
          name_en: string
          sort?: number
        }
        Update: {
          code?: string
          module?: string
          name_ar?: string
          name_en?: string
          sort?: number
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          created_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          announcement: string | null
          billing_currency: string
          default_plan_code: string
          id: boolean
          self_registration: boolean
          support_email: string | null
          updated_at: string
        }
        Insert: {
          announcement?: string | null
          billing_currency?: string
          default_plan_code?: string
          id?: boolean
          self_registration?: boolean
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          announcement?: string | null
          billing_currency?: string
          default_plan_code?: string
          id?: boolean
          self_registration?: boolean
          support_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_billing_currency_fkey"
            columns: ["billing_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          avg_cost: number
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          purchase_price: number
          reorder_level: number
          sale_price: number
          sku: string
          tax_rate_id: string | null
          tenant_id: string
          type: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          avg_cost?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          purchase_price?: number
          reorder_level?: number
          sale_price?: number
          sku: string
          tax_rate_id?: string | null
          tenant_id: string
          type?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          avg_cost?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          purchase_price?: number
          reorder_level?: number
          sale_price?: number
          sku?: string
          tax_rate_id?: string | null
          tenant_id?: string
          type?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_locale: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_locale?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_invoice_items: {
        Row: {
          account_id: string | null
          description: string
          discount_pct: number
          id: string
          invoice_id: string
          line_discount: number
          line_no: number
          line_subtotal: number
          line_tax: number
          line_total: number
          product_id: string | null
          quantity: number
          tax_rate: number
          tax_rate_id: string | null
          tenant_id: string
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          description: string
          discount_pct?: number
          id?: string
          invoice_id: string
          line_discount?: number
          line_no: number
          line_subtotal?: number
          line_tax?: number
          line_total?: number
          product_id?: string | null
          quantity: number
          tax_rate?: number
          tax_rate_id?: string | null
          tenant_id: string
          unit_price: number
        }
        Update: {
          account_id?: string | null
          description?: string
          discount_pct?: number
          id?: string
          invoice_id?: string
          line_discount?: number
          line_no?: number
          line_subtotal?: number
          line_tax?: number
          line_total?: number
          product_id?: string | null
          quantity?: number
          tax_rate?: number
          tax_rate_id?: string | null
          tenant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoice_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoices: {
        Row: {
          amount_credited: number
          amount_paid: number
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          discount_total: number
          due_date: string
          exchange_rate: number
          id: string
          invoice_date: string
          journal_entry_id: string | null
          kind: string
          notes: string | null
          number: string | null
          posted_at: string | null
          posted_by: string | null
          status: string
          subtotal: number
          supplier_id: string
          supplier_reference: string | null
          tax_total: number
          tenant_id: string
          total: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          warehouse_id: string | null
        }
        Insert: {
          amount_credited?: number
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code: string
          discount_total?: number
          due_date: string
          exchange_rate?: number
          id?: string
          invoice_date: string
          journal_entry_id?: string | null
          kind?: string
          notes?: string | null
          number?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string
          subtotal?: number
          supplier_id: string
          supplier_reference?: string | null
          tax_total?: number
          tenant_id: string
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          warehouse_id?: string | null
        }
        Update: {
          amount_credited?: number
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          discount_total?: number
          due_date?: string
          exchange_rate?: number
          id?: string
          invoice_date?: string
          journal_entry_id?: string | null
          kind?: string
          notes?: string | null
          number?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string
          supplier_reference?: string | null
          tax_total?: number
          tenant_id?: string
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "purchase_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_items: {
        Row: {
          account_id: string | null
          description: string
          discount_pct: number
          id: string
          invoice_id: string
          line_discount: number
          line_no: number
          line_subtotal: number
          line_tax: number
          line_total: number
          product_id: string | null
          quantity: number
          tax_rate: number
          tax_rate_id: string | null
          tenant_id: string
          unit_cost: number | null
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          description: string
          discount_pct?: number
          id?: string
          invoice_id: string
          line_discount?: number
          line_no: number
          line_subtotal?: number
          line_tax?: number
          line_total?: number
          product_id?: string | null
          quantity: number
          tax_rate?: number
          tax_rate_id?: string | null
          tenant_id: string
          unit_cost?: number | null
          unit_price: number
        }
        Update: {
          account_id?: string | null
          description?: string
          discount_pct?: number
          id?: string
          invoice_id?: string
          line_discount?: number
          line_no?: number
          line_subtotal?: number
          line_tax?: number
          line_total?: number
          product_id?: string | null
          quantity?: number
          tax_rate?: number
          tax_rate_id?: string | null
          tenant_id?: string
          unit_cost?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          amount_credited: number
          amount_paid: number
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          customer_id: string
          discount_total: number
          due_date: string
          exchange_rate: number
          id: string
          invoice_date: string
          journal_entry_id: string | null
          kind: string
          notes: string | null
          number: string | null
          posted_at: string | null
          posted_by: string | null
          status: string
          subtotal: number
          tax_total: number
          tenant_id: string
          terms: string | null
          total: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          warehouse_id: string | null
        }
        Insert: {
          amount_credited?: number
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code: string
          customer_id: string
          discount_total?: number
          due_date: string
          exchange_rate?: number
          id?: string
          invoice_date: string
          journal_entry_id?: string | null
          kind?: string
          notes?: string | null
          number?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          tenant_id: string
          terms?: string | null
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          warehouse_id?: string | null
        }
        Update: {
          amount_credited?: number
          amount_paid?: number
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id?: string
          discount_total?: number
          due_date?: string
          exchange_rate?: number
          id?: string
          invoice_date?: string
          journal_entry_id?: string | null
          kind?: string
          notes?: string | null
          number?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string
          subtotal?: number
          tax_total?: number
          tenant_id?: string
          terms?: string | null
          total?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_documents: {
        Row: {
          counter_account_id: string | null
          created_at: string
          created_by: string | null
          doc_date: string
          doc_type: string
          id: string
          journal_entry_id: string | null
          notes: string | null
          number: string
          tenant_id: string
          to_warehouse_id: string | null
          total_value: number
          warehouse_id: string
        }
        Insert: {
          counter_account_id?: string | null
          created_at?: string
          created_by?: string | null
          doc_date: string
          doc_type: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          number: string
          tenant_id: string
          to_warehouse_id?: string | null
          total_value?: number
          warehouse_id: string
        }
        Update: {
          counter_account_id?: string | null
          created_at?: string
          created_by?: string | null
          doc_date?: string
          doc_type?: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          number?: string
          tenant_id?: string
          to_warehouse_id?: string | null
          total_value?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_documents_counter_account_id_fkey"
            columns: ["counter_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_documents_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_documents_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_documents_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          product_id: string
          quantity: number
          tenant_id: string
          warehouse_id: string
        }
        Insert: {
          product_id: string
          quantity?: number
          tenant_id: string
          warehouse_id: string
        }
        Update: {
          product_id?: string
          quantity?: number
          tenant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          avg_cost_after: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          movement_date: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          source_id: string
          source_type: string
          tenant_id: string
          total_cost: number
          unit_cost: number
          warehouse_id: string
        }
        Insert: {
          avg_cost_after?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          movement_date: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          source_id: string
          source_type: string
          tenant_id: string
          total_cost?: number
          unit_cost?: number
          warehouse_id: string
        }
        Update: {
          avg_cost_after?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          source_id?: string
          source_type?: string
          tenant_id?: string
          total_cost?: number
          unit_cost?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency_code: string
          due_date: string
          id: string
          issue_date: string
          notes: string | null
          number: string
          period_end: string
          period_start: string
          status: string
          subscription_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency_code: string
          due_date: string
          id?: string
          issue_date?: string
          notes?: string | null
          number: string
          period_end: string
          period_start: string
          status?: string
          subscription_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency_code?: string
          due_date?: string
          id?: string
          issue_date?: string
          notes?: string | null
          number?: string
          period_end?: string
          period_start?: string
          status?: string
          subscription_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          currency_code: string
          id: string
          invoice_id: string
          method: string
          notes: string | null
          paid_at: string
          recorded_by: string | null
          reference: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency_code: string
          id?: string
          invoice_id: string
          method?: string
          notes?: string | null
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency_code?: string
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "subscription_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "subscription_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          advanced_reports: boolean
          code: string
          created_at: string
          currency_code: string
          description_ar: string | null
          description_en: string | null
          id: string
          inventory_enabled: boolean
          is_active: boolean
          max_branches: number
          max_users: number
          name_ar: string
          name_en: string
          price_annual: number
          price_monthly: number
          sort: number
          storage_mb: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          advanced_reports?: boolean
          code: string
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          inventory_enabled?: boolean
          is_active?: boolean
          max_branches?: number
          max_users?: number
          name_ar: string
          name_en: string
          price_annual?: number
          price_monthly?: number
          sort?: number
          storage_mb?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          advanced_reports?: boolean
          code?: string
          created_at?: string
          currency_code?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          inventory_enabled?: boolean
          is_active?: boolean
          max_branches?: number
          max_users?: number
          name_ar?: string
          name_en?: string
          price_annual?: number
          price_monthly?: number
          sort?: number
          storage_mb?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          created_by: string | null
          current_period_end: string | null
          id: string
          is_current: boolean
          notes: string | null
          plan_id: string
          started_at: string
          status: string
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          plan_id: string
          started_at?: string
          status: string
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          plan_id?: string
          started_at?: string
          status?: string
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          applies_to: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          rate: number
          tenant_id: string
        }
        Insert: {
          applies_to?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          rate: number
          tenant_id: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rate?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "tenant_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          created_at: string
          default_branch_id: string | null
          id: string
          role_id: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_branch_id?: string | null
          id?: string
          role_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_branch_id?: string | null
          id?: string
          role_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_default_branch_id_fkey"
            columns: ["default_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_memberships_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "tenant_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_role_permissions: {
        Row: {
          permission_code: string
          role_id: string
          tenant_id: string
        }
        Insert: {
          permission_code: string
          role_id: string
          tenant_id: string
        }
        Update: {
          permission_code?: string
          role_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tenant_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "tenant_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name_ar: string
          name_en: string | null
          tenant_id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name_ar: string
          name_en?: string | null
          tenant_id: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name_ar?: string
          name_en?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          allow_negative_stock: boolean
          base_currency: string
          business_type: string | null
          city: string | null
          commercial_register: string | null
          country_code: string
          created_at: string
          created_by: string | null
          default_locale: string
          email: string | null
          fiscal_year_start_month: number
          id: string
          inventory_enabled: boolean
          legal_name: string | null
          name: string
          onboarding_completed: boolean
          phone: string | null
          require_expense_approval: boolean
          require_purchase_approval: boolean
          require_sales_approval: boolean
          status: string
          suspended_reason: string | null
          tax_number: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          allow_negative_stock?: boolean
          base_currency?: string
          business_type?: string | null
          city?: string | null
          commercial_register?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          default_locale?: string
          email?: string | null
          fiscal_year_start_month?: number
          id?: string
          inventory_enabled?: boolean
          legal_name?: string | null
          name: string
          onboarding_completed?: boolean
          phone?: string | null
          require_expense_approval?: boolean
          require_purchase_approval?: boolean
          require_sales_approval?: boolean
          status?: string
          suspended_reason?: string | null
          tax_number?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          allow_negative_stock?: boolean
          base_currency?: string
          business_type?: string | null
          city?: string | null
          commercial_register?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          default_locale?: string
          email?: string | null
          fiscal_year_start_month?: number
          id?: string
          inventory_enabled?: boolean
          legal_name?: string | null
          name?: string
          onboarding_completed?: boolean
          phone?: string | null
          require_expense_approval?: boolean
          require_purchase_approval?: boolean
          require_sales_approval?: boolean
          status?: string
          suspended_reason?: string | null
          tax_number?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_base_currency_fkey"
            columns: ["base_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      transfers: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          from_account_id: string
          from_rate: number
          id: string
          journal_entry_id: string | null
          notes: string | null
          number: string
          reference: string | null
          status: string
          tenant_id: string
          to_account_id: string
          to_amount: number
          to_rate: number
          transfer_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          from_account_id: string
          from_rate?: number
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          number: string
          reference?: string | null
          status?: string
          tenant_id: string
          to_account_id: string
          to_amount: number
          to_rate?: number
          transfer_date: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          from_account_id?: string
          from_rate?: number
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          number?: string
          reference?: string | null
          status?: string
          tenant_id?: string
          to_account_id?: string
          to_amount?: number
          to_rate?: number
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          id: string
          name: string
          symbol: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          symbol?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          symbol?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string
        }
        Insert: {
          branch_id?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _acct: { Args: { _subtype: string; _tenant: string }; Returns: string }
      _aging_rows: {
        Args: { _as_of: string; _kind: string; _tenant: string }
        Returns: {
          b_30: number
          b_60: number
          b_90: number
          b_current: number
          b_over: number
          party_id: string
          party_name: string
          total: number
        }[]
      }
      _can_report: { Args: { _tenant: string }; Returns: undefined }
      _create_company: {
        Args: {
          _cycle: string
          _owner: string
          _p: Json
          _period_end: string
          _plan_id: string
          _status: string
        }
        Returns: string
      }
      _create_entry: {
        Args: {
          _branch: string
          _date: string
          _desc: string
          _lines: Json
          _source_id: string
          _source_type: string
          _tenant: string
        }
        Returns: string
      }
      _create_fiscal_year: {
        Args: { _start: string; _tenant: string }
        Returns: string
      }
      _fa_balance: { Args: { _fa: string }; Returns: number }
      _insert_lines: {
        Args: { _branch: string; _entry: string; _lines: Json; _tenant: string }
        Returns: number
      }
      _max_users: { Args: { _t: string }; Returns: number }
      _next_number: { Args: { _key: string; _tenant: string }; Returns: string }
      _period_for: { Args: { _date: string; _tenant: string }; Returns: string }
      _post_cash_transaction: { Args: { _id: string }; Returns: undefined }
      _post_entry: { Args: { _entry: string }; Returns: undefined }
      _require: { Args: { _perm: string; _tenant: string }; Returns: undefined }
      _reverse_entry: {
        Args: { _date: string; _entry: string; _reason: string }
        Returns: string
      }
      _setup_tenant: {
        Args: { _fy_start: string; _owner: string; _tenant: string }
        Returns: undefined
      }
      _stock_move: {
        Args: {
          _date: string
          _mtype: string
          _notes: string
          _product: string
          _qty: number
          _src_id: string
          _src_type: string
          _t: string
          _unit_cost: number
          _wh: string
        }
        Returns: number
      }
      accept_invitation: { Args: { _id: string }; Returns: string }
      approve_purchase_invoice: { Args: { _id: string }; Returns: undefined }
      approve_sales_invoice: { Args: { _id: string }; Returns: undefined }
      can_write: { Args: { _perm: string; _tenant: string }; Returns: boolean }
      close_fiscal_year: { Args: { _fy: string }; Returns: string }
      create_cash_transaction: { Args: { _p: Json }; Returns: string }
      create_credit_note: { Args: { _p: Json }; Returns: string }
      create_financial_account: { Args: { _p: Json }; Returns: string }
      create_fiscal_year: {
        Args: { _start: string; _tenant: string }
        Returns: string
      }
      create_party: { Args: { _p: Json }; Returns: string }
      create_stock_document: { Args: { _p: Json }; Returns: string }
      create_transfer: { Args: { _p: Json }; Returns: string }
      dashboard_summary: {
        Args: { _branch?: string; _from: string; _tenant: string; _to: string }
        Returns: Json
      }
      decide_cash_transaction: {
        Args: { _approve: boolean; _id: string; _note: string }
        Returns: undefined
      }
      delete_journal_draft: { Args: { _id: string }; Returns: undefined }
      delete_purchase_invoice: { Args: { _id: string }; Returns: undefined }
      delete_sales_invoice: { Args: { _id: string }; Returns: undefined }
      financial_account_balances: {
        Args: { _tenant: string }
        Returns: {
          balance: number
          balance_base: number
          financial_account_id: string
          last_activity: string
        }[]
      }
      get_exchange_rate: {
        Args: { _currency: string; _date: string; _tenant: string }
        Returns: number
      }
      has_perm: { Args: { _perm: string; _tenant: string }; Returns: boolean }
      has_platform_role: { Args: { _roles: string[] }; Returns: boolean }
      invite_member: {
        Args: { _email: string; _role: string; _tenant: string }
        Returns: string
      }
      is_member: { Args: { _tenant: string }; Returns: boolean }
      is_platform_admin: { Args: { _uid?: string }; Returns: boolean }
      log_action: {
        Args: {
          _action: string
          _details?: Json
          _entity_id: string
          _entity_type: string
          _scope: string
          _tenant: string
        }
        Returns: undefined
      }
      my_companies: { Args: never; Returns: Json }
      my_invitations: { Args: never; Returns: Json }
      my_tenant_context: { Args: { _tenant: string }; Returns: Json }
      party_balances: {
        Args: { _kind: string; _tenant: string }
        Returns: {
          balance: number
          open_invoices: number
          party_id: string
        }[]
      }
      post_journal_entry: { Args: { _id: string }; Returns: undefined }
      post_purchase_invoice: { Args: { _id: string }; Returns: undefined }
      post_sales_invoice: { Args: { _id: string }; Returns: undefined }
      public_platform_info: { Args: never; Returns: Json }
      record_payment: { Args: { _p: Json }; Returns: string }
      register_company: { Args: { _p: Json }; Returns: string }
      report_account_ledger: {
        Args: {
          _account: string
          _branch?: string
          _from: string
          _tenant: string
          _to: string
        }
        Returns: Json
      }
      report_aging: {
        Args: { _as_of: string; _kind: string; _tenant: string }
        Returns: Json
      }
      report_cash_flow: {
        Args: { _branch?: string; _from: string; _tenant: string; _to: string }
        Returns: Json
      }
      report_party_statement: {
        Args: { _from: string; _party: string; _tenant: string; _to: string }
        Returns: Json
      }
      report_trial_balance: {
        Args: {
          _branch?: string
          _exclude_closing?: boolean
          _from: string
          _tenant: string
          _to: string
        }
        Returns: {
          account_id: string
          cash_flow_category: string
          closing: number
          code: string
          credit: number
          debit: number
          name_ar: string
          name_en: string
          opening: number
          parent_id: string
          subtype: string
          type: string
        }[]
      }
      reverse_journal_entry: {
        Args: { _date: string; _id: string; _reason: string }
        Returns: string
      }
      revoke_invitation: { Args: { _id: string }; Returns: undefined }
      save_journal_entry: { Args: { _p: Json }; Returns: string }
      save_purchase_invoice: { Args: { _p: Json }; Returns: string }
      save_sales_invoice: { Args: { _p: Json }; Returns: string }
      set_period_status: {
        Args: { _period: string; _status: string }
        Returns: undefined
      }
      shares_tenant: { Args: { _other: string }; Returns: boolean }
      tenant_operational: { Args: { _tenant: string }; Returns: boolean }
      update_member: {
        Args: {
          _branch: string
          _membership: string
          _role: string
          _status: string
        }
        Returns: undefined
      }
      void_cash_transaction: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      void_credit_note: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      void_payment: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      void_purchase_invoice: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      void_sales_invoice: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      void_transfer: {
        Args: { _id: string; _reason: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
