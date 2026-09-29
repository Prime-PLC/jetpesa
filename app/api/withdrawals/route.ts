import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, FieldValue } from '../../../lib/firebaseAdmin';

const MIN_WITHDRAWAL = 50;

async function authenticate(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !adminAuth) throw new Error('Authentication is required.');
  return adminAuth.verifyIdToken(token);
}

export async function POST(request: NextRequest) {
  if (!adminDb) return NextResponse.json({ success: false, message: 'Withdrawals are not configured.' }, { status: 503 });

  try {
    const decoded = await authenticate(request);
    const body = await request.json();
    const amount = Number(body.amount);

    if (!Number.isInteger(amount) || amount < MIN_WITHDRAWAL) {
      return NextResponse.json({ success: false, message: `Minimum withdrawal is KES ${MIN_WITHDRAWAL}.` }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(decoded.uid);
    const withdrawalRef = adminDb.collection('withdrawals').doc();

    await adminDb.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists) throw new Error('User profile was not found.');

      const profile = userSnapshot.data() || {};
      const balance = Number(profile.walletBalance || 0);
      const phone = String(profile.mpesaPhone || '').trim();

      if (!/^(07|01)\d{8}$/.test(phone)) throw new Error('Add a valid registered M-Pesa number before withdrawing.');
      if (amount > balance) throw new Error('Withdrawal exceeds your available balance.');

      transaction.update(userRef, { walletBalance: balance - amount, updatedAt: FieldValue.serverTimestamp() });
      transaction.create(withdrawalRef, {
        userId: decoded.uid,
        email: decoded.email || profile.email || '',
        phone,
        amount,
        status: 'pending',
        fundsReserved: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ success: true, id: withdrawalRef.id, status: 'pending' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Withdrawal request failed.';
    const status = message === 'Authentication is required.' ? 401 : 400;
    return NextResponse.json({ success: false, message }, { status });
  }
}