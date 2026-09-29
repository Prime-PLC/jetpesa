import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '../components/BrandLogo';
import styles from '../legal.module.css';

export const metadata: Metadata = { title: 'Privacy Policy', description: 'How JetPesa collects, uses, protects, and manages personal data.' };
const operator = process.env.NEXT_PUBLIC_OPERATOR_LEGAL_NAME || 'JetPesa';
const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_EMAIL || 'Privacy contact to be published before launch';

export default function PrivacyPolicyPage() {
  return <main className={styles.page}>
    <header className={styles.header}><Link className={styles.brand} href="/" aria-label="JetPesa home"><BrandLogo priority /></Link><Link className={styles.back} href="/">Back to home</Link></header>
    <article className={styles.article}>
      <p className={styles.eyebrow}>Legal</p><h1>Privacy Policy</h1><p className={styles.updated}>Effective 29 September 2026</p>
      <p className={styles.notice}>This policy must be reviewed against the operator’s final licence conditions, ODPC registration, vendors, retention schedule, and production hosting before launch.</p>
      <section className={styles.section}><h2>1. Who controls your data</h2><p>{operator} operates JetPesa and determines how personal data is used. Privacy enquiries may be sent to {privacyEmail}.</p></section>
      <section className={styles.section}><h2>2. Data we collect</h2><ul><li>Identity, age-verification, contact, and account information.</li><li>M-Pesa phone, deposit, withdrawal, wallet, wager, and transaction records.</li><li>Device, IP address, security, authentication, support, and usage records.</li><li>Responsible-gaming, fraud-review, compliance, and communication records.</li></ul></section>
      <section className={styles.section}><h2>3. Why we use it</h2><p>We use data to register and secure accounts, verify eligibility, operate games and wallets, process payments and manual withdrawals, prevent fraud, meet legal duties, resolve disputes, provide support, enforce limits, and improve service reliability.</p></section>
      <section className={styles.section}><h2>4. Legal grounds</h2><p>Processing may be necessary to perform our agreement with you, comply with gambling, tax, anti-money-laundering, and data-protection duties, protect legitimate security interests, or act with your consent where required.</p></section>
      <section className={styles.section}><h2>5. Sharing</h2><p>We may share necessary data with Firebase/Google Cloud, payment and mobile-money providers, identity-verification providers, professional advisers, regulators, law-enforcement bodies, and contracted service providers subject to appropriate safeguards.</p></section>
      <section className={styles.section}><h2>6. International transfers and retention</h2><p>Where data is processed outside Kenya, we apply legally required safeguards. Records are retained only for operational, dispute, tax, regulatory, fraud-prevention, and legal periods, then securely deleted or anonymised.</p></section>
      <section className={styles.section}><h2>7. Security</h2><p>We use access controls, encryption in transit, restricted administrative privileges, logging, monitoring, backups, and vendor controls. No online service can guarantee absolute security.</p></section>
      <section className={styles.section}><h2>8. Your rights</h2><p>You may request information about use of your data, access, correction, objection, or deletion where applicable. Some records must be retained to meet legal obligations. You may also complain to Kenya’s Office of the Data Protection Commissioner.</p></section>
      <section className={styles.section}><h2>9. Cookies and local storage</h2><p>JetPesa uses essential browser storage for authentication, security, theme preferences, and service continuity. Non-essential analytics or marketing storage will require the applicable notice or consent before activation.</p></section>
      <section className={styles.section}><h2>10. Children and changes</h2><p>JetPesa is strictly for adults aged 18 or older. We may update this policy and will publish material changes with a new effective date.</p></section>
    </article>
    <footer className={styles.footer}><span>© 2026 JetPesa</span><Link href="/terms">Terms & Conditions</Link><Link href="/privacy">Privacy Policy</Link></footer>
  </main>;
}