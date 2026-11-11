'use client';

import React from 'react';
import { Expense, GroupMember, GroupRule } from '@/lib/types';
import {
  Calendar,
  DollarSign,
  Tag,
  CheckCircle2,
  Users,
  ShieldCheck,
  Percent,
} from 'lucide-react';

interface ReceiptItemizerProps {
  expense: Expense;
  members: GroupMember[];
  rules: GroupRule[];
  onToggleItemMember: (itemId: string, memberId: string) => void;
  onPayerChange: (payerId: string) => void;
}

export const ReceiptItemizer: React.FC<ReceiptItemizerProps> = ({
  expense,
  members,
  rules,
  onToggleItemMember,
  onPayerChange,
}) => {
  const items = expense.items || [];
  const currentPayer = members.find((m) => m.id === expense.payer_member_id) || members[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
      {/* Header with Merchant and Bill Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {expense.merchant_category || 'Expense'}
            </span>
            <span className="text-xs text-slate-500 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              {expense.expense_date}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">
            {expense.merchant}
          </h2>
        </div>

        {/* Payer Selector */}
        <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Paid Upfront By
            </span>
            <select
              value={expense.payer_member_id}
              onChange={(e) => onPayerChange(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.avatar} {m.display_name} ({m.paypal_email})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bill Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[11px] font-medium text-slate-500">Subtotal</span>
          <p className="text-base font-bold text-slate-900">${expense.subtotal.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[11px] font-medium text-slate-500">Tax</span>
          <p className="text-base font-bold text-slate-900">${expense.tax.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[11px] font-medium text-slate-500">Tip / Gratuity</span>
          <p className="text-base font-bold text-slate-900">${expense.tip.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
          <span className="text-[11px] font-bold text-emerald-800">Grand Total</span>
          <p className="text-base font-extrabold text-emerald-700">${expense.total.toFixed(2)}</p>
        </div>
      </div>

      {/* Extracted Items Itemization Table */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span>Extracted Line Items ({items.length})</span>
          </h3>
          <span className="text-[11px] text-slate-500">
            Click member pills to assign or split each item
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Item & Category</th>
                <th className="py-2.5 px-3">Price</th>
                <th className="py-2.5 px-4">Assigned Participants</th>
                <th className="py-2.5 px-3 text-right">Per-Person</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item) => {
                const assignedCount = item.shared_by?.length || 0;
                const perPersonCost = assignedCount > 0 ? item.amount / assignedCount : 0;
                const isAlcohol = item.category === 'Alcohol' || /beer|ipa|wine|cocktail/i.test(item.name);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                          {item.category || 'General'}
                        </span>
                        {isAlcohol && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded font-medium">
                            🍷 Alcohol
                          </span>
                        )}
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {(item.confidence * 100).toFixed(0)}% AI confidence
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-800">
                      ${item.amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {members.map((member) => {
                          const isAssigned = item.shared_by?.includes(member.id);
                          return (
                            <button
                              key={member.id}
                              onClick={() => onToggleItemMember(item.id, member.id)}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center space-x-1 ${
                                isAssigned
                                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              <span>{member.avatar}</span>
                              <span>{member.display_name.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-700">
                      ${perPersonCost.toFixed(2)}
                      {assignedCount > 1 && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          (÷ {assignedCount})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
