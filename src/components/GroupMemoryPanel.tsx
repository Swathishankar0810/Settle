'use client';

import React, { useState } from 'react';
import {
  BrainCircuit,
  Plus,
  Check,
  Power,
  Shield,
  Sparkles,
  Users,
  AlertCircle,
} from 'lucide-react';
import { GroupRule, GroupMember } from '@/lib/types';

interface GroupMemoryPanelProps {
  rules: GroupRule[];
  members: GroupMember[];
  onToggleRule: (ruleId: string) => Promise<void>;
  onAddRule: (rule: Partial<GroupRule>) => Promise<void>;
}

export const GroupMemoryPanel: React.FC<GroupMemoryPanelProps> = ({
  rules,
  members,
  onToggleRule,
  onAddRule,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState<GroupRule['rule_type']>('category_exemption');
  const [targetMemberId, setTargetMemberId] = useState('');
  const [targetCategory, setTargetCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddRule({
        title,
        description,
        rule_type: ruleType,
        target_member_id: targetMemberId || undefined,
        target_category: targetCategory || undefined,
      });
      setTitle('');
      setDescription('');
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Group Memory</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold border border-purple-200">
              Persistent Context
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Settle remembers recurring habits, dietary exemptions, and default payers across all receipts.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Group Rule</span>
        </button>
      </div>

      {/* Add Rule Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 space-y-3">
          <h4 className="text-xs font-bold text-purple-900">Create New Group Rule</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Rule Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Meera Alcohol Exemption"
                className="w-full text-xs p-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Rule Strategy
              </label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as any)}
                className="w-full text-xs p-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="category_exemption">Category Exemption (e.g. Alcohol, Meat)</option>
                <option value="payer_reimbursement">Default Payer Reimbursement</option>
                <option value="equal_split">Always Equal Split</option>
                <option value="income_weighted">Income-Weighted</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Plain-English Description
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Meera does not drink alcohol and is never assigned bar/cocktail items."
              className="w-full text-xs p-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </form>
      )}

      {/* Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.map((rule) => {
          const targetMember = members.find((m) => m.id === rule.target_member_id);

          return (
            <div
              key={rule.id}
              className={`p-4 rounded-xl border transition-all ${
                rule.active
                  ? 'border-purple-200 bg-white shadow-xs'
                  : 'border-slate-200 bg-slate-50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0" />
                  <h4 className="font-bold text-xs text-slate-900">{rule.title}</h4>
                </div>
                <button
                  onClick={() => onToggleRule(rule.id)}
                  title={rule.active ? 'Click to disable' : 'Click to enable'}
                  className={`p-1 rounded-md transition-colors ${
                    rule.active
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {rule.description}
              </p>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span className="font-mono">{rule.rule_type}</span>
                {targetMember && (
                  <span className="font-semibold text-purple-700">
                    {targetMember.avatar} {targetMember.display_name.split(' ')[0]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
