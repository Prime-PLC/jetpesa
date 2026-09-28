import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '../../../lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  if (!adminDb) { return NextResponse.json({ success: false, status: 'disabled', message: 'This integration is not configured.' }, { status: 503 }); }
  const database = adminDb;
  const body = await request.json();

  const stk = body?.Body?.stkCallback;
  const resultCode = stk?.ResultCode;
  const checkoutRequestId = stk?.CheckoutRequestID;

  const query = await adminDb
    .collection('deposits')
    .where('checkoutRequestId', '==', checkoutRequestId)
    .limit(1)
    .get();

  if (query.empty) {
    return NextResponse.json({ received: true, message: 'Transaction not found.' });
  }

  const docRef = query.docs[0].ref;
  const tx = query.docs[0].data();

  if (resultCode !== 0) {
    await docRef.update({
      status: 'failed',
      failureReason: stk?.ResultDesc || 'Daraja payment failed.',
      callbackBody: body,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ received: true });
  }

  if (!tx.credited) {
    await database.runTransaction(async (transaction) => {
      transaction.update(docRef, {
        status: 'completed',
        credited: true,
        callbackBody: body,
        updatedAt: new Date().toISOString(),
      });

      transaction.update(database.collection('users').doc(tx.userId), {
        walletBalance: FieldValue.increment(tx.amount),
      });
    });
  }

  return NextResponse.json({ received: true });
}
