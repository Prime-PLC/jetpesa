import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebaseAdmin';
import { getErrorMessage } from '../../../lib/errors';

async function getDarajaToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;

  if (!key || !secret) return null;

  const auth = Buffer.from(`${key}:${secret}`).toString('base64');

  const res = await fetch(
    'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${auth}` } }
  );

  const data = await res.json();
  return data.access_token || null;
}

function normalizePhone(phone: unknown) {
  let clean = String(phone || '').trim().replace(/\s+/g, '');

  if (clean.startsWith('+')) clean = clean.slice(1);
  if (clean.startsWith('0')) clean = `254${clean.slice(1)}`;

  if (!/^254(7|1)\d{8}$/.test(clean)) {
    throw new Error('Invalid M-Pesa phone number.');
  }

  return clean;
}

function getBaseUrl(request: NextRequest) {
  const host = request.headers.get('host');
  const proto = host?.includes('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  if (!adminDb) { return NextResponse.json({ success: false, status: 'disabled', message: 'This integration is not configured.' }, { status: 503 }); }
  try {
    const { amount, phone, username } = await request.json();

    const amt = Math.floor(Number(amount));

    if (!username) throw new Error('Missing user ID.');
    if (!amt || amt < 49) throw new Error('Minimum deposit is KES 49.');

    const cleanPhone = normalizePhone(phone);
    const baseUrl = getBaseUrl(request);
    const reference = `JP-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    await adminDb.collection('deposits').doc(reference).set({
      reference,
      userId: username,
      amount: amt,
      phone: cleanPhone,
      status: 'pending',
      provider: null,
      credited: false,
      createdAt: new Date().toISOString(),
    });

    const usernamePH = process.env.PAYHERO_API_USERNAME;
    const passwordPH = process.env.PAYHERO_API_PASSWORD;
    const channelIdPH = process.env.PAYHERO_CHANNEL_ID;

    if (usernamePH && passwordPH && channelIdPH) {
      const auth = Buffer.from(`${usernamePH}:${passwordPH}`).toString('base64');

      const phRes = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: amt,
          phone_number: cleanPhone,
          channel_id: Number(channelIdPH),
          provider: 'm-pesa',
          external_reference: reference,
          callback_url: `${baseUrl}/api/payhero-callback`,
        }),
      });

      const phData = await phRes.json();

      if (phRes.ok && (phRes.status === 201 || phData.success)) {
        await adminDb.collection('deposits').doc(reference).update({
          provider: 'payhero',
          providerReference: phData.reference || null,
          providerResponse: phData,
        });

        return NextResponse.json({
          success: true,
          status: 'pending',
          provider: 'payhero',
          reference,
          message: 'STK push sent. Complete payment on your phone.',
        });
      }
    }

    const token = await getDarajaToken();
    if (!token) throw new Error('Failed! Token could not be generated. Please retry.');

    const storeNumber = process.env.MPESA_STORE_NUMBER;
    const tillNumber = process.env.MPESA_TILL_NUMBER;
    const passKey = process.env.MPESA_PASSKEY;

    if (!storeNumber || !tillNumber || !passKey) {
      throw new Error('Daraja credentials are incomplete.');
    }

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${storeNumber}${passKey}${timestamp}`).toString('base64');

    const darajaRes = await fetch(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: storeNumber,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerBuyGoodsOnline',
          Amount: amt,
          PartyA: cleanPhone,
          PartyB: tillNumber,
          PhoneNumber: cleanPhone,
          CallBackURL: `${baseUrl}/api/daraja-callback`,
          AccountReference: reference,
          TransactionDesc: 'JetPesa Wallet TopUp',
        }),
      }
    );

    const darajaData = await darajaRes.json();

    if (darajaData.ResponseCode !== '0') {
      throw new Error(
        darajaData.errorMessage ||
        darajaData.ResponseDescription ||
        'Daraja STK push failed.'
      );
    }

    await adminDb.collection('deposits').doc(reference).update({
      provider: 'daraja',
      checkoutRequestId: darajaData.CheckoutRequestID,
      merchantRequestId: darajaData.MerchantRequestID,
      providerResponse: darajaData,
    });

    return NextResponse.json({
      success: true,
      status: 'pending',
      provider: 'daraja',
      reference,
      checkoutRequestId: darajaData.CheckoutRequestID,
      message: 'STK push sent. Complete payment on your phone.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        status: 'failed',
        message: getErrorMessage(error),
      },
      { status: 400 }
    );
  }
}
