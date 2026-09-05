import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '../../../lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  if (!adminDb) { return NextResponse.json({ success: false, status: 'disabled', message: 'This integration is not configured.' }, { status: 503 }); }
  const database = adminDb;
  let body: Record<string, any>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ received: true, message: 'Invalid callback body.' });
  }

  const stk = body?.Body?.stkCallback;
  const resultCode = Number(stk?.ResultCode);
  const checkoutRequestId = stk?.CheckoutRequestID;

  if (!checkoutRequestId || !Number.isFinite(resultCode)) {
    return NextResponse.json({ received: true, message: 'Incomplete callback.' });
  }

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

  await database.runTransaction(async (transaction) => {
    const depositSnapshot = await transaction.get(docRef);
    const deposit = depositSnapshot.data();

    if (!depositSnapshot.exists || !deposit || deposit.credited) return;

    transaction.update(docRef, {
      status: 'completed',
      credited: true,
      callbackBody: body,
      updatedAt: new Date().toISOString(),
    });

    transaction.set(database.collection('users').doc(deposit.userId), {
      walletBalance: FieldValue.increment(Number(deposit.amount)),
    }, { merge: true });
  });

  return NextResponse.json({ received: true });
}
