import {
  Group,
  GroupMember,
  Expense,
  Allocation,
  FairnessEvent,
  PayPalInvoice,
  GroupRule,
  SubscriptionItem,
  WebhookEventRecord,
} from './types';
import {
  SAMPLE_GROUP,
  SAMPLE_MEMBERS,
  INITIAL_GROUP_RULES,
  SAMPLE_EXPENSES,
  INITIAL_SUBSCRIPTIONS,
} from './sampleData';

// Global in-memory storage singleton for Next.js dev & serverless runtime
interface StorageState {
  group: Group;
  members: GroupMember[];
  rules: GroupRule[];
  expenses: Record<string, Expense>;
  allocations: Record<string, Allocation[]>;
  invoices: Record<string, PayPalInvoice>;
  fairnessEvents: FairnessEvent[];
  subscriptions: SubscriptionItem[];
  webhookEvents: Record<string, WebhookEventRecord>;
}

declare global {
  // eslint-disable-next-line no-var
  var __settle_db: StorageState | undefined;
}

function initStorage(): StorageState {
  const initialExpenses: Record<string, Expense> = {};
  const restaurantExp = SAMPLE_EXPENSES.restaurant as Expense;
  if (restaurantExp && restaurantExp.id) {
    initialExpenses[restaurantExp.id] = restaurantExp;
  }
  const tripExp = SAMPLE_EXPENSES.trip as Expense;
  if (tripExp && tripExp.id) {
    initialExpenses[tripExp.id] = tripExp;
  }

  const initialEvents: FairnessEvent[] = [
    {
      id: 'event_init_1',
      expense_id: 'exp_restaurant_001',
      actor: 'AI Extraction Engine',
      event_type: 'EXTRACTION',
      explanation: 'Extracted 7 line items from receipt with $159.00 subtotal, $13.52 tax, $28.62 tip.',
      created_at: '2026-11-10T20:45:30Z',
    },
    {
      id: 'event_init_2',
      expense_id: 'exp_restaurant_001',
      actor: 'Group Memory',
      event_type: 'RULE_APPLIED',
      explanation: 'Group Rule #1 honored: Meera Patel is excluded from 2x Craft Hazy IPA ($18.00).',
      created_at: '2026-11-10T20:46:00Z',
    },
  ];

  return {
    group: SAMPLE_GROUP,
    members: [...SAMPLE_MEMBERS],
    rules: [...INITIAL_GROUP_RULES],
    expenses: initialExpenses,
    allocations: {},
    invoices: {},
    fairnessEvents: initialEvents,
    subscriptions: [...INITIAL_SUBSCRIPTIONS],
    webhookEvents: {},
  };
}

const dbState: StorageState = global.__settle_db || initStorage();
if (process.env.NODE_ENV !== 'production') {
  global.__settle_db = dbState;
}

export const db = {
  // Group & Members
  getGroup: async (): Promise<Group> => dbState.group,
  getMembers: async (): Promise<GroupMember[]> => dbState.members,
  getMemberById: async (id: string): Promise<GroupMember | undefined> =>
    dbState.members.find((m) => m.id === id),

  // Group Rules (Group Memory)
  getGroupRules: async (): Promise<GroupRule[]> => dbState.rules,
  saveGroupRule: async (rule: GroupRule): Promise<GroupRule> => {
    const existingIdx = dbState.rules.findIndex((r) => r.id === rule.id);
    if (existingIdx >= 0) {
      dbState.rules[existingIdx] = rule;
    } else {
      dbState.rules.push(rule);
    }
    return rule;
  },
  toggleGroupRule: async (id: string): Promise<GroupRule | undefined> => {
    const rule = dbState.rules.find((r) => r.id === id);
    if (rule) {
      rule.active = !rule.active;
    }
    return rule;
  },

  // Expenses
  getExpenses: async (): Promise<Expense[]> => Object.values(dbState.expenses),
  getExpenseById: async (id: string): Promise<Expense | undefined> => dbState.expenses[id],
  saveExpense: async (expense: Expense): Promise<Expense> => {
    dbState.expenses[expense.id] = expense;
    return expense;
  },

  // Allocations
  getAllocationsByExpense: async (expenseId: string): Promise<Allocation[]> =>
    dbState.allocations[expenseId] || [],
  saveAllocations: async (expenseId: string, allocations: Allocation[]): Promise<Allocation[]> => {
    dbState.allocations[expenseId] = allocations;
    return allocations;
  },
  approveAllocation: async (expenseId: string): Promise<boolean> => {
    const list = dbState.allocations[expenseId];
    if (list) {
      list.forEach((a) => (a.approved = true));
      if (dbState.expenses[expenseId]) {
        dbState.expenses[expenseId].status = 'approved';
      }
      return true;
    }
    return false;
  },

  // Fairness Ledger Events
  getFairnessEvents: async (expenseId?: string): Promise<FairnessEvent[]> => {
    if (expenseId) {
      return dbState.fairnessEvents.filter((e) => e.expense_id === expenseId);
    }
    return dbState.fairnessEvents;
  },
  logFairnessEvent: async (event: Omit<FairnessEvent, 'id' | 'created_at'>): Promise<FairnessEvent> => {
    const fullEvent: FairnessEvent = {
      ...event,
      id: `fe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    dbState.fairnessEvents.unshift(fullEvent);
    return fullEvent;
  },

  // PayPal Invoices
  getInvoices: async (): Promise<PayPalInvoice[]> => Object.values(dbState.invoices),
  getInvoiceByPayPalId: async (paypalId: string): Promise<PayPalInvoice | undefined> => {
    return Object.values(dbState.invoices).find((inv) => inv.paypal_invoice_id === paypalId);
  },
  saveInvoice: async (invoice: PayPalInvoice): Promise<PayPalInvoice> => {
    dbState.invoices[invoice.id] = invoice;
    return invoice;
  },
  updateInvoiceStatus: async (
    paypalInvoiceId: string,
    status: PayPalInvoice['status']
  ): Promise<PayPalInvoice | undefined> => {
    const invoice = Object.values(dbState.invoices).find(
      (inv) => inv.paypal_invoice_id === paypalInvoiceId
    );
    if (invoice) {
      invoice.status = status;
      if (status === 'PAID') {
        invoice.paid_at = new Date().toISOString();
      }
      return invoice;
    }
    return undefined;
  },

  // Webhook Deduplication
  webhookEventExists: async (eventId: string): Promise<boolean> => {
    return Boolean(dbState.webhookEvents[eventId]);
  },
  saveWebhookEvent: async (event: any): Promise<void> => {
    dbState.webhookEvents[event.id] = {
      event_id: event.id,
      event_type: event.event_type,
      invoice_id: event.resource?.id || '',
      payload: event,
      processed_at: new Date().toISOString(),
    };
  },
  getWebhookEvents: async (): Promise<WebhookEventRecord[]> =>
    Object.values(dbState.webhookEvents),

  // Subscriptions (Recurring Cost Radar)
  getSubscriptions: async (): Promise<SubscriptionItem[]> => dbState.subscriptions,
  saveSubscription: async (item: SubscriptionItem): Promise<SubscriptionItem> => {
    const idx = dbState.subscriptions.findIndex((s) => s.id === item.id);
    if (idx >= 0) {
      dbState.subscriptions[idx] = item;
    } else {
      dbState.subscriptions.push(item);
    }
    return item;
  },
};
