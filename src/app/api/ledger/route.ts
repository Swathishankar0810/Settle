import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const expenseId = searchParams.get('expenseId') || undefined;
  const events = await db.getFairnessEvents(expenseId);
  return NextResponse.json({ events });
}
