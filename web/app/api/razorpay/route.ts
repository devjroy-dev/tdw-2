import { NextRequest, NextResponse } from 'next/server';

const RAILWAY = process.env.NEXT_PUBLIC_RAILWAY_URL || 'https://dream-wedding-production-89ae.up.railway.app';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...payload } = body;

    const endpoint = action === 'verify'
      ? `${RAILWAY}/api/v2/razorpay/verify-payment`
      : `${RAILWAY}/api/v2/razorpay/create-order`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Request failed' }, { status: 500 });
  }
}
