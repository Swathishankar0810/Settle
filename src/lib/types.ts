export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD';

export interface Group {
  id: string;
  name: string;
  owner_id: string;
  currency: Currency;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id?: string;
  display_name: string;
  email: string;
  paypal_email: string;
  income_share: number; // e.g., 1 for equal, or proportional e.g. 1.25, 0.75
  role: 'owner' | 'member' | 'admin';
  avatar?: string;
}

export interface ExpenseItem {
  id: string;
  expense_id: string;
  name: string;
  amount: number;
  quantity?: number;
  unit_price?: number;
  category?: string;
  shared_by: string[]; // member IDs
  allocation_rule?: string;
  confidence: number;
}

export interface SubscriptionInfo {
  is_recurring: boolean;
  provider: string | null;
  billing_cycle: 'monthly' | 'annual' | 'weekly' | null;
  next_renewal_date: string | null;
  cancellation_url: string | null;
}

export interface RawAiOutput {
  merchant: string | null;
  merchant_category: string | null;
  transaction_date: string | null;
  currency: Currency | string | null;
  subtotal: number | null;
  tax: number | null;
  service_charge: number | null;
  tip: number | null;
  discount: number | null;
  total: number | null;
  payer: string | null;
  payment_method: string | null;
  line_items: {
    name: string;
    quantity: number;
    unit_price: number | null;
    amount: number;
    category: string | null;
    confidence: number;
  }[];
  subscription: SubscriptionInfo;
  uncertainties: string[];
}

export interface Expense {
  id: string;
  group_id: string;
  merchant: string;
  merchant_category?: string;
  expense_date: string;
  currency: Currency;
  subtotal: number;
  tax: number;
  service_charge: number;
  tip: number;
  discount: number;
  total: number;
  payer_member_id: string;
  source_type: 'receipt' | 'invoice' | 'email' | 'manual';
  source_url?: string;
  raw_ai_output?: RawAiOutput;
  status: 'draft' | 'allocated' | 'approved' | 'invoiced' | 'settled';
  created_at: string;
  items?: ExpenseItem[];
}

export type AllocationRuleType =
  | 'EQUAL'
  | 'ITEM_BASED'
  | 'USAGE_BASED'
  | 'PROPORTIONAL'
  | 'PAYER_REIMBURSEMENT'
  | 'CUSTOM';

export interface AllocationDetailItem {
  name: string;
  amount: number;
  share_ratio?: number;
}

export interface Allocation {
  id: string;
  expense_id: string;
  member_id: string;
  member_name: string;
  amount: number;
  currency: Currency;
  rule: AllocationRuleType | string;
  explanation: string;
  items_breakdown?: AllocationDetailItem[];
  tax_share?: number;
  tip_share?: number;
  approved: boolean;
}

export interface FairnessEvent {
  id: string;
  expense_id: string;
  actor: string;
  event_type:
    | 'EXTRACTION'
    | 'RULE_APPLIED'
    | 'CONVERSATIONAL_EDIT'
    | 'ITEM_REASSIGNED'
    | 'MEMBER_EXEMPTED'
    | 'APPROVED'
    | 'INVOICE_SENT'
    | 'INVOICE_PAID'
    | 'INVOICE_CANCELLED';
  before_state?: any;
  after_state?: any;
  explanation: string;
  created_at: string;
}

export type PayPalInvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'PAID'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'OVERDUE';

export interface PayPalInvoice {
  id: string;
  expense_id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  paypal_invoice_id: string;
  status: PayPalInvoiceStatus;
  amount: number;
  currency: Currency;
  payment_link?: string;
  qr_code_url?: string;
  sent_at?: string;
  paid_at?: string;
  note?: string;
}

export interface GroupRule {
  id: string;
  group_id: string;
  title: string;
  description: string;
  rule_type: 'equal_split' | 'payer_reimbursement' | 'category_exemption' | 'income_weighted' | 'reminder';
  target_member_id?: string;
  target_category?: string;
  active: boolean;
  created_at: string;
}

export interface SubscriptionItem {
  id: string;
  group_id: string;
  service_name: string;
  category: string;
  provider: string;
  billing_cycle: 'monthly' | 'annual' | 'weekly';
  amount: number;
  currency: Currency;
  payer_member_id: string;
  active_member_ids: string[];
  next_renewal_date: string;
  cancellation_url?: string;
  last_used_date?: string;
  status: 'active' | 'flagged_unused' | 'review' | 'cancelled';
  recommendation?: {
    action: 'split_evenly' | 'downgrade' | 'cancel_unused' | 'rotate_payer';
    monthly_savings: number;
    annual_savings: number;
    reason: string;
    suggested_per_person: number;
  };
}

export interface WebhookEventRecord {
  event_id: string;
  event_type: string;
  invoice_id: string;
  payload: any;
  processed_at: string;
}
