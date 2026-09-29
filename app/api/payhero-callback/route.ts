import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '../../../lib/firebaseAdmin';
import { creditConfirmedDeposit } from '../../../lib/creditDeposit';

export async function POST(request: NextRequest) {
  if (!adminDb) return NextResponse.json({ success: false, status: 'disabled', message: 'This integration is not configured.' }, { status: 503 });
  const body = await request.json();
  const reference = body.external_reference || body.externalReference || body.data?.external_reference;
  if (!reference) return NextResponse.json({ received: true, message: 'Missing external reference.' });

  const depositRef = adminDb.collection('deposits').doc(String(reference));
  const status = String(body.status || body.transaction_status || body.data?.status || '').toLowerCase();
  const paid = body.success === true || body.data?.success === true || ['success', 'completed', 'complete', 'paid'].includes(status);

  if (!paid) {
    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(depositRef);
      if (!snapshot.exists || snapshot.data()?.credited === true) return;
      transaction.update(depositRef, { status: 'failed', failureReason: body.message || body.error || 'PayHero payment failed.', callbackBody: body, updatedAt: FieldValue.serverTimestamp() });
    });
    return NextResponse.json({ received: true });
  }

  const result = await creditConfirmedDeposit(adminDb, String(reference), {
    amount: Number(body.amount ?? body.data?.amount),
    phone: body.phone_number ?? body.phone ?? body.data?.phone_number,
    providerReference: body.reference ?? body.data?.reference,
    callbackBody: body,
  });
  return NextResponse.json({ received: true, result });
}