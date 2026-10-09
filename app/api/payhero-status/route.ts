import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  if (!adminDb || !adminAuth) return NextResponse.json({ success: false, status: 'disabled', message: 'This integration is not configured.' }, { status: 503 });
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ success: false, message: 'Authentication is required.' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const reference = new URL(request.url).searchParams.get('reference');
    if (!reference) return NextResponse.json({ success: false, message: 'Missing reference.' }, { status: 400 });

    const snap = await adminDb.collection('deposits').doc(reference).get();
    if (!snap.exists) return NextResponse.json({ success: false, message: 'Transaction not found.' }, { status: 404 });
    const deposit = snap.data() || {};
    if (deposit.userId !== decoded.uid) return NextResponse.json({ success: false, message: 'Transaction not found.' }, { status: 404 });

    return NextResponse.json({ success: true, reference, amount: deposit.amount, status: deposit.status, failureReason: deposit.failureReason || null, credited: deposit.credited === true });
  } catch {
    return NextResponse.json({ success: false, message: 'Authentication is required.' }, { status: 401 });
  }
}