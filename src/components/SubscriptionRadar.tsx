'use client';

import React, { useState, useEffect } from 'react';
import {
  Radar,
  DollarSign,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Users,
  Repeat,
  Send,
} from 'lucide-react';
import { SubscriptionItem, GroupMember } from '@/lib/types';

interface SubscriptionRadarProps {
  members: GroupMember[];
  onOpenPayPalModal?: () => void;
}

export const SubscriptionRadar: React.FC<SubscriptionRadarProps> = ({ members }) => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [metrics, setMetrics] = useState({
    totalMonthly: 0,
    totalAnnual: 0,
    potentialAnnualSavings: 0,
    flaggedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/subscriptions');
      const data = await res.json();
      if (data.subscriptions) {
        setSubscriptions(data.subscriptions);
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleApplyRecommendation = async (subId: string, actionDesc: string) => {
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_recommendation', subscriptionId: subId }),
      });
      if (res.ok) {
        setActionSuccess(`Applied: ${actionDesc}`);
        fetchSubscriptions();
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Shared Monthly Spend</span>
            <Repeat className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${metrics.totalMonthly.toFixed(2)}
            <span className="text-xs text-slate-400 font-normal"> / mo</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {subscriptions.filter((s) => s.status !== 'cancelled').length} recurring services
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Annual Household Cost</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${metrics.totalAnnual.toFixed(2)}
            <span className="text-xs text-slate-400 font-normal"> / yr</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Projected run rate without optimization
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl text-white shadow-md">
          <div className="flex items-center justify-between text-emerald-100 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Savings Detected by AI</span>
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <div className="text-2xl font-black text-white">
            ${metrics.potentialAnnualSavings.toFixed(2)}
            <span className="text-xs text-emerald-200 font-normal"> / yr</span>
          </div>
          <p className="text-[11px] text-emerald-100 mt-1">
            {metrics.flaggedCount} actionable cost-cutting suggestions
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Subscriptions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Radar className="w-5 h-5 text-emerald-600" />
              <span>Recurring Cost Radar</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Continuously monitors shared household renewals, unused services, and fair splits.
            </p>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
            Auto-Detect Enabled
          </span>
        </div>

        <div className="space-y-4">
          {subscriptions.map((sub) => {
            const payer = members.find((m) => m.id === sub.payer_member_id);
            const isCancelled = sub.status === 'cancelled';
            const hasRec = Boolean(sub.recommendation && !isCancelled);

            return (
              <div
                key={sub.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCancelled
                    ? 'border-slate-200 bg-slate-50/50 opacity-60'
                    : sub.status === 'flagged_unused'
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-900 text-sm">{sub.service_name}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {sub.category}
                      </span>
                      {sub.status === 'flagged_unused' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Unused (48 Days)</span>
                        </span>
                      )}
                      {isCancelled && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          Cancelled
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      Provider: {sub.provider} • Upfront payer: {payer?.display_name}
                    </span>
                  </div>

                  <div className="text-left lg:text-right">
                    <span className="text-lg font-black text-slate-900">
                      ${sub.amount.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 block">
                      per {sub.billing_cycle}
                    </span>
                  </div>
                </div>

                {/* Active users and renewal info */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-1.5 my-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Active users: </span>
                    <div className="flex space-x-1 font-semibold text-slate-800">
                      {sub.active_member_ids.map((id) => {
                        const m = members.find((mem) => mem.id === id);
                        return (
                          <span key={id} className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {m?.avatar} {m?.display_name.split(' ')[0]}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 my-1 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Next renewal: <strong>{sub.next_renewal_date}</strong></span>
                  </div>
                </div>

                {/* AI Recommendation Box */}
                {hasRec && sub.recommendation && (
                  <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-emerald-900">
                      <div className="flex items-center space-x-1.5 font-bold mb-0.5 text-emerald-800">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>AI Cost-Saving Opportunity</span>
                      </div>
                      <p className="text-emerald-800/90">{sub.recommendation.reason}</p>
                      {sub.recommendation.annual_savings > 0 && (
                        <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                          Saves ${sub.recommendation.annual_savings.toFixed(2)} / year
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        handleApplyRecommendation(sub.id, sub.recommendation?.reason || 'Optimization')
                      }
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1 self-start sm:self-auto flex-shrink-0 cursor-pointer"
                    >
                      <span>Apply Action</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
