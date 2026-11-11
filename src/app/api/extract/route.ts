import { NextRequest, NextResponse } from 'next/server';
import { extractReceiptWithAI } from '@/lib/aiService';
import { db } from '@/lib/db';
import { SAMPLE_EXPENSES } from '@/lib/sampleData';
import { Expense } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let extracted;
    let scenarioKey: string | undefined;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      scenarioKey = body.scenarioKey;

      if (scenarioKey && SAMPLE_EXPENSES[scenarioKey]) {
        // Instant high-fidelity demo sample
        const sample = SAMPLE_EXPENSES[scenarioKey] as Expense;
        await db.saveExpense(sample);
        await db.logFairnessEvent({
          expense_id: sample.id,
          actor: 'Settle AI Vision',
          event_type: 'EXTRACTION',
          explanation: `Loaded sample receipt "${sample.merchant}" ($${sample.total.toFixed(2)}) with ${sample.items?.length || 0} line items.`,
        });

        return NextResponse.json({
          success: true,
          expense: sample,
          isSample: true,
        });
      }

      if (body.text) {
        extracted = await extractReceiptWithAI(body.text, false);
      } else if (body.imageUrl) {
        extracted = await extractReceiptWithAI(body.imageUrl, true);
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const text = formData.get('text') as string | null;

      if (text) {
        extracted = await extractReceiptWithAI(text, false);
      } else if (file) {
        // Read file as base64
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');
        const mimeType = file.type || 'image/jpeg';
        const dataUrl = `data:${mimeType};base64,${base64}`;
        extracted = await extractReceiptWithAI(dataUrl, true);
      }
    }

    if (!extracted) {
      return NextResponse.json(
        { error: 'No receipt text, image, or scenario provided.' },
        { status: 400 }
      );
    }

    const members = await db.getMembers();
    const group = await db.getGroup();

    // Map raw AI items to ExpenseItem models
    const newExpenseId = `exp_${Date.now()}`;
    const items = (extracted.line_items || []).map((item, index) => {
      // Default assignment: if item is alcohol and Meera is exempt, exclude Meera
      let shared_by = members.map((m) => m.id);
      if (item.category === 'Alcohol' || /beer|ipa|wine|cocktail/i.test(item.name)) {
        shared_by = members.filter((m) => !m.display_name.includes('Meera')).map((m) => m.id);
      }

      return {
        id: `item_${newExpenseId}_${index + 1}`,
        expense_id: newExpenseId,
        name: item.name,
        amount: item.amount,
        quantity: item.quantity,
        unit_price: item.unit_price ?? item.amount,
        category: item.category || 'General',
        shared_by,
        confidence: item.confidence,
      };
    });

    const newExpense: Expense = {
      id: newExpenseId,
      group_id: group.id,
      merchant: extracted.merchant || 'Untitled Expense',
      merchant_category: extracted.merchant_category || 'General',
      expense_date: extracted.transaction_date || new Date().toISOString().split('T')[0],
      currency: (extracted.currency as any) || 'USD',
      subtotal: extracted.subtotal || extracted.total || 0,
      tax: extracted.tax || 0,
      service_charge: extracted.service_charge || 0,
      tip: extracted.tip || 0,
      discount: extracted.discount || 0,
      total: extracted.total || (extracted.subtotal || 0) + (extracted.tax || 0) + (extracted.tip || 0),
      payer_member_id: members[0].id,
      source_type: 'receipt',
      raw_ai_output: extracted,
      status: 'draft',
      created_at: new Date().toISOString(),
      items,
    };

    await db.saveExpense(newExpense);
    await db.logFairnessEvent({
      expense_id: newExpenseId,
      actor: 'AI Extraction Engine',
      event_type: 'EXTRACTION',
      explanation: `Extracted ${items.length} line items from receipt. Total: $${newExpense.total.toFixed(2)} (Subtotal: $${newExpense.subtotal.toFixed(2)}, Tax: $${newExpense.tax.toFixed(2)}, Tip: $${newExpense.tip.toFixed(2)}).`,
    });

    return NextResponse.json({
      success: true,
      expense: newExpense,
      rawOutput: extracted,
    });
  } catch (error: any) {
    console.error('Extraction API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract receipt' },
      { status: 500 }
    );
  }
}
