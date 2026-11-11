'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';

interface ConversationalAdjusterProps {
  onSendInstruction: (prompt: string) => Promise<void>;
  isLoading: boolean;
  lastAdjustment?: {
    confirmation: string;
    explanation: string;
  } | null;
}

export const ConversationalAdjuster: React.FC<ConversationalAdjusterProps> = ({
  onSendInstruction,
  isLoading,
  lastAdjustment,
}) => {
  const [prompt, setPrompt] = useState('');

  const quickPrompts = [
    'Priya had two drinks',
    'Meera does not drink alcohol',
    'Make Uber split by distance (Ravi 25km, Priya 12km, Jefisha 18km)',
    'Ravi paid upfront for everyone',
    'Split evenly instead',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    const text = prompt;
    setPrompt('');
    await onSendInstruction(text);
  };

  const handleSelectQuickPrompt = async (p: string) => {
    setPrompt('');
    await onSendInstruction(p);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Conversational Money Assistant</h3>
            <p className="text-xs text-slate-400">
              Adjust splits in plain English. AI updates logic and logs changes to the ledger.
            </p>
          </div>
        </div>

        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Dispute-Safe AI
        </span>
      </div>

      {/* Adjustment feedback banner */}
      {lastAdjustment && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs">
          <div className="flex items-center space-x-2 font-bold mb-1 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{lastAdjustment.confirmation}</span>
          </div>
          <p className="text-emerald-100/80 pl-6 leading-relaxed">
            {lastAdjustment.explanation}
          </p>
        </div>
      )}

      {/* Quick suggestions pills */}
      <div className="mb-3">
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mb-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>Try saying:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={() => handleSelectQuickPrompt(qp)}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-700 transition-colors"
            >
              &ldquo;{qp}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Chat instruction input */}
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. 'Priya had the cocktail and salmon' or 'Exclude Meera from alcohol'..."
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Apply</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
