import { Allocation, Expense, GroupMember, GroupRule } from './types';

/**
 * Generate a transparent, human-readable narrative explanation for an individual's share.
 * This is the heart of the "Fairness Ledger" innovation.
 */
export function generateIndividualExplanation(
  allocation: Allocation,
  expense: Expense,
  payer: GroupMember,
  applicableRules: GroupRule[] = []
): string {
  const isPayer = allocation.member_id === payer.id;
  const payerText = isPayer
    ? `You paid the upfront bill of $${expense.total.toFixed(2)} and are owed reimbursements from other group members.`
    : `Owes $${allocation.amount.toFixed(2)} to ${payer.display_name} via PayPal invoice.`;

  let itemDetails = '';
  if (allocation.items_breakdown && allocation.items_breakdown.length > 0) {
    const itemsList = allocation.items_breakdown
      .map((item) => `${item.name} ($${item.amount.toFixed(2)})`)
      .join(', ');
    itemDetails = `Items consumed: ${itemsList}.`;
  }

  let extraDetails = '';
  if (allocation.tax_share && allocation.tax_share > 0) {
    extraDetails += ` Includes $${allocation.tax_share.toFixed(2)} proportional tax`;
  }
  if (allocation.tip_share && allocation.tip_share > 0) {
    extraDetails += `${extraDetails ? ' and' : ' Includes'} $${allocation.tip_share.toFixed(2)} proportional tip`;
  }
  if (extraDetails) {
    extraDetails += '.';
  }

  let ruleNotes = '';
  const matchingRule = applicableRules.find(
    (r) => r.target_member_id === allocation.member_id || r.rule_type === 'equal_split'
  );
  if (matchingRule) {
    ruleNotes = ` [Applied Group Memory: "${matchingRule.title}"]`;
  }

  return `${itemDetails} ${extraDetails} ${payerText}${ruleNotes}`.trim();
}

/**
 * Generate a comprehensive audit explanation for the entire fairness event.
 */
export function generateFairnessAuditSummary(
  expense: Expense,
  allocations: Allocation[],
  payer: GroupMember,
  rule: string,
  approvedBy?: string
): string {
  const participantCount = allocations.length;
  const dateStr = expense.expense_date || new Date().toISOString().split('T')[0];
  const approverNote = approvedBy ? ` Approved by ${approvedBy}.` : ' Pending group approval before PayPal settlement.';

  return `Expense "${expense.merchant}" ($${expense.total.toFixed(2)}) from ${dateStr} divided across ${participantCount} members using ${rule} fairness rule. Payer: ${payer.display_name}.${approverNote}`;
}
