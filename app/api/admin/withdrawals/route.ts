import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, FieldValue } from '../../../../lib/firebaseAdmin';

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !adminAuth) throw new Error('Authentication is required.');
  const decoded = await adminAuth.verifyIdToken(token);
  const configuredAdmins = (process.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (decoded.admin !== true && !configuredAdmins.includes(String(decoded.email || '').toLowerCase())) {
    throw new Error('Administrator access is required.');
  }
  return decoded;
}

export async function GET(request: NextRequest) {
  if (!adminDb) return NextResponse.json({ success: false, message: 'Admin services are not configured.' }, { status: 503 });
  try {
    await requireAdmin(request);
    const snapshot = await adminDb.collection('withdrawals').limit(200).get();
    const withdrawals = snapshot.docs.map((document) => ({ id: document.id, ...document.data(), createdAt: document.data().createdAt?.toDate?.().toISOString?.() || null }))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return NextResponse.json({ success: true, withdrawals });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load withdrawals.';
    return NextResponse.json({ success: false, message }, { status: message.includes('required') ? 403 : 400 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!adminDb) return NextResponse.json({ success: false, message: 'Admin services are not configured.' }, { status: 503 });
  try {
    const admin = await requireAdmin(request);
    const { id, action, note = '' } = await request.json();
    if (!id || !['approve', 'paid', 'reject'].includes(action)) throw new Error('Invalid withdrawal action.');

    const withdrawalRef = adminDb.collection('withdrawals').doc(String(id));
    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(withdrawalRef);
      if (!snapshot.exists) throw new Error('Withdrawal request was not found.');
      const withdrawal = snapshot.data() || {};
      const currentStatus = String(withdrawal.status || '');

      if (action === 'approve' && currentStatus !== 'pending') throw new Error('Only pending requests can be approved.');
      if (action === 'paid' && currentStatus !== 'approved') throw new Error('Only approved requests can be marked paid.');
      if (action === 'reject' && !['pending', 'approved'].includes(currentStatus)) throw new Error('This request cannot be rejected.');

      if (action === 'reject' && withdrawal.fundsReserved) {
        const userRef = adminDb!.collection('users').doc(String(withdrawal.userId));
        transaction.update(userRef, { walletBalance: FieldValue.increment(Number(withdrawal.amount)), updatedAt: FieldValue.serverTimestamp() });
      }

      transaction.update(withdrawalRef, {
        status: action === 'approve' ? 'approved' : action,
        fundsReserved: action === 'reject' ? false : withdrawal.fundsReserved,
        reviewNote: String(note).slice(0, 500),
        reviewedBy: admin.uid,
        updatedAt: FieldValue.serverTimestamp(),
        ...(action === 'paid' ? { paidAt: FieldValue.serverTimestamp() } : {}),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update withdrawal.';
    return NextResponse.json({ success: false, message }, { status: message.includes('required') ? 403 : 400 });
  }
}