// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          name_en: string | null;
          name_fr: string | null;
          color: string;
          parent_id: string | null;
          user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_en?: string | null;
          name_fr?: string | null;
          color: string;
          parent_id?: string | null;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_en?: string | null;
          name_fr?: string | null;
          color?: string;
          parent_id?: string | null;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          amount: number;
          currency: string;
          category_id: string | null;
          expense_date: string;
          active?: boolean;
          expense_type?: "fixed_recurring" | "fixed_once" | "variable";
          match_mode?: "merchant" | "category" | "manual" | "none";
          match_pattern?: string | null;
          amount_tolerance_cents?: number;
          date_tolerance_days?: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          amount: number;
          currency?: string;
          category_id?: string | null;
          expense_date?: string;
          active?: boolean;
          expense_type?: "fixed_recurring" | "fixed_once" | "variable";
          match_mode?: "merchant" | "category" | "manual" | "none";
          match_pattern?: string | null;
          amount_tolerance_cents?: number;
          date_tolerance_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          amount?: number;
          currency?: string;
          category_id?: string | null;
          expense_date?: string;
          active?: boolean;
          expense_type?: "fixed_recurring" | "fixed_once" | "variable";
          match_mode?: "merchant" | "category" | "manual" | "none";
          match_pattern?: string | null;
          amount_tolerance_cents?: number;
          date_tolerance_days?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      category_budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          amount_cents: number;
          currency: string;
          effective_month: string;
          active: boolean;
          forecast: "variable" | "fixed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          amount_cents: number;
          currency?: string;
          effective_month: string;
          active?: boolean;
          forecast?: "variable" | "fixed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          amount_cents?: number;
          currency?: string;
          effective_month?: string;
          active?: boolean;
          forecast?: "variable" | "fixed";
          created_at?: string;
          updated_at?: string;
        };
      };
      expense_occurrences: {
        Row: {
          id: string;
          user_id: string;
          expense_id: string;
          month: string;
          planned_cents: number;
          expected_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expense_id: string;
          month: string;
          planned_cents: number;
          expected_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          expense_id?: string;
          month?: string;
          planned_cents?: number;
          expected_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      expense_transaction_links: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string;
          occurrence_id: string;
          allocated_cents: number;
          status: "suggested" | "confirmed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_id: string;
          occurrence_id: string;
          allocated_cents: number;
          status: "suggested" | "confirmed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_id?: string;
          occurrence_id?: string;
          allocated_cents?: number;
          status?: "suggested" | "confirmed";
          created_at?: string;
          updated_at?: string;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
      };
      bank_imports: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          row_count: number;
          imported_count: number;
          duplicate_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          row_count?: number;
          imported_count?: number;
          duplicate_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          row_count?: number;
          imported_count?: number;
          duplicate_count?: number;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          import_id: string;
          transaction_date: string;
          booking_date: string | null;
          account_number: string | null;
          account_label: string | null;
          operation_label: string | null;
          full_label: string;
          bank_category: string | null;
          bank_subcategory: string | null;
          amount_cents: number;
          currency?: string;
          pointed: boolean;
          kind: "expense" | "income" | "transfer";
          normalized_merchant: string;
          category_id: string | null;
          needs_review: boolean;
          fingerprint: string;
          occurrence: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          import_id: string;
          transaction_date: string;
          booking_date?: string | null;
          account_number?: string | null;
          account_label?: string | null;
          operation_label?: string | null;
          full_label: string;
          bank_category?: string | null;
          bank_subcategory?: string | null;
          amount_cents: number;
          currency?: string;
          pointed?: boolean;
          kind: "expense" | "income" | "transfer";
          normalized_merchant: string;
          category_id?: string | null;
          needs_review?: boolean;
          fingerprint: string;
          occurrence: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          import_id?: string;
          transaction_date?: string;
          booking_date?: string | null;
          account_number?: string | null;
          account_label?: string | null;
          operation_label?: string | null;
          full_label?: string;
          bank_category?: string | null;
          bank_subcategory?: string | null;
          amount_cents?: number;
          pointed?: boolean;
          kind?: "expense" | "income" | "transfer";
          normalized_merchant?: string;
          category_id?: string | null;
          needs_review?: boolean;
          fingerprint?: string;
          occurrence?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      categorization_rules: {
        Row: {
          id: string;
          user_id: string;
          pattern: string;
          category_id: string;
          amount_cents: number | null;
          kind: "expense" | "income" | "transfer" | null;
          needs_review: boolean;
          priority: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pattern: string;
          category_id: string;
          amount_cents?: number | null;
          kind?: "expense" | "income" | "transfer" | null;
          needs_review?: boolean;
          priority?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          pattern?: string;
          category_id?: string;
          amount_cents?: number | null;
          kind?: "expense" | "income" | "transfer" | null;
          needs_review?: boolean;
          priority?: number;
          created_at?: string;
        };
      };
      monthly_snapshots: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          net_income: number;
          total_expenses: number;
          available: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: string;
          net_income?: number;
          total_expenses?: number;
          available?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          net_income?: number;
          total_expenses?: number;
          available?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          salary_net: number;
          tax_withholding_rate?: number | null;
          currency: string;
          theme?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          salary_net?: number;
          tax_withholding_rate?: number | null;
          currency?: string;
          theme?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          salary_net?: number;
          tax_withholding_rate?: number | null;
          currency?: string;
          theme?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      month_opening_balances: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          amount_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: string;
          amount_cents: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          amount_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

