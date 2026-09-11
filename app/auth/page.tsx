'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isDemoMode } from '../../firebaseConfig';
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
      if (!auth || !db) throw new Error('Authentication is not configured for this environment.');
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