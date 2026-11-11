'use client';

import React, { useState } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  QrCode,
  Sparkles,
  RefreshCw,
  Send,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PayPalInvoice, Expense } from '@/lib/types';

interface PayPalSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: PayPalInvoice[];
  expense: Expense;
  onRefreshStatus: () => Promise<void>;
  onSimulatePayment: (paypalInvoiceId: string) => Promise<void>;
}

export const PayPalSettlementModal: React.FC<PayPalSettlementModalProps> = ({
  isOpen,
  onClose,
  invoices,
  expense,
  onRefreshStatus,
  onSimulatePayment,
}) => {
  const [activeQrUrl, setActiveQrUrl] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const allPaid = invoices.length > 0 && invoices.every((i) => i.status === 'PAID');
  const paidCount = invoices.filter((i) => i.status === 'PAID').length;

  const handleSimulatePayment = async (paypalInvoiceId: string) => {
    setSimulatingId(paypalInvoiceId);
    try {
      await onSimulatePayment(paypalInvoiceId);
      // Trigger confetti if all are now settled
      if (paidCount + 1 >= invoices.length) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } finally {
      setSimulatingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" />
            <span>PayPal Invoicing REST API Lifecycle</span>
          </div>

          <h3 className="text-xl font-extrabold text-white">
            Active Settlement Requests
          </h3>
          <p className="text-xs text-blue-100/90 mt-1">
            Tracking lifecycle status from DRAFT → SENT → PAID via PayPal Webhooks.
          </p>

          {/* Progress bar */}
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
            <span>
              Settlement Status: <strong>{paidCount} of {invoices.length} Paid</strong>
            </span>
            <span className="font-bold">
              {Math.round((paidCount / Math.max(1, invoices.length)) * 100)}% Settled
            </span>
          </div>
          <div className="w-full bg-white/20 h-2 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${(paidCount / Math.max(1, invoices.length)) * 100}%` }}
            />
          </div>
        </div>

        {/* Invoices list */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {allPaid && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">All group shares fully settled!</p>
                <p className="text-emerald-700 mt-0.5">
                  Every participant has paid their exact share. The ledger is fully balanced.
                </p>
              </div>
            </div>
          )}

          {invoices.map((inv) => {
            const isPaid = inv.status === 'PAID';
            return (
              <div
                key={inv.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">{inv.member_name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{inv.member_email}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-extrabold text-slate-900">
                      ${inv.amount.toFixed(2)}
                    </span>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      USD
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200 mb-3">
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 mb-1">
                    <span>PayPal ID: {inv.paypal_invoice_id}</span>
                    <span>Sent: {new Date(inv.sent_at || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <p className="line-clamp-2 text-slate-600">{inv.note}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center space-x-2">
                    {inv.payment_link && (
                      <a
                        href={inv.payment_link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                      >
                        <span>Open PayPal Page</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {inv.qr_code_url && (
                      <button
                        onClick={() => setActiveQrUrl(activeQrUrl === inv.qr_code_url ? null : inv.qr_code_url!)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Code</span>
                      </button>
                    )}
                  </div>

                  {!isPaid ? (
                    <button
                      onClick={() => handleSimulatePayment(inv.paypal_invoice_id)}
                      disabled={simulatingId === inv.paypal_invoice_id}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {simulatingId === inv.paypal_invoice_id ? 'Simulating...' : 'Simulate Sandbox Payment'}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1 text-emerald-700 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Settled</span>
                    </div>
                  )}
                </div>

                {/* QR Code Popover */}
                {activeQrUrl === inv.qr_code_url && (
                  <div className="mt-3 p-4 bg-white rounded-xl border border-slate-300 text-center flex flex-col items-center">
                    <p className="text-xs font-bold text-slate-800 mb-2">Scan to Pay with PayPal App</p>
                    <img
                      src={inv.qr_code_url}
                      alt="PayPal Invoice QR"
                      className="w-36 h-36 rounded-lg border border-slate-200"
                    />
                    <span className="text-[10px] text-slate-400 mt-2 font-mono">
                      Invoice: {inv.paypal_invoice_id}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Transactions executed via PayPal Invoicing REST API v2 Sandbox.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
