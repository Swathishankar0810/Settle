'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  UtensilsCrossed,
  Car,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Receipt,
} from 'lucide-react';
import { Expense } from '@/lib/types';

interface ExpenseUploadProps {
  onExpenseLoaded: (expense: Expense) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

export const ExpenseUpload: React.FC<ExpenseUploadProps> = ({
  onExpenseLoaded,
  isLoading,
  setIsLoading,
}) => {
  const [activeMode, setActiveMode] = useState<'demo' | 'text' | 'file'>('demo');
  const [rawText, setRawText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDemoScenario = async (scenarioKey: 'restaurant' | 'trip') => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load demo scenario');
      onExpenseLoaded(data.expense);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!rawText.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract receipt');
      onExpenseLoaded(data.expense);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract receipt from file');
      onExpenseLoaded(data.expense);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <span>Step 1: Upload or Choose Expense Evidence</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            AI vision parses items, taxes, tips, and recurring signals into strict JSON.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="inline-flex rounded-lg bg-slate-100 p-1 self-start md:self-auto">
          <button
            onClick={() => setActiveMode('demo')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeMode === 'demo'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌟 Fast Demo Presets
          </button>
          <button
            onClick={() => setActiveMode('file')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeMode === 'file'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📸 Upload Image / PDF
          </button>
          <button
            onClick={() => setActiveMode('text')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeMode === 'text'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ✉️ Paste Email / Text
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Preset Demo Scenarios */}
      {activeMode === 'demo' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            disabled={isLoading}
            onClick={() => loadDemoScenario('restaurant')}
            className="group text-left p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer relative"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                $201.14
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
              🍝 Joe&apos;s Copper Bistro Dinner
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              7 line items: Steaks, Salmon, Truffle Fries, Mocktails & Craft IPAs. Demonstrates alcohol exemption for Meera and proportional tax/tip allocation!
            </p>
            <div className="mt-3 flex items-center text-xs font-medium text-emerald-700">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              <span>Load Restaurant Scenario</span>
            </div>
          </button>

          <button
            disabled={isLoading}
            onClick={() => loadDemoScenario('trip')}
            className="group text-left p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer relative"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Car className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                $665.00
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
              🌲 Lake Tahoe Cabin & Road Trip
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Cabin rental ($420), highway gas ($75), groceries ($135), and park passes ($35). Demonstrates payer reimbursement (Jefisha paid) and non-driver exclusion!
            </p>
            <div className="mt-3 flex items-center text-xs font-medium text-blue-700">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              <span>Load Road Trip Scenario</span>
            </div>
          </button>
        </div>
      )}

      {/* File Upload Mode */}
      {activeMode === 'file' && (
        <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-8 text-center transition-colors bg-slate-50/50">
          <input
            type="file"
            id="receipt-file"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            disabled={isLoading}
            className="hidden"
          />
          <label
            htmlFor="receipt-file"
            className="cursor-pointer flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Click to select a receipt photo or PDF
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports JPG, PNG, WEBP, or PDF invoices
            </p>
          </label>
        </div>
      )}

      {/* Raw Text / Forwarded Email Mode */}
      {activeMode === 'text' && (
        <div className="space-y-3">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={isLoading}
            placeholder="Paste forwarded receipt email or type bill details:
Example:
Blue Bottle Coffee & Bakery
2x Cappuccino $12.00
1x Almond Croissant $6.50
1x Avocado Toast $14.00
Tax $2.76
Tip $5.00
Total $40.26"
            rows={5}
            className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs bg-slate-50/50 text-slate-900"
          />
          <div className="flex justify-end">
            <button
              onClick={handleTextSubmit}
              disabled={isLoading || !rawText.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Parse with AI</span>
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-emerald-800 text-xs font-medium animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>AI Vision Engine is analyzing document structure, line items, and totals...</span>
        </div>
      )}
    </div>
  );
};
