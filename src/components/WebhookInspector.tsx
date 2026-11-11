'use client';

import React, { useState, useEffect } from 'react';
import {
  Webhook,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Code,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { WebhookEventRecord, PayPalInvoice } from '@/lib/types';

interface WebhookInspectorProps {
  invoices: PayPalInvoice[];
  onRefreshAll: () => Promise<void>;
}

export const WebhookInspector: React.FC<WebhookInspectorProps> = ({ invoices, onRefreshAll }) => {
  const [events, setEvents] = useState<WebhookEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(invoices[0]?.paypal_invoice_id || '');
  const [simulatedEventType, setSimulatedEventType] = useState('INVOICING.INVOICE.PAID');
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/webhooks/paypal');
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSimulateWebhook = async () => {
    if (!selectedInvoiceId) return;
    setSimulating(true);
    setLastMessage(null);

    const testEvent = {
      id: `WH-TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      event_version: '1.0',
      create_time: new Date().toISOString(),
      event_type: simulatedEventType,
      resource_type: 'invoices',
      summary: `Simulated PayPal Webhook for ${selectedInvoiceId}`,
      resource: {
        id: selectedInvoiceId,
        status: simulatedEventType === 'INVOICING.INVOICE.PAID' ? 'PAID' : 'SENT',
      },
    };

    try {
      const res = await fetch('/api/webhooks/paypal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'paypal-transmission-id': `TRANS-${Date.now()}`,
          'paypal-transmission-time': new Date().toISOString(),
          'paypal-transmission-sig': 'SIMULATED_SIG',
          'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/certs',
          'paypal-auth-algo': 'SHA256withRSA',
        },
        body: JSON.stringify(testEvent),
      });

      const data = await res.json();
      if (res.ok) {
        setLastMessage(`✅ Webhook processed successfully! Event ID: ${testEvent.id}`);
        await fetchEvents();
        await onRefreshAll();
      } else {
        setLastMessage(`❌ Error: ${data.error || 'Failed to process webhook'}`);
      }
    } catch (err: any) {
      setLastMessage(`❌ Network error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Webhook className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              PayPal Webhooks Inspector
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-200">
              Live Endpoint: /api/webhooks/paypal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Receives asynchronous status updates, verifies cryptographic signatures, and prevents replay attacks via event deduplication.
          </p>
        </div>

        <button
          onClick={fetchEvents}
          className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Events</span>
        </button>
      </div>

      {/* Simulator Control Box */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 mb-3">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>PayPal Webhook Simulator (Demo & Testing Harness)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Select Invoice ID
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full text-xs p-2 bg-white rounded-lg border border-slate-300 font-mono text-slate-800"
            >
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <option key={inv.id} value={inv.paypal_invoice_id}>
                    {inv.member_name} ({inv.paypal_invoice_id}) - ${inv.amount.toFixed(2)}
                  </option>
                ))
              ) : (
                <option value="INV2-SANDBOX-DEMO-001">INV2-SANDBOX-DEMO-001</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Event Type
            </label>
            <select
              value={simulatedEventType}
              onChange={(e) => setSimulatedEventType(e.target.value)}
              className="w-full text-xs p-2 bg-white rounded-lg border border-slate-300 font-mono text-slate-800"
            >
              <option value="INVOICING.INVOICE.PAID">INVOICING.INVOICE.PAID</option>
              <option value="INVOICING.INVOICE.SENT">INVOICING.INVOICE.SENT</option>
              <option value="INVOICING.INVOICE.CANCELLED">INVOICING.INVOICE.CANCELLED</option>
              <option value="INVOICING.INVOICE.REFUNDED">INVOICING.INVOICE.REFUNDED</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSimulateWebhook}
              disabled={simulating}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{simulating ? 'Emitting...' : 'Emit Webhook Event'}</span>
            </button>
          </div>
        </div>

        {lastMessage && (
          <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono">
            {lastMessage}
          </div>
        )}
      </div>

      {/* Received Events Table */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
          <Code className="w-3.5 h-3.5 text-slate-400" />
          <span>Processed Webhook Events ({events.length})</span>
        </h4>

        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs">
            No webhooks recorded yet. Emit a test webhook above or execute payments to see real-time updates!
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((evt) => (
              <div
                key={evt.event_id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-blue-700">{evt.event_type}</span>
                    <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded font-mono text-slate-700">
                      ID: {evt.event_id}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Invoice: <code className="font-mono">{evt.invoice_id}</code>
                  </span>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  {new Date(evt.processed_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
