import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SubscriptionItem } from '@/lib/types';

export async function GET() {
  const subscriptions = await db.getSubscriptions();
  const members = await db.getMembers();

  const totalMonthly = subscriptions
    .filter((s) => s.status !== 'cancelled')
    .reduce((sum, s) => {
      const monthly = s.billing_cycle === 'annual' ? s.amount / 12 : s.amount;
      return sum + monthly;
    }, 0);

  const potentialAnnualSavings = subscriptions
    .filter((s) => s.status !== 'cancelled' && s.recommendation)
    .reduce((sum, s) => sum + (s.recommendation?.annual_savings || 0), 0);

  return NextResponse.json({
    subscriptions,
    members,
    metrics: {
      totalMonthly: Math.round(totalMonthly * 100) / 100,
      totalAnnual: Math.round(totalMonthly * 12 * 100) / 100,
      potentialAnnualSavings: Math.round(potentialAnnualSavings * 100) / 100,
      flaggedCount: subscriptions.filter((s) => s.status === 'flagged_unused' || s.status === 'review').length,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, subscriptionId } = body;

    const subscriptions = await db.getSubscriptions();
    const target = subscriptions.find((s) => s.id === subscriptionId);

    if (!target) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    if (action === 'apply_recommendation') {
      if (target.recommendation?.action === 'cancel_unused') {
        target.status = 'cancelled';
      } else if (target.recommendation?.action === 'downgrade') {
        target.amount = target.amount - (target.recommendation.monthly_savings || 0);
        target.status = 'active';
      }
      await db.saveSubscription(target);

      await db.logFairnessEvent({
        expense_id: target.id,
        actor: 'Recurring Cost Radar',
        event_type: 'RULE_APPLIED',
        explanation: `Applied optimization for ${target.service_name}: saved $${(target.recommendation?.annual_savings || 0).toFixed(2)}/yr.`,
      });

      return NextResponse.json({ success: true, subscription: target });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
