import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from './firebaseAdmin';

type CreditEvidence = { amount: number; phone?: string; providerReference?: string; callbackBody: unknown };

const normalizePhone = (value: unknown) => {
  let phone = String(value || '').replace(/\s+/g, '');
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('0')) phone = `254${phone.slice(1)}`;
  return phone;
};

export async function creditConfirmedDeposit(database: Firestore, reference: string, evidence: CreditEvidence) {
  const depositRef = database.collection('deposits').doc(reference);
  return database.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(depositRef);
    if (!snapshot.exists) return 'not_found' as const;
    const deposit = snapshot.data() || {};
    if (deposit.credited === true) return 'already_credited' as const;

    const expectedAmount = Number(deposit.amount);
    const callbackAmount = Number(evidence.amount);
    const expectedPhone = normalizePhone(deposit.phone);
    const callbackPhone = normalizePhone(evidence.phone);
    const providerMismatch = deposit.providerReference && evidence.providerReference && deposit.providerReference !== evidence.providerReference;
    const evidenceMismatch = !Number.isInteger(callbackAmount) || callbackAmount !== expectedAmount || (callbackPhone && callbackPhone !== expectedPhone) || providerMismatch;

    if (evidenceMismatch) {
      transaction.update(depositRef, {
        status: 'review_required',
        failureReason: 'Provider confirmation did not match the initiated deposit.',
        callbackBody: evidence.callbackBody,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return 'review_required' as const;
    }

    const userRef = database.collection('users').doc(String(deposit.userId));
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) throw new Error('Deposit user profile was not found.');

    transaction.update(depositRef, {
      status: 'completed',
      credited: true,
      callbackBody: evidence.callbackBody,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(userRef, {
      walletBalance: FieldValue.increment(expectedAmount),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return 'credited' as const;
  });
}