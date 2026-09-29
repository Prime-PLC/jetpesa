'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../firebaseConfig';
import styles from './admin.module.css';

type Withdrawal = { id: string; email?: string; phone?: string; amount: number; status: string; createdAt?: string | null };

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [message, setMessage] = useState('Sign in with an administrator account to review withdrawals.');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const currentUser = auth?.currentUser;
    if (!currentUser) return;
    setBusy('load');
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/withdrawals', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not load withdrawals.');
      setItems(data.withdrawals || []);
      setMessage(`${data.withdrawals?.length || 0} withdrawal requests loaded.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load withdrawals.'); }
    finally { setBusy(''); }
  }, []);

  useEffect(() => auth ? onAuthStateChanged(auth, () => { void load(); }) : undefined, [load]);

  const act = async (id: string, action: 'approve' | 'paid' | 'reject') => {
    const currentUser = auth?.currentUser;
    if (!currentUser) return;
    setBusy(id + action);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/withdrawals', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Update failed.');
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Update failed.'); setBusy(''); }
  };

  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><div><p>Operations</p><h1>Withdrawal review</h1><p>Approve verified requests, record completed manual M-Pesa payments, or reject and refund reserved funds.</p></div><Link className={styles.back} href="/dashboard">Back to dashboard</Link></header>
    <div className={styles.notice} role="status">{message} <button className={styles.refresh} disabled={busy === 'load'} onClick={() => void load()}>Refresh</button></div>
    <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Requested</th><th>Player</th><th>M-Pesa</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {items.length === 0 ? <tr><td colSpan={6}>No withdrawal requests available.</td></tr> : items.map((item) => <tr key={item.id}><td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Pending timestamp'}</td><td>{item.email || item.id}</td><td>{item.phone || '—'}</td><td>KES {Number(item.amount).toFixed(2)}</td><td><span className={styles.status}>{item.status}</span></td><td><div className={styles.actions}>{item.status === 'pending' && <button className={styles.approve} disabled={Boolean(busy)} onClick={() => void act(item.id, 'approve')}>Approve</button>}{item.status === 'approved' && <button className={styles.paid} disabled={Boolean(busy)} onClick={() => void act(item.id, 'paid')}>Mark paid</button>}{['pending','approved'].includes(item.status) && <button className={styles.reject} disabled={Boolean(busy)} onClick={() => void act(item.id, 'reject')}>Reject & refund</button>}</div></td></tr>) }
    </tbody></table></div>
  </div></main>;
}