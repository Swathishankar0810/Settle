import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PayPalInvoiceStatus } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { paypalInvoiceId, status } = await req.json();

    if (!paypalInvoiceId || !status) {
      return NextResponse.json(
        { error: 'Missing paypalInvoiceId or status' },
        { status: 400 }
      );
    }

    const updated = await db.updateInvoiceStatus(paypalInvoiceId, status as PayPalInvoiceStatus);
    if (!updated) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (status === 'PAID') {
      await db.logFairnessEvent({
        expense_id: updated.expense_id,
        actor: 'PayPal Sandbox Simulator',
        event_type: 'INVOICE_PAID',
        explanation: `Payment confirmed for ${updated.member_name} ($${updated.amount.toFixed(2)}). PayPal Invoice #${paypalInvoiceId} marked PAID.`,
      });

      // Check if all are paid
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
            actor: 'Fairness Engine',
            event_type: 'APPROVED',
            explanation: `🎉 All invoices for "${exp.merchant}" are paid! Total $${exp.total.toFixed(2)} reconciled.`,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      invoice: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
