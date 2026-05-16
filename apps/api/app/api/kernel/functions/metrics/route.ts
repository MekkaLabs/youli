import { NextResponse } from 'next/server';
import { getFunctionMetrics } from '@/services/kernel/function-observability';

export async function GET() {
  return NextResponse.json(getFunctionMetrics(400));
}

