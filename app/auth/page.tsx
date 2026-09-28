'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isDemoMode, missingFirebaseConfig } from '../../firebaseConfig';
import { ThemeSelector } from '../ThemeProvider';
import styles from './auth.module.css';
import { getErrorMessage } from '../../lib/errors';

type AuthTab = 'login' | 'signup';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    router.prefetch('/dashboard');
  }, [router]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'signup' || tab === 'login') setActiveTab(tab);
  }, [searchParams]);

  const cleanPhone = (value: string) => value.trim().replace(/\s+/g, '');
  const validatePhone = (value: string) => /^(07|01)\d{8}$/.test(cleanPhone(value));

  const resolveEmailFromPhone = async (value: string) => {
    if (!db) throw new Error('Authentication is not configured for this environment.');
    const snap = await getDoc(doc(db, 'phoneLookup', cleanPhone(value)));
    if (!snap.exists()) throw new Error('No account found with that phone number.');
    const resolvedEmail = snap.data().email;
    if (typeof resolvedEmail !== 'string') throw new Error('This account has no valid email address.');
    return resolvedEmail;
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      if (isDemoMode) throw new Error('Google sign-in is unavailable in demo mode.');
      if (!auth || !db) {
        throw new Error(`Firebase is not configured. Add ${missingFirebaseConfig.join(', ')} to .env.local, set NEXT_PUBLIC_DEMO_MODE=false, then restart the dev server.`);
      }

      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const userRef = doc(db, 'users', credential.user.uid);
      try {
        await setDoc(userRef, {
          uid: credential.user.uid,
          email: credential.user.email || '',
          displayName: credential.user.displayName || '',
          mpesaPhone: '',
          walletBalance: 0,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      } catch (firestoreError) {
        console.warn('Google authentication succeeded, but the Firestore profile could not be saved yet.', firestoreError);
      }

      router.replace('/dashboard');
    } catch (error) {
      setErrorMsg(getErrorMessage(error).replace('Firebase:', '').trim());
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      if (isDemoMode) {
        localStorage.setItem('jetpesa_demo_user', JSON.stringify({
          uid: 'jetpesa-demo-user',
          email: activeTab === 'signup' ? email.trim().toLowerCase() : loginIdentifier.trim() || 'demo@jetpesa.test',
          mpesaPhone: cleanPhone(phone) || '0712345678',
          displayName: 'Demo Pilot',
        }));
        router.replace('/dashboard');
        return;
      }
      if (!auth || !db) {
        throw new Error(`Firebase is not configured. Add ${missingFirebaseConfig.join(', ')} to .env.local, set NEXT_PUBLIC_DEMO_MODE=false, then restart the dev server.`);
      }
      if (activeTab === 'login') {
        let finalEmail = loginIdentifier.trim();
        if (!finalEmail.includes('@')) finalEmail = await resolveEmailFromPhone(finalEmail);
        await signInWithEmailAndPassword(auth, finalEmail, password);
      } else {
        if (!validatePhone(phone)) throw new Error('Enter a valid Kenyan mobile number, for example 0712345678.');
        const cleanEmail = email.trim().toLowerCase();
        const cleanMpesaPhone = cleanPhone(phone);
        const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await Promise.all([
          setDoc(doc(db, 'users', credential.user.uid), { uid: credential.user.uid, email: cleanEmail, mpesaPhone: cleanMpesaPhone, walletBalance: 0, createdAt: new Date().toISOString() }),
          setDoc(doc(db, 'phoneLookup', cleanMpesaPhone), { uid: credential.user.uid, email: cleanEmail }),
        ]);
      }
      router.replace('/dashboard');
    } catch (error) {
      setErrorMsg(getErrorMessage(error).replace('Firebase:', '').trim());
      setLoading(false);
    }
  };

  const selectTab = (tab: AuthTab) => { setActiveTab(tab); setErrorMsg(''); };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><span aria-hidden="true">JP</span><strong>JetPesa</strong></Link>
        <ThemeSelector compact />
      </header>
      <main className={styles.main}>
        <section className={styles.context}>
          <p className={styles.eyebrow}>JetPesa account</p>
          <h1>One account for every round.</h1>
          <p>Access your demo wallet, betting controls, round history, and account preferences from any screen size.</p>
          <ul><li>Two independent betting decks</li><li>Clear wallet and round states</li><li>System-aware light and dark themes</li></ul>
        </section>
        <section className={styles.card} aria-labelledby="auth-title">
          <div className={styles.cardHeader}>
            <h2 id="auth-title">{activeTab === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p>{activeTab === 'login' ? 'Sign in to continue to the dashboard.' : 'Set up your details to enter the demo.'}</p>
            {isDemoMode && <span className={styles.demoLabel}>Demo mode · No real money</span>}
          </div>
          <div className={styles.tabs} role="tablist" aria-label="Authentication mode">
            <button type="button" role="tab" aria-selected={activeTab === 'login'} onClick={() => selectTab('login')}>Sign in</button>
            <button type="button" role="tab" aria-selected={activeTab === 'signup'} onClick={() => selectTab('signup')}>Create account</button>
          </div>
          {errorMsg && <div className={styles.error} role="alert">{errorMsg}</div>}
          <button className={styles.googleButton} type="button" disabled={loading} onClick={handleGoogleAuth}>
            <svg className={styles.googleIcon} aria-hidden="true" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M21.35 12.23c0-.77-.07-1.52-.22-2.23H12v4.22h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.38Z" />
              <path fill="#34A853" d="M12 21.99c2.63 0 4.84-.87 6.45-2.38l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.99Z" />
              <path fill="#FBBC05" d="M6.54 14.05a5.86 5.86 0 0 1 0-3.73V7.79H3.3a9.99 9.99 0 0 0 0 8.79l3.24-2.53Z" />
              <path fill="#EA4335" d="M12 6.29c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.83 3.35 14.63 2.01 12 2.01a9.74 9.74 0 0 0-8.7 5.78l3.24 2.53C7.31 8.01 9.46 6.29 12 6.29Z" />
            </svg>
            Continue with Google
          </button>
          <div className={styles.divider}><span>or continue with email</span></div>
          <form onSubmit={handleSubmit} className={styles.form}>
            {activeTab === 'login' ? (
              <label>Email or phone<input type="text" autoComplete="username" required disabled={loading} placeholder="Email or 07XXXXXXXX" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} /></label>
            ) : <>
              <label>Email address<input type="email" autoComplete="email" required disabled={loading} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label>M-Pesa phone<input type="tel" autoComplete="tel" required disabled={loading} placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
            </>}
            <label>Password<input type="password" autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'} required disabled={loading} placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button className={styles.submit} type="submit" disabled={loading}>{loading ? 'Please wait…' : activeTab === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>
          <Link href="/" className={styles.backLink}>Back to home</Link>
        </section>
      </main>
    </div>
  );
}

export default function AuthenticationPortal() {
  return <Suspense fallback={<div className={styles.loading}>Loading account…</div>}><AuthForm /></Suspense>;
}