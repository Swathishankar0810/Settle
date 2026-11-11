'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Lock,
  ArrowRight,
  Clock,
  Sparkles,
  ExternalLink,
  QrCode,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { Allocation, Expense, GroupMember, FairnessEvent, PayPalInvoice } from '@/lib/types';

interface FairnessLedgerCardProps {
  expense: Expense;
  allocations: Allocation[];
  members: GroupMember[];
  events: FairnessEvent[];
  invoices: PayPalInvoice[];
  onApproveAndSettle: () => void;
  isSettling: boolean;
  onOpenPayPalModal: () => void;
}

export const FairnessLedgerCard: React.FC<FairnessLedgerCardProps> = ({
  expense,
  allocations,
  members,
  events,
  invoices,
  onApproveAndSettle,
  isSettling,
  onOpenPayPalModal,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    allocations[0]?.member_id || null
  );

  const totalExpense = expense.total;
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const discrepancy = Math.abs(Math.round((totalExpense - totalAllocated) * 100) / 100);
  const isApproved = expense.status === 'approved' || expense.status === 'invoiced' || expense.status === 'settled';
  const hasInvoices = invoices.length > 0;
  const payer = members.find((m) => m.id === expense.payer_member_id) || members[0];

  const selectedAlloc = allocations.find((a) => a.member_id === selectedMemberId) || allocations[0];
  const selectedMember = members.find((m) => m.id === selectedAlloc?.member_id);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              The Fairness Ledger
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
              Audit-Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Every split is stored with its exact mathematical rule, inputs, corrections, and human explanation.
          </p>
        </div>

        {/* Math Reconciliation Badge */}
        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          <FileCheck className="w-4 h-4 text-emerald-600" />
          <div className="text-xs">
            <span className="text-slate-500">Allocated: </span>
            <span className="font-bold text-slate-900">${totalAllocated.toFixed(2)}</span>
            <span className="text-slate-400"> / ${totalExpense.toFixed(2)} </span>
            <span className="text-emerald-700 font-semibold">(Diff: ${discrepancy.toFixed(2)})</span>
          </div>
        </div>
      </div>

      {/* Participant Allocation Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 my-5">
        {allocations.map((alloc) => {
          const member = members.find((m) => m.id === alloc.member_id);
          const isSelected = selectedAlloc?.member_id === alloc.member_id;
          const isPayer = alloc.member_id === payer.id;
          const invoice = invoices.find((inv) => inv.member_id === alloc.member_id);

          return (
            <div
              key={alloc.member_id}
              onClick={() => setSelectedMemberId(alloc.member_id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-600 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{member?.avatar}</span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">
                      {member?.display_name}
                    </h4>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[110px]">
                      {member?.paypal_email}
                    </span>
                  </div>
                </div>

                {isPayer ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    Payer
                  </span>
                ) : invoice ? (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      invoice.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {invoice.status}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-[11px] text-slate-500 font-medium">Share:</span>
                <span className="text-base font-extrabold text-slate-900">
                  ${alloc.amount.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Member Fairness Drilldown (The "Why does X owe $Y?" box) */}
      {selectedAlloc && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Why does {selectedMember?.display_name} owe ${selectedAlloc.amount.toFixed(2)}?</span>
            </h4>
            <span className="text-[11px] font-semibold text-slate-500">
              Rule: <span className="text-slate-800 font-bold">{selectedAlloc.rule}</span>
            </span>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 font-medium">
            {selectedAlloc.explanation}
          </p>

          {/* Itemized math sub-table */}
          {selectedAlloc.items_breakdown && selectedAlloc.items_breakdown.length > 0 && (
            <div className="mt-3 text-xs">
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                Item-Level Math Audit:
              </div>
              <div className="space-y-1">
                {selectedAlloc.items_breakdown.map((item, i) => (
                  <div key={i} className="flex justify-between text-slate-600 bg-white/70 px-2.5 py-1 rounded">
                    <span>{item.name}</span>
                    <span className="font-semibold text-slate-900">${item.amount.toFixed(2)}</span>
                  </div>
                ))}
                {selectedAlloc.tax_share !== undefined && selectedAlloc.tax_share > 0 && (
                  <div className="flex justify-between text-slate-500 bg-white/70 px-2.5 py-1 rounded">
                    <span>Proportional Tax share</span>
                    <span className="font-semibold text-slate-700">${selectedAlloc.tax_share.toFixed(2)}</span>
                  </div>
                )}
                {selectedAlloc.tip_share !== undefined && selectedAlloc.tip_share > 0 && (
                  <div className="flex justify-between text-slate-500 bg-white/70 px-2.5 py-1 rounded">
                    <span>Proportional Tip share</span>
                    <span className="font-semibold text-slate-700">${selectedAlloc.tip_share.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Human Approval Gate & PayPal Invoicing CTA */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
              <span>Human Approval Gate</span>
              <span className="px-1.5 py-0.2 bg-emerald-200/80 text-emerald-800 rounded text-[10px]">Required</span>
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Settle never autonomously moves money. Once group members review and confirm the split fairness, proceed to dispatch trusted PayPal sandbox invoices.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          {hasInvoices ? (
            <button
              onClick={onOpenPayPalModal}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all"
            >
              <span>View Active PayPal Invoices ({invoices.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              disabled={isSettling || allocations.length === 0}
              onClick={onApproveAndSettle}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSettling ? 'Issuing PayPal Invoices...' : 'Confirm Fairness & Issue PayPal Invoices'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Immutable Audit Trail Timeline */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Immutable Audit Trail ({events.length} events logged)</span>
        </h4>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="p-2.5 rounded-lg bg-slate-50 border border-slate-150 text-xs flex items-start justify-between"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800">{evt.actor}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
                    {evt.event_type}
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5">{evt.explanation}</p>
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap ml-3">
                {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
