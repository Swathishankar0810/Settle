import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateAllocations } from '@/lib/allocationEngine';
import { generateIndividualExplanation, generateFairnessAuditSummary } from '@/lib/explanationEngine';
import { processConversationalInstruction } from '@/lib/aiService';
import { AllocationRuleType, Expense } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      expenseId,
      rule = 'ITEM_BASED',
      conversationalPrompt,
      customWeights,
      customAmounts,
      payerMemberId,
      excludedMemberIds,
      updatedItemAssignments,
    } = body;

    let expense = await db.getExpenseById(expenseId);
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const members = await db.getMembers();
    const rules = await db.getGroupRules();

    let activeRule: AllocationRuleType = rule;
    let weights = customWeights;
    let currentPayerId = payerMemberId || expense.payer_member_id || members[0].id;
    let conversationalResponse = null;

    // 1. If user provided conversational instruction (e.g. "Priya had two drinks", "Meera doesn't drink")
    if (conversationalPrompt && conversationalPrompt.trim()) {
      const adjustment = await processConversationalInstruction(
        conversationalPrompt,
        expense,
        members,
        activeRule
      );

      conversationalResponse = adjustment;

      if (adjustment.updatedRule) {
        activeRule = adjustment.updatedRule;
      }
      if (adjustment.updatedWeights) {
        weights = adjustment.updatedWeights;
      }
      if (adjustment.newPayerId) {
        currentPayerId = adjustment.newPayerId;
        expense.payer_member_id = currentPayerId;
      }
      if (adjustment.updatedAssignments && expense.items) {
        expense.items = expense.items.map((item) => {
          if (adjustment.updatedAssignments && adjustment.updatedAssignments[item.id]) {
            return {
              ...item,
              shared_by: adjustment.updatedAssignments[item.id],
            };
          }
          return item;
        });
      }

      await db.logFairnessEvent({
        expense_id: expense.id,
        actor: 'Conversational Concierge',
        event_type: 'CONVERSATIONAL_EDIT',
        explanation: `User instruction: "${conversationalPrompt}". Outcome: ${adjustment.explanation}`,
      });
    }

    // 2. If client supplied direct item reassignment
    if (updatedItemAssignments && expense.items) {
      expense.items = expense.items.map((item) => {
        if (updatedItemAssignments[item.id]) {
          return {
            ...item,
            shared_by: updatedItemAssignments[item.id],
          };
        }
        return item;
      });
    }

    // Save any updates to expense
    await db.saveExpense(expense);

    // 3. Execute Deterministic Allocation Engine
    const result = calculateAllocations({
      expense,
      members,
      rule: activeRule,
      customWeights: weights,
      customAmounts,
      payerMemberId: currentPayerId,
      excludedMemberIds,
    });

    const payer = members.find((m) => m.id === currentPayerId) || members[0];

    // 4. Enrich allocations with human explanations and group memory rules
    const enrichedAllocations = result.allocations.map((alloc) => {
      const explanation = generateIndividualExplanation(alloc, expense as Expense, payer, rules);
      return {
        ...alloc,
        explanation,
      };
    });

    // Save allocations to persistent store
    await db.saveAllocations(expense.id, enrichedAllocations);

    const auditSummary = generateFairnessAuditSummary(
      expense,
      enrichedAllocations,
      payer,
      activeRule
    );

    await db.logFairnessEvent({
      expense_id: expense.id,
      actor: 'Fairness Engine',
      event_type: 'RULE_APPLIED',
      explanation: auditSummary,
    });

    return NextResponse.json({
      success: true,
      allocations: enrichedAllocations,
      totalAllocated: result.totalAllocated,
      discrepancy: result.discrepancy,
      ruleApplied: activeRule,
      explanationSummary: result.explanationSummary,
      auditSummary,
      expense,
      conversationalAdjustment: conversationalResponse,
    });
  } catch (error: any) {
    console.error('Allocation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate allocation' },
      { status: 500 }
    );
  }
}
