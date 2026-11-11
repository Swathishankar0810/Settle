'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { ExpenseUpload } from '@/components/ExpenseUpload';
import { ReceiptItemizer } from '@/components/ReceiptItemizer';
import { AllocationRuleSelector } from '@/components/AllocationRuleSelector';
import { ConversationalAdjuster } from '@/components/ConversationalAdjuster';
import { FairnessLedgerCard } from '@/components/FairnessLedgerCard';
import { PayPalSettlementModal } from '@/components/PayPalSettlementModal';
import { SubscriptionRadar } from '@/components/SubscriptionRadar';
import { GroupMemoryPanel } from '@/components/GroupMemoryPanel';
import { WebhookInspector } from '@/components/WebhookInspector';
import {
  Expense,
  GroupMember,
  Allocation,
  GroupRule,
  FairnessEvent,
  PayPalInvoice,
  AllocationRuleType,
} from '@/lib/types';
import { SAMPLE_EXPENSES, SAMPLE_MEMBERS, INITIAL_GROUP_RULES } from '@/lib/sampleData';
import {
  Sparkles,
  Info,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('split');
  const [currentExpense, setCurrentExpense] = useState<Expense>(SAMPLE_EXPENSES.restaurant as Expense);
  const [members, setMembers] = useState<GroupMember[]>(SAMPLE_MEMBERS);
  const [rules, setRules] = useState<GroupRule[]>(INITIAL_GROUP_RULES);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [events, setEvents] = useState<FairnessEvent[]>([]);
  const [invoices, setInvoices] = useState<PayPalInvoice[]>([]);
  const [currentRule, setCurrentRule] = useState<AllocationRuleType>('ITEM_BASED');
  const [usageWeights, setUsageWeights] = useState<Record<string, number>>({});
  const [isLoadingExpense, setIsLoadingExpense] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isPayPalModalOpen, setIsPayPalModalOpen] = useState(false);
  const [lastAdjustment, setLastAdjustment] = useState<{
    confirmation: string;
    explanation: string;
  } | null>(null);

  // Initial calculation on mount
  useEffect(() => {
    runCalculation(currentExpense, currentRule, usageWeights);
    fetchLedgerEvents(currentExpense.id);
    fetchInvoices(currentExpense.id);
  }, []);

  const fetchLedgerEvents = async (expenseId?: string) => {
    try {
      const res = await fetch(`/api/ledger${expenseId ? `?expenseId=${expenseId}` : ''}`);
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInvoices = async (expenseId?: string) => {
    try {
      const res = await fetch(`/api/paypal/invoice${expenseId ? `?expenseId=${expenseId}` : ''}`);
      const data = await res.json();
      if (data.invoices) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const runCalculation = async (
    expenseToCalc: Expense,
    ruleToApply: AllocationRuleType,
    weights: Record<string, number> = {},
    conversationalPrompt?: string
  ) => {
    setIsCalculating(true);
    try {
      const res = await fetch('/api/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: expenseToCalc.id,
          rule: ruleToApply,
          customWeights: weights,
          payerMemberId: expenseToCalc.payer_member_id,
          conversationalPrompt,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAllocations(data.allocations || []);
        if (data.expense) {
          setCurrentExpense(data.expense);
        }
        if (data.conversationalAdjustment) {
          setLastAdjustment(data.conversationalAdjustment);
        }
        await fetchLedgerEvents(expenseToCalc.id);
      }
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExpenseLoaded = (newExpense: Expense) => {
    setCurrentExpense(newExpense);
    setCurrentRule('ITEM_BASED');
    setLastAdjustment(null);
    runCalculation(newExpense, 'ITEM_BASED');
    fetchInvoices(newExpense.id);
    fetchLedgerEvents(newExpense.id);
  };

  const handleToggleItemMember = async (itemId: string, memberId: string) => {
    if (!currentExpense.items) return;

    const updatedItems = currentExpense.items.map((item) => {
      if (item.id === itemId) {
        const exists = item.shared_by?.includes(memberId);
        const newShared = exists
          ? item.shared_by.filter((id) => id !== memberId)
          : [...(item.shared_by || []), memberId];
        return { ...item, shared_by: newShared };
      }
      return item;
    });

    const updatedExpense = { ...currentExpense, items: updatedItems };
    setCurrentExpense(updatedExpense);
    runCalculation(updatedExpense, currentRule, usageWeights);
  };

  const handlePayerChange = (payerId: string) => {
    const updated = { ...currentExpense, payer_member_id: payerId };
    setCurrentExpense(updated);
    runCalculation(updated, currentRule, usageWeights);
  };

  const handleSelectRule = (newRule: AllocationRuleType) => {
    setCurrentRule(newRule);
    runCalculation(currentExpense, newRule, usageWeights);
  };

  const handleWeightChange = (memberId: string, val: number) => {
    const newWeights = { ...usageWeights, [memberId]: val };
    setUsageWeights(newWeights);
    runCalculation(currentExpense, currentRule, newWeights);
  };

  const handleSendInstruction = async (instruction: string) => {
    await runCalculation(currentExpense, currentRule, usageWeights, instruction);
  };

  const handleApproveAndSettle = async () => {
    setIsSettling(true);
    try {
      const res = await fetch('/api/paypal/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: currentExpense.id,
          approved: true,
          approverName: members.find((m) => m.id === currentExpense.payer_member_id)?.display_name || 'Group Organizer',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInvoices(data.invoices || []);
        setIsPayPalModalOpen(true);
        await fetchLedgerEvents(currentExpense.id);
      } else {
        alert(data.error || 'Failed to issue PayPal invoices');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSettling(false);
    }
  };

  const handleSimulatePayment = async (paypalInvoiceId: string) => {
    try {
      const res = await fetch('/api/paypal/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paypalInvoiceId,
          status: 'PAID',
        }),
      });

      if (res.ok) {
        await fetchInvoices(currentExpense.id);
        await fetchLedgerEvents(currentExpense.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      const res = await fetch('/api/group/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId }),
      });
      if (res.ok) {
        const rulesRes = await fetch('/api/group/rules');
        const data = await rulesRes.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRule = async (newRule: Partial<GroupRule>) => {
    try {
      const res = await fetch('/api/group/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });
      if (res.ok) {
        const rulesRes = await fetch('/api/group/rules');
        const data = await rulesRes.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unpaidCount={invoices.filter((i) => i.status !== 'PAID').length}
        savingsCount={2}
      />

      {/* Hackathon Scope & Disclaimer Banner */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Live PayPal Sandbox Invoicing Ready:</span>
            <span>All money requests are executed safely in PayPal Sandbox in USD.</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center space-x-1">
            <Info className="w-3.5 h-3.5" />
            <span>AI proposes & explains • Human approves • PayPal settles</span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab 1: Split Concierge */}
        {activeTab === 'split' && (
          <div className="space-y-6">
            <ExpenseUpload
              onExpenseLoaded={handleExpenseLoaded}
              isLoading={isLoadingExpense}
              setIsLoading={setIsLoadingExpense}
            />

            <ReceiptItemizer
              expense={currentExpense}
              members={members}
              rules={rules}
              onToggleItemMember={handleToggleItemMember}
              onPayerChange={handlePayerChange}
            />

            <AllocationRuleSelector
              currentRule={currentRule}
              onSelectRule={handleSelectRule}
              members={members}
              usageWeights={usageWeights}
              onWeightChange={handleWeightChange}
              onRecalculate={() => runCalculation(currentExpense, currentRule, usageWeights)}
              isCalculating={isCalculating}
            />

            <ConversationalAdjuster
              onSendInstruction={handleSendInstruction}
              isLoading={isCalculating}
              lastAdjustment={lastAdjustment}
            />

            <FairnessLedgerCard
              expense={currentExpense}
              allocations={allocations}
              members={members}
              events={events}
              invoices={invoices}
              onApproveAndSettle={handleApproveAndSettle}
              isSettling={isSettling}
              onOpenPayPalModal={() => setIsPayPalModalOpen(true)}
            />
          </div>
        )}

        {/* Tab 2: Fairness Ledger Dedicated View */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">
                The Fairness Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Full cryptographic and mathematical audit trail for group expenses. Zero black-box calculations.
              </p>
            </div>

            <FairnessLedgerCard
              expense={currentExpense}
              allocations={allocations}
              members={members}
              events={events}
              invoices={invoices}
              onApproveAndSettle={handleApproveAndSettle}
              isSettling={isSettling}
              onOpenPayPalModal={() => setIsPayPalModalOpen(true)}
            />
          </div>
        )}

        {/* Tab 3: Recurring Cost Radar */}
        {activeTab === 'subscriptions' && (
          <SubscriptionRadar members={members} />
        )}

        {/* Tab 4: Group Memory */}
        {activeTab === 'memory' && (
          <GroupMemoryPanel
            rules={rules}
            members={members}
            onToggleRule={handleToggleRule}
            onAddRule={handleAddRule}
          />
        )}

        {/* Tab 5: PayPal Webhook Inspector */}
        {activeTab === 'webhooks' && (
          <WebhookInspector
            invoices={invoices}
            onRefreshAll={async () => {
              await fetchInvoices(currentExpense.id);
              await fetchLedgerEvents(currentExpense.id);
            }}
          />
        )}
      </main>

      {/* PayPal Settlement Modal */}
      <PayPalSettlementModal
        isOpen={isPayPalModalOpen}
        onClose={() => setIsPayPalModalOpen(false)}
        invoices={invoices}
        expense={currentExpense}
        onRefreshStatus={async () => {
          await fetchInvoices(currentExpense.id);
        }}
        onSimulatePayment={handleSimulatePayment}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">
            Settle • AI Money Concierge for Shared Spending
          </p>
          <p>
            Built with Next.js, TypeScript, Tailwind CSS, OpenAI / Gemini, and the PayPal Invoicing REST API v2.
          </p>
        </div>
      </footer>
    </div>
  );
}
