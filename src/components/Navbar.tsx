'use client';

import React from 'react';
import {
  Sparkles,
  Receipt,
  ShieldCheck,
  Radar,
  BrainCircuit,
  Webhook,
  CreditCard,
  Users,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unpaidCount?: number;
  savingsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  unpaidCount = 0,
  savingsCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('split')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">Settle</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  AI + PayPal
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                End money arguments. Settle shared spending.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('split')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'split'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Split Concierge</span>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === 'ledger'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Fairness Ledger</span>
              {unpaidCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1.5 right-1.5" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === 'subscriptions'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Radar className="w-4 h-4" />
              <span>Cost Radar</span>
              {savingsCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                  {savingsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('memory')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'memory'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span className="hidden md:inline">Group Memory</span>
              <span className="md:hidden">Rules</span>
            </button>

            <button
              onClick={() => setActiveTab('webhooks')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'webhooks'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Webhook className="w-4 h-4" />
              <span className="hidden lg:inline">PayPal Webhooks</span>
            </button>
          </nav>

          {/* Right side: Group badge & PayPal status */}
          <div className="flex items-center space-x-3">
            <div className="hidden xl:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium">Mission St. Roommates</span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <CreditCard className="w-3.5 h-3.5" />
              <span>PayPal Sandbox</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
