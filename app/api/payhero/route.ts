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
    { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' }
  );

  if (!res.ok) return null;

  const data = await res.json() as { access_token?: string };
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
  const configuredUrl = process.env.MPESA_CALLBACK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!host) throw new Error('Payment callback URL is not configured.');

  const forwardedProtocol = request.headers.get('x-forwarded-proto');
  const proto = forwardedProtocol || (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function getDarajaTimestamp() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
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

    const token = await getDarajaToken();
    if (!token) throw new Error('Failed! Token could not be generated. Please retry.');

    const businessShortCode = process.env.MPESA_TILL_NUMBER || process.env.MPESA_STORE_NUMBER;
    const passKey = process.env.MPESA_PASSKEY;

    if (!businessShortCode || !passKey) {
      throw new Error('Daraja credentials are incomplete. Set MPESA_TILL_NUMBER and MPESA_PASSKEY.');
    }

    const timestamp = getDarajaTimestamp();
    const password = Buffer.from(`${businessShortCode}${passKey}${timestamp}`).toString('base64');
    const callbackUrl = `${baseUrl}/api/daraja-callback`;

    const darajaRes = await fetch(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: businessShortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerBuyGoodsOnline',
          Amount: amt,
          PartyA: cleanPhone,
          PartyB: businessShortCode,
          PhoneNumber: cleanPhone,
          CallBackURL: callbackUrl,
          AccountReference: reference,
          TransactionDesc: 'JetPesa Wallet TopUp',
        }),
      }
    );

    const darajaData = await darajaRes.json() as {
      ResponseCode?: string;
      ResponseDescription?: string;
      errorMessage?: string;
      CheckoutRequestID?: string;
      MerchantRequestID?: string;
    };

    if (!darajaRes.ok || darajaData.ResponseCode !== '0') {
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
