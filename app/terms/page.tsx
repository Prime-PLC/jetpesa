import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '../components/BrandLogo';
import styles from '../legal.module.css';

export const metadata: Metadata = { title: 'Terms & Conditions', description: 'The rules governing access to and use of JetPesa.' };
const operator = process.env.NEXT_PUBLIC_OPERATOR_LEGAL_NAME || 'JetPesa';
const licence = process.env.NEXT_PUBLIC_GAMBLING_LICENSE_NUMBER || 'Licence number to be published before launch';
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'Support contact to be published before launch';

export default function TermsPage() {
  return <main className={styles.page}>
    <header className={styles.header}><Link className={styles.brand} href="/" aria-label="JetPesa home"><BrandLogo priority /></Link><Link className={styles.back} href="/">Back to home</Link></header>
    <article className={styles.article}>
      <p className={styles.eyebrow}>Legal</p><h1>Terms &amp; Conditions</h1><p className={styles.updated}>Effective 29 September 2026</p>
      <p className={styles.notice}>Draft for legal review. Operator: {operator}. Gambling licence: {licence}. These details and the approved game rules must be completed before accepting real-money wagers.</p>
      <section className={styles.section}><h2>1. Eligibility</h2><p>You must be at least 18, legally capable, located in an allowed territory, registered in your own name, and successfully verified. One account is permitted per person. We may request identity, source-of-funds, or other compliance documents.</p></section>
      <section className={styles.section}><h2>2. Account security</h2><p>You are responsible for accurate information, secure credentials, and activity on your account. Notify us immediately of unauthorised use. Accounts may not be sold, transferred, shared, or used for another person.</p></section>
      <section className={styles.section}><h2>3. Game rules and fairness</h2><p>Each round uses published provably-fair verification. The configured return to player is 90% with a disclosed 10% mathematical house edge. A successful cash-out returns stake multiplied by the accepted multiplier, subject to a maximum total payout of KES 1,000 per round. A bet is lost if the round ends before cash-out is accepted by the server.</p></section>
      <section className={styles.section}><h2>4. Deposits and wallet</h2><p>Deposits are credited only after provider confirmation. Funds may be held while a transaction is investigated. Displayed balances remain subject to reconciliation against the authoritative transaction ledger.</p></section>
      <section className={styles.section}><h2>5. Withdrawals</h2><p>Withdrawals are manually reviewed and paid only to the verified account holder’s registered payment number. Requested funds are reserved immediately. A request may be approved, rejected and refunded, or held while identity, fraud, affordability, or regulatory checks are completed. Approval is not confirmation of payment; a request is complete only when marked paid.</p></section>
      <section className={styles.section}><h2>6. Prohibited activity</h2><p>Fraud, collusion, multiple accounts, identity misuse, chargeback abuse, automated exploitation, money laundering, interference with the service, and attempts to manipulate game or payment systems are prohibited.</p></section>
      <section className={styles.section}><h2>7. Responsible gambling</h2><p>Gambling involves financial risk and is not a way to solve financial problems. Set limits, take breaks, and do not chase losses. We may apply deposit, wager, session, cooling-off, or self-exclusion controls and may restrict an account where harm is suspected.</p></section>
      <section className={styles.section}><h2>8. Suspension, errors, and disputes</h2><p>We may suspend activity needed to protect users, investigate an error, comply with law, or preserve system integrity. Confirmed technical errors are resolved from authoritative server and payment records. Complaints should be sent to {supportEmail}; unresolved regulated matters may be referred to the appropriate Kenyan authority.</p></section>
      <section className={styles.section}><h2>9. Availability and liability</h2><p>We do not guarantee uninterrupted availability. Nothing excludes liability that cannot lawfully be excluded. Subject to law, we are not responsible for losses caused by unauthorised account access, unsupported devices, third-party outages, or use contrary to these terms.</p></section>
      <section className={styles.section}><h2>10. Changes and governing law</h2><p>Material changes will be published before taking effect where required. These terms are governed by Kenyan law and applicable licence conditions.</p></section>
    </article>
    <footer className={styles.footer}><span>© 2026 JetPesa</span><Link href="/terms">Terms & Conditions</Link><Link href="/privacy">Privacy Policy</Link></footer>
  </main>;
}