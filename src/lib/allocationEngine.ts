import { Expense, GroupMember, Allocation, AllocationRuleType, ExpenseItem } from './types';

export interface AllocationInput {
  expense: Expense;
  members: GroupMember[];
  rule: AllocationRuleType;
  customWeights?: Record<string, number>; // for PROPORTIONAL or USAGE_BASED
  customAmounts?: Record<string, number>; // for CUSTOM
  excludedMemberIds?: string[];
  payerMemberId?: string;
}

export interface AllocationResult {
  allocations: Allocation[];
  totalAllocated: number;
  totalExpense: number;
  discrepancy: number;
  ruleApplied: AllocationRuleType;
  explanationSummary: string;
}

/**
 * Reconcile penny rounding errors deterministically so the sum of allocations
 * matches the expense total EXACTLY to the cent.
 */
function reconcileRounding(
  allocations: { member_id: string; amount: number }[],
  targetTotal: number
): { member_id: string; amount: number }[] {
  let rounded = allocations.map((a) => ({
    member_id: a.member_id,
    amount: Math.round(a.amount * 100) / 100,
  }));

  const currentSum = rounded.reduce((acc, curr) => acc + curr.amount, 0);
  let differenceInCents = Math.round((targetTotal - currentSum) * 100);

  if (differenceInCents === 0 || rounded.length === 0) {
    return rounded;
  }

  // Distribute pennies to members (starting from highest share)
  const sorted = [...rounded].sort((a, b) => b.amount - a.amount);
  const step = differenceInCents > 0 ? 0.01 : -0.01;
  const count = Math.abs(differenceInCents);

  for (let i = 0; i < count; i++) {
    const targetIdx = i % sorted.length;
    const memberToAdjust = sorted[targetIdx];
    const match = rounded.find((m) => m.member_id === memberToAdjust.member_id);
    if (match) {
      match.amount = Math.round((match.amount + step) * 100) / 100;
    }
  }

  return rounded;
}

export function calculateAllocations(input: AllocationInput): AllocationResult {
  const { expense, members, rule, customWeights = {}, customAmounts = {}, excludedMemberIds = [] } = input;
  const payerId = input.payerMemberId || expense.payer_member_id || members[0]?.id;
  const payer = members.find((m) => m.id === payerId) || members[0];

  // Active participating members (not explicitly excluded)
  const activeMembers = members.filter((m) => !excludedMemberIds.includes(m.id));
  if (activeMembers.length === 0) {
    throw new Error('At least one member must participate in the allocation.');
  }

  const totalExpense = Math.round(expense.total * 100) / 100;
  let rawAllocations: {
    member_id: string;
    amount: number;
    explanation: string;
    items_breakdown?: { name: string; amount: number; share_ratio?: number }[];
    tax_share?: number;
    tip_share?: number;
  }[] = [];

  switch (rule) {
    case 'EQUAL': {
      const share = totalExpense / activeMembers.length;
      rawAllocations = activeMembers.map((m) => ({
        member_id: m.id,
        amount: share,
        explanation: `Equal split of $${totalExpense.toFixed(2)} across ${activeMembers.length} participants ($${share.toFixed(2)} each).`,
      }));
      break;
    }

    case 'PROPORTIONAL': {
      // Proportional to income_share or customWeights
      const totalWeight = activeMembers.reduce((sum, m) => {
        const weight = customWeights[m.id] !== undefined ? customWeights[m.id] : m.income_share || 1;
        return sum + weight;
      }, 0);

      rawAllocations = activeMembers.map((m) => {
        const weight = customWeights[m.id] !== undefined ? customWeights[m.id] : m.income_share || 1;
        const ratio = totalWeight > 0 ? weight / totalWeight : 1 / activeMembers.length;
        const amount = totalExpense * ratio;
        return {
          member_id: m.id,
          amount,
          explanation: `Income-weighted allocation (${(ratio * 100).toFixed(1)}% based on weight ${weight}).`,
        };
      });
      break;
    }

    case 'USAGE_BASED': {
      // Usage units (e.g. nights, kilometers, GBs)
      const totalUnits = activeMembers.reduce((sum, m) => {
        const units = customWeights[m.id] || 1;
        return sum + units;
      }, 0);

      rawAllocations = activeMembers.map((m) => {
        const units = customWeights[m.id] || 1;
        const ratio = totalUnits > 0 ? units / totalUnits : 1 / activeMembers.length;
        const amount = totalExpense * ratio;
        return {
          member_id: m.id,
          amount,
          explanation: `Usage-based allocation: ${units} units (${(ratio * 100).toFixed(1)}% of total ${totalUnits}).`,
        };
      });
      break;
    }

    case 'CUSTOM': {
      rawAllocations = activeMembers.map((m) => {
        const amount = customAmounts[m.id] !== undefined ? customAmounts[m.id] : totalExpense / activeMembers.length;
        return {
          member_id: m.id,
          amount,
          explanation: `Custom user-specified amount: $${amount.toFixed(2)}.`,
        };
      });
      break;
    }

    case 'ITEM_BASED':
    default: {
      const items = expense.items || [];
      if (items.length === 0) {
        // Fallback to equal if no line items exist
        const share = totalExpense / activeMembers.length;
        rawAllocations = activeMembers.map((m) => ({
          member_id: m.id,
          amount: share,
          explanation: `Split equally as no specific line items were itemized ($${share.toFixed(2)} each).`,
        }));
        break;
      }

      // 1. Calculate per-member subtotal for items assigned to them
      const memberItemTotals: Record<string, number> = {};
      const memberBreakdowns: Record<string, { name: string; amount: number; share_ratio?: number }[]> = {};

      for (const m of activeMembers) {
        memberItemTotals[m.id] = 0;
        memberBreakdowns[m.id] = [];
      }

      let unassignedAmount = 0;

      for (const item of items) {
        // Filter sharing members to only active members
        const sharingMembers = (item.shared_by || []).filter((id) =>
          activeMembers.some((m) => m.id === id)
        );

        if (sharingMembers.length === 0) {
          // If unassigned or everyone excluded, split among all active participants
          const perPerson = item.amount / activeMembers.length;
          activeMembers.forEach((m) => {
            memberItemTotals[m.id] += perPerson;
            memberBreakdowns[m.id].push({
              name: `${item.name} (Shared all)`,
              amount: perPerson,
              share_ratio: 1 / activeMembers.length,
            });
          });
          unassignedAmount += item.amount;
        } else {
          const perPerson = item.amount / sharingMembers.length;
          sharingMembers.forEach((id) => {
            if (memberItemTotals[id] !== undefined) {
              memberItemTotals[id] += perPerson;
              memberBreakdowns[id].push({
                name: sharingMembers.length > 1 ? `${item.name} (Split ${sharingMembers.length} ways)` : item.name,
                amount: perPerson,
                share_ratio: 1 / sharingMembers.length,
              });
            }
          });
        }
      }

      const totalItemsSubtotal = Object.values(memberItemTotals).reduce((sum, val) => sum + val, 0);

      // 2. Proportionally distribute tax, tip, service charge, and discounts
      const extraCharges = (expense.tax || 0) + (expense.tip || 0) + (expense.service_charge || 0) - (expense.discount || 0);

      rawAllocations = activeMembers.map((m) => {
        const itemSum = memberItemTotals[m.id] || 0;
        const proportion = totalItemsSubtotal > 0 ? itemSum / totalItemsSubtotal : 1 / activeMembers.length;

        const taxShare = (expense.tax || 0) * proportion;
        const tipShare = (expense.tip || 0) * proportion;
        const allocatedExtra = extraCharges * proportion;
        const finalMemberTotal = itemSum + allocatedExtra;

        const itemDetailsStr = memberBreakdowns[m.id].length > 0
          ? memberBreakdowns[m.id].map((i) => `${i.name} ($${i.amount.toFixed(2)})`).join(', ')
          : 'no individual items';

        const extraNote = extraCharges > 0
          ? ` plus $${allocatedExtra.toFixed(2)} proportional tax/tip (${(proportion * 100).toFixed(1)}% of extras)`
          : '';

        return {
          member_id: m.id,
          amount: finalMemberTotal,
          items_breakdown: memberBreakdowns[m.id],
          tax_share: Math.round(taxShare * 100) / 100,
          tip_share: Math.round(tipShare * 100) / 100,
          explanation: `Items: ${itemDetailsStr}${extraNote}.`,
        };
      });

      break;
    }
  }

  // Deterministic penny reconciliation to match bill exactly
  const reconciledAmounts = reconcileRounding(
    rawAllocations.map((a) => ({ member_id: a.member_id, amount: a.amount })),
    totalExpense
  );

  const finalAllocations: Allocation[] = rawAllocations.map((raw) => {
    const member = members.find((m) => m.id === raw.member_id)!;
    const reconciled = reconciledAmounts.find((r) => r.member_id === raw.member_id);
    const finalAmount = reconciled ? reconciled.amount : raw.amount;

    return {
      id: `alloc_${expense.id}_${raw.member_id}`,
      expense_id: expense.id,
      member_id: raw.member_id,
      member_name: member?.display_name || 'Group Member',
      amount: finalAmount,
      currency: expense.currency,
      rule,
      explanation: raw.explanation,
      items_breakdown: raw.items_breakdown,
      tax_share: raw.tax_share,
      tip_share: raw.tip_share,
      approved: false,
    };
  });

  const totalAllocated = finalAllocations.reduce((sum, a) => sum + a.amount, 0);
  const discrepancy = Math.round((totalExpense - totalAllocated) * 100) / 100;

  let explanationSummary = `Total bill $${totalExpense.toFixed(2)} partitioned among ${finalAllocations.length} participants using ${rule} rule.`;
  if (payer && payer.id) {
    explanationSummary += ` Upfront payment covered by ${payer.display_name}. Non-payers reimburse payer directly via PayPal.`;
  }

  return {
    allocations: finalAllocations,
    totalAllocated: Math.round(totalAllocated * 100) / 100,
    totalExpense,
    discrepancy,
    ruleApplied: rule,
    explanationSummary,
  };
}
