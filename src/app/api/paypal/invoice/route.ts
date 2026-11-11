import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAndSendPayPalInvoice } from '@/lib/paypal';
import { PayPalInvoice } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { expenseId, approved, approverName = 'User' } = body;

    // Strict Human Approval Gate
    if (!approved) {
      return NextResponse.json(
        { error: 'Human approval is required before issuing PayPal invoices. AI never moves funds autonomously.' },
        { status: 400 }
      );
    }

    const expense = await db.getExpenseById(expenseId);
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const allocations = await db.getAllocationsByExpense(expenseId);
    if (!allocations || allocations.length === 0) {
      return NextResponse.json(
        { error: 'No allocations found for this expense. Please calculate split first.' },
        { status: 400 }
      );
    }

    const members = await db.getMembers();
    const payer = members.find((m) => m.id === expense.payer_member_id) || members[0];

    // Mark allocations approved
    await db.approveAllocation(expenseId);
    await db.logFairnessEvent({
      expense_id: expenseId,
      actor: approverName,
      event_type: 'APPROVED',
      explanation: `Human approval gate passed: Split confirmed by ${approverName}. Proceeding to create PayPal invoices.`,
    });

    const generatedInvoices: PayPalInvoice[] = [];

    // Create and send invoice for each participant except the upfront payer
    for (const alloc of allocations) {
      if (alloc.member_id === payer.id) {
        continue; // Payer doesn't invoice themselves
      }
      if (alloc.amount <= 0) {
        continue;
      }

      const member = members.find((m) => m.id === alloc.member_id);
      const recipientEmail = member?.paypal_email || member?.email || 'recipient@example.com';
      const description = `${alloc.explanation || `Shared expense for ${expense.merchant}`}`;

      const res = await createAndSendPayPalInvoice({
        expenseId: expense.id,
        memberId: alloc.member_id,
        memberName: member?.display_name || alloc.member_name,
        recipientEmail,
        amount: alloc.amount,
        currency: alloc.currency,
        description,
        note: `Settle: Shared expense split for "${expense.merchant}". Pay to reimburse ${payer.display_name}.`,
        merchantName: expense.merchant,
      });

      const invoiceRecord: PayPalInvoice = {
        id: res.invoiceId,
        expense_id: expense.id,
        member_id: alloc.member_id,
        member_name: member?.display_name || alloc.member_name,
        member_email: recipientEmail,
        paypal_invoice_id: res.paypalInvoiceId,
        status: (res.status as any) || 'SENT',
        amount: alloc.amount,
        currency: alloc.currency,
        payment_link: res.paymentLink,
        qr_code_url: res.qrCodeUrl,
        sent_at: new Date().toISOString(),
        note: description,
      };

      await db.saveInvoice(invoiceRecord);
      generatedInvoices.push(invoiceRecord);

      await db.logFairnessEvent({
        expense_id: expense.id,
        actor: 'PayPal Invoicing Service',
        event_type: 'INVOICE_SENT',
        explanation: `PayPal Invoice #${res.paypalInvoiceId} ($${alloc.amount.toFixed(2)}) sent to ${invoiceRecord.member_name} (${recipientEmail}). Status: SENT.`,
      });
    }

    expense.status = 'invoiced';
    await db.saveExpense(expense);

    return NextResponse.json({
      success: true,
      invoices: generatedInvoices,
      message: `Created and sent ${generatedInvoices.length} PayPal invoices successfully.`,
    });
  } catch (error: any) {
    console.error('PayPal invoice error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process PayPal invoices' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const expenseId = searchParams.get('expenseId');

  const allInvoices = await db.getInvoices();
  if (expenseId) {
    return NextResponse.json({
      invoices: allInvoices.filter((inv) => inv.expense_id === expenseId),
    });
  }

  return NextResponse.json({ invoices: allInvoices });
}
