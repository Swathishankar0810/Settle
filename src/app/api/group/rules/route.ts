import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { GroupRule } from '@/lib/types';

export async function GET() {
  const rules = await db.getGroupRules();
  const members = await db.getMembers();
  return NextResponse.json({ rules, members });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const group = await db.getGroup();

    const newRule: GroupRule = {
      id: `rule_${Date.now()}`,
      group_id: group.id,
      title: body.title || 'Custom Group Rule',
      description: body.description || '',
      rule_type: body.rule_type || 'equal_split',
      target_member_id: body.target_member_id,
      target_category: body.target_category,
      active: true,
      created_at: new Date().toISOString(),
    };

    await db.saveGroupRule(newRule);
    return NextResponse.json({ success: true, rule: newRule });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ruleId } = await req.json();
    const updated = await db.toggleGroupRule(ruleId);
    if (!updated) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, rule: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
