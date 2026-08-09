# JetPesa ✈️

JetPesa is a modern Aviator-style betting platform built using Next.js, Firebase, PayHero, and Safaricom Daraja STK Push.

The platform features:

- Real-time Aviator gameplay
- Auto Bet & Auto Cashout
- M-Pesa deposits via PayHero + Daraja fallback
- Firebase Authentication
- Firestore wallet management
- Live multiplayer lobby chat
- Mobile responsive cockpit UI
- Rain effects, sounds, animations, and flight simulation
- Provably fair styled gameplay system

---

# Tech Stack

- Next.js 14
- React
- Firebase Authentication
- Firebase Firestore
- Firebase Admin SDK
- Safaricom Daraja API
- PayHero API
- Vercel Deployment
- Canvas API
- canvas-confetti

---

# Installation

Clone the repository:

```bash
git clone https://github.com/tookarius/jetpesa.git
cd jetpesa
```

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

---

# Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

PAYHERO_API_USERNAME=
PAYHERO_API_PASSWORD=
PAYHERO_CHANNEL_ID=

MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_STORE_NUMBER=
MPESA_TILL_NUMBER=
MPESA_PASSKEY=
```

---

# Firebase Setup

## 1. Enable Authentication

Enable:

- Email/Password
- Phone Authentication

Inside Firebase Console.

---

## 2. Create Firestore Database

Use Production Mode.

### Firestore Rules

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /deposits/{depositId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

---

## 3. Firebase Admin SDK

Generate a service account:

Firebase Console → Project Settings → Service Accounts → Generate Private Key

Use the values in:

```env
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

---

# Payment System

JetPesa uses:

1. PayHero as the primary STK gateway
2. Safaricom Daraja as automatic fallback

Wallet balances are credited ONLY after callback confirmation.

This prevents fake deposits and premature wallet funding.

---

# Deployment

Recommended deployment:

- Vercel
- Koyeb
- Replit
- Render
- VPS

## Continuous Integration

GitHub Actions installs the locked dependencies and runs a production build for every pull request and every push to `main`. The build uses generated placeholder Firebase credentials; production credentials must only be configured in the deployment platform.

---

# Features

## Aviator Gameplay

- Real-time multiplier engine
- Crash simulation
- Auto flight rendering
- Animated SVG aircraft
- Rain mode
- Sound system

## Wallet

- Deposit via M-Pesa
- Withdrawal requests
- Real-time balance updates

## Betting

- Dual betting decks
- Auto bet
- Auto cashout
- Manual cashout

## Social

- Live chat room
- Multiplayer activity feed
- Live wager tape

---

# Production Notes

Important:

- Never credit wallets from frontend responses
- Always use payment callbacks
- Keep Firebase Admin keys private
- Use Firestore security rules
- Validate all payment amounts server-side

---

# License

MIT License

---

# Author

TK.
