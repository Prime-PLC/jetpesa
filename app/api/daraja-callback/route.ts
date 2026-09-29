import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '../../../lib/firebaseAdmin';
import { creditConfirmedDeposit } from '../../../lib/creditDeposit';

export async function POST(request: NextRequest) {
  if (!adminDb) return NextResponse.json({ success: false, status: 'disabled', message: 'This integration is not configured.' }, { status: 503 });
  const body = await request.json();
  const stk = body?.Body?.stkCallback;
  const checkoutRequestId = stk?.CheckoutRequestID;
  if (!checkoutRequestId) return NextResponse.json({ received: true, message: 'Missing checkout request ID.' });

  const query = await adminDb.collection('deposits').where('checkoutRequestId', '==', checkoutRequestId).limit(1).get();
  if (query.empty) return NextResponse.json({ received: true, message: 'Transaction not found.' });
  const depositRef = query.docs[0].ref;

  if (Number(stk?.ResultCode) !== 0) {
    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(depositRef);
      if (!snapshot.exists || snapshot.data()?.credited === true) return;
      transaction.update(depositRef, { status: 'failed', failureReason: stk?.ResultDesc || 'Daraja payment failed.', callbackBody: body, updatedAt: FieldValue.serverTimestamp() });
    });
    return NextResponse.json({ received: true });
  }

  const metadata = Object.fromEntries((stk?.CallbackMetadata?.Item || []).map((item: { Name?: string; Value?: unknown }) => [item.Name || '', item.Value]));
  const result = await creditConfirmedDeposit(adminDb, depositRef.id, {
    amount: Number(metadata.Amount),
    phone: String(metadata.PhoneNumber || ''),
    providerReference: String(metadata.MpesaReceiptNumber || ''),
    callbackBody: body,
  });
  return NextResponse.json({ received: true, result });
}