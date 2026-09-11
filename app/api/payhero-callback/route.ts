import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '../../../lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  if (!adminDb) { return NextResponse.json({ success: false, status: 'disabled', message: 'This integration is not configured.' }, { status: 503 }); }
  const database = adminDb;
  const body = await request.json();

  const reference =
    body.external_reference ||
    body.externalReference ||
    body.reference ||
    body.data?.external_reference;

  const status = String(
    body.status ||
    body.transaction_status ||
    body.data?.status ||
    ''
  ).toLowerCase();

  if (!reference) {
    return NextResponse.json({ received: true, message: 'Missing reference.' });
  }

  const docRef = adminDb.collection('deposits').doc(reference);
  const snap = await docRef.get();

  if (!snap.exists) {
    return NextResponse.json({ received: true, message: 'Transaction not found.' });
  }

  const tx = snap.data();
  if (!tx) return NextResponse.json({ received: true, message: 'Transaction data is missing.' });

  const paid =
    status.includes('success') ||
    status.includes('complete') ||
    status.includes('paid');

  if (!paid) {
    await docRef.update({
      status: 'failed',
      failureReason: body.message || body.error || 'PayHero payment failed.',
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
