import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPayPalWebhookSignature } from '@/lib/paypal';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let event: any;

    try {
      event = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    // Convert headers to record
    const headersRecord: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headersRecord[key.toLowerCase()] = value;
    });

    // Verify PayPal signature
    const isValid = await verifyPayPalWebhookSignature(rawBody, headersRecord);
    if (!isValid) {
      console.warn('PayPal Webhook signature invalid');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Deduplication by event ID (PayPal may deliver events multiple times)
    const eventId = event.id || `evt_${Date.now()}`;
    const alreadyProcessed = await db.webhookEventExists(eventId);
    if (alreadyProcessed) {
      return NextResponse.json({ received: true, deduplicated: true });
    }

    await db.saveWebhookEvent(event);

    const invoiceId = event.resource?.id;
    const eventType = event.event_type;

    if (invoiceId) {
      switch (eventType) {
        case 'INVOICING.INVOICE.CREATED':
          await db.updateInvoiceStatus(invoiceId, 'DRAFT');
          break;

        case 'INVOICING.INVOICE.SENT':
          await db.updateInvoiceStatus(invoiceId, 'SENT');
          break;

        case 'INVOICING.INVOICE.PAID': {
          const updated = await db.updateInvoiceStatus(invoiceId, 'PAID');
          if (updated) {
            await db.logFairnessEvent({
              expense_id: updated.expense_id,
              actor: 'PayPal Webhook Engine',
              event_type: 'INVOICE_PAID',
              explanation: `Payment verified for invoice #${invoiceId} ($${updated.amount.toFixed(2)} from ${updated.member_name}). Ledger reconciled.`,
            });

            // Check if all invoices for this expense are now paid
            const allInvoices = await db.getInvoices();
            const expenseInvoices = allInvoices.filter((i) => i.expense_id === updated.expense_id);
            const allPaid = expenseInvoices.every((i) => i.status === 'PAID');

            if (allPaid && expenseInvoices.length > 0) {
              const exp = await db.getExpenseById(updated.expense_id);
              if (exp) {
                exp.status = 'settled';
                await db.saveExpense(exp);
                await db.logFairnessEvent({
                  expense_id: exp.id,
                  actor: 'Settle Concierge',
                  event_type: 'APPROVED',
                  explanation: `All participant shares for "${exp.merchant}" are fully paid! Expense is now marked SETTLED.`,
                });
              }
            }
          }
          break;
        }

        case 'INVOICING.INVOICE.CANCELLED': {
          const updated = await db.updateInvoiceStatus(invoiceId, 'CANCELLED');
          if (updated) {
            await db.logFairnessEvent({
              expense_id: updated.expense_id,
              actor: 'PayPal Webhook Engine',
              event_type: 'INVOICE_CANCELLED',
              explanation: `Invoice #${invoiceId} cancelled on PayPal.`,
            });
          }
          break;
        }

        case 'INVOICING.INVOICE.REFUNDED': {
          await db.updateInvoiceStatus(invoiceId, 'REFUNDED');
          break;
        }
      }
    }

    return NextResponse.json({ received: true, event_type: eventType });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const events = await db.getWebhookEvents();
  return NextResponse.json({ events });
}
