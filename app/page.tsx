'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThemeSelector } from './ThemeProvider';
import styles from './page.module.css';

function BrandMark() {
  return <span className={styles.brandMark} aria-hidden="true">JP</span>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="m9 12 2 2 4-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}

function WalletIcon() {
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M15 10h5v4h-5a2 2 0 1 1 0-4Z" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>;
}

function DeviceIcon() {
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="7" y="2.8" width="10" height="18.4" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M10.5 18h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}

export default function JetPesaLandingPage() {
  const [multiplier, setMultiplier] = useState(1);
  const [phase, setPhase] = useState('Open for bets');

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) % 12000;
      if (elapsed < 3200) {
        setPhase('Open for bets');
        setMultiplier(1);
      } else if (elapsed < 10000) {
        setPhase('Round in progress');
        setMultiplier(Math.min(8.72, Math.exp((elapsed - 3200) / 4900)));
      } else {
        setPhase('Round ended');
        setMultiplier(3.98);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="JetPesa home"><BrandMark /><span>JetPesa</span></Link>
        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="#product">Product</a><a href="#how-it-works">How it works</a><a href="#safety">Safety</a>
        </nav>
        <div className={styles.headerActions}>
          <ThemeSelector compact />
          <Link href="/auth?tab=login" className={styles.textButton}>Sign in</Link>
          <Link href="/auth?tab=signup" className={styles.primaryButton}>Try demo</Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>A clear, responsive crash-game demo</p>
          <h1>Fast rounds.<br />Clear decisions.</h1>
          <p className={styles.lead}>A focused Aviator-style experience with two betting decks, transparent round history, wallet controls, and a layout designed for phones first.</p>
          <div className={styles.heroActions}>
            <Link href="/auth?tab=signup" className={styles.primaryButtonLarge}>Open the demo <ArrowIcon /></Link>
            <a href="#how-it-works" className={styles.secondaryButton}>See how it works</a>
          </div>
          <p className={styles.demoNote}>Demo environment · Simulated balance · No real-money transaction</p>
        </div>

        <div className={styles.productFrame} id="product" aria-label="JetPesa game preview">
          <div className={styles.previewTopbar}><div><span className={styles.statusDot} /><span>{phase}</span></div><span>Demo balance&nbsp; KES 1,000.00</span></div>
          <div className={styles.roundHistory}>{['1.43x','2.94x','2.00x','2.27x','1.00x','8.44x'].map((value, index) => <span key={value + index} className={index === 5 ? styles.historyHigh : ''}>{value}</span>)}</div>
          <div className={styles.gameArea}>
            <div className={styles.gameGrid} aria-hidden="true" />
            <div className={styles.flightLine} aria-hidden="true" />
            <div className={styles.multiplier}><strong>{multiplier.toFixed(2)}x</strong><span>{phase}</span></div>
          </div>
          <div className={styles.betDecks}>
            {[['Deck A','100'],['Deck B','200']].map(([name, stake]) => <div className={styles.betDeck} key={name}><div><span>{name}</span><strong>KES {stake}</strong></div><button type="button">Place bet</button></div>)}
          </div>
        </div>
      </section>

      <section className={styles.proofStrip} aria-label="Product qualities"><span>Mobile-first controls</span><span>Clear round states</span><span>Explicit demo boundaries</span><span>System-aware theme</span></section>

      <section className={styles.section} id="how-it-works">
        <div className={styles.sectionIntro}><p className={styles.eyebrow}>How it works</p><h2>Everything needed for a confident round.</h2><p>Core actions stay visible and predictable from stake selection through cash out.</p></div>
        <div className={styles.steps}>
          {[['01','Choose a stake','Use either deck and confirm the amount before placing a bet.'],['02','Watch the round','The multiplier rises while the flight remains active.'],['03','Cash out','Exit before the round ends to return stake multiplied by the displayed value.']].map(([num,title,copy]) => <article key={num}><span>{num}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>

      <section className={styles.section} id="safety">
        <div className={styles.sectionIntro}><p className={styles.eyebrow}>Designed with boundaries</p><h2>A demo that says exactly what it is.</h2></div>
        <div className={styles.features}>
          <article><ShieldIcon /><h3>Transparent demo mode</h3><p>Simulated funds and gameplay are identified throughout the experience.</p></article>
          <article><WalletIcon /><h3>Focused wallet actions</h3><p>Balance, deposit, withdrawal, and account actions use a consistent hierarchy.</p></article>
          <article><DeviceIcon /><h3>Built for every screen</h3><p>Responsive layouts, accessible controls, reduced motion, and system-aware themes.</p></article>
        </div>
      </section>

      <section className={styles.ctaPanel}><div><p className={styles.eyebrow}>Ready to review</p><h2>Explore the complete JetPesa demo.</h2><p>No payment credentials are required.</p></div><Link href="/auth?tab=signup" className={styles.primaryButtonLarge}>Launch demo <ArrowIcon /></Link></section>

      <footer className={styles.footer}><Link href="/" className={styles.brand}><BrandMark /><span>JetPesa</span></Link><p>Demo values are simulated. Play responsibly. 18+</p><ThemeSelector compact /></footer>
    </main>
  );
}