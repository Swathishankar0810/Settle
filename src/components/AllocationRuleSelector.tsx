'use client';

import React from 'react';
import { AllocationRuleType, GroupMember } from '@/lib/types';
import {
  PieChart,
  Scale,
  Sliders,
  DollarSign,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface AllocationRuleSelectorProps {
  currentRule: AllocationRuleType;
  onSelectRule: (rule: AllocationRuleType) => void;
  members: GroupMember[];
  usageWeights: Record<string, number>;
  onWeightChange: (memberId: string, val: number) => void;
  onRecalculate: () => void;
  isCalculating: boolean;
}

export const AllocationRuleSelector: React.FC<AllocationRuleSelectorProps> = ({
  currentRule,
  onSelectRule,
  members,
  usageWeights,
  onWeightChange,
  onRecalculate,
  isCalculating,
}) => {
  const rules = [
    {
      type: 'ITEM_BASED' as AllocationRuleType,
      label: 'Per-Item Split',
      icon: Layers,
      description: 'Pay for items consumed + proportional extra tax & tip',
    },
    {
      type: 'EQUAL' as AllocationRuleType,
      label: 'Equal Split',
      icon: Scale,
      description: 'Divide bill exactly evenly across all participants',
    },
    {
      type: 'USAGE_BASED' as AllocationRuleType,
      label: 'Usage-Based',
      icon: Sliders,
      description: 'Proportional to kilometers, nights stayed, or GBs',
    },
    {
      type: 'PROPORTIONAL' as AllocationRuleType,
      label: 'Income-Weighted',
      icon: PieChart,
      description: 'Weighted by member income brackets / custom ratios',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Scale className="w-5 h-5 text-emerald-600" />
            <span>Step 2: Choose Fairness Strategy</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic arithmetic ensures splits sum to 100% with penny-exact precision.
          </p>
        </div>

        <button
          onClick={onRecalculate}
          disabled={isCalculating}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-2 transition-all shadow-sm disabled:opacity-50 self-start sm:self-auto"
        >
          <span>Calculate Allocation</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {rules.map((rule) => {
          const Icon = rule.icon;
          const isSelected = currentRule === rule.type;
          return (
            <button
              key={rule.type}
              onClick={() => onSelectRule(rule.type)}
              className={`p-3.5 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5 mb-1.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-slate-900">{rule.label}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">{rule.description}</p>
            </button>
          );
        })}
      </div>

      {/* Usage-Based Units Controller */}
      {currentRule === 'USAGE_BASED' && (
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-700 block mb-2">
            🚗 Specify Usage Metrics (e.g. Distance driven in km or Nights stayed)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {members.map((m) => (
              <div key={m.id} className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-800 block truncate">
                  {m.avatar} {m.display_name.split(' ')[0]}
                </span>
                <div className="flex items-center space-x-2 mt-1.5">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={usageWeights[m.id] !== undefined ? usageWeights[m.id] : 10}
                    onChange={(e) => onWeightChange(m.id, parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-bold p-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                  />
                  <span className="text-[11px] text-slate-500 font-medium">units</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Income-Weighted Ratios Controller */}
      {currentRule === 'PROPORTIONAL' && (
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-700 block mb-2">
            ⚖️ Income Brackets / Weight Multipliers
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {members.map((m) => (
              <div key={m.id} className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-800 block truncate">
                  {m.avatar} {m.display_name.split(' ')[0]}
                </span>
                <div className="flex items-center space-x-2 mt-1.5">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={usageWeights[m.id] !== undefined ? usageWeights[m.id] : m.income_share}
                    onChange={(e) => onWeightChange(m.id, parseFloat(e.target.value) || 1)}
                    className="w-full text-xs font-bold p-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                  />
                  <span className="text-[11px] text-slate-500 font-medium">× share</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
