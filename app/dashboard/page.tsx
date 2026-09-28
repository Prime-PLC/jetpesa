'use client';

import { useState, useEffect, useRef, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, isDemoMode } from '../../firebaseConfig';
import { ThemeSelector } from '../ThemeProvider';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import type { BetDeckState, BetHistoryItem, ChatMessage, GameStatus, LiveBet, MobilePanel, ProvablyFairRound, ToastType } from '../../types';
import { getErrorMessage } from '../../lib/errors';

interface DashboardUser { uid: string; email: string | null; displayName?: string | null; mpesaPhone?: string; }
interface ToastMessage { id: number; msg: string; type: ToastType; }
type BetDeckName = 'A' | 'B';

const MIN_WAGER = 10;
const HISTORY_STORAGE_KEY = 'jetpesa_real_previous_rounds';


export default function UltimateJetPesaCockpit() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/auth');
  }, [router]);

  const [user, setUser] = useState<DashboardUser | null>(null);
  const [balance, setBalance] = useState(0.0);
  const [phoneProfile, setPhoneProfile] = useState('');
  const [profileName, setProfileName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editName, setEditName] = useState('');
  const [rememberPhone, setRememberPhone] = useState(true);

  const [myBetsHistory, setMyBetsHistory] = useState<BetHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isProvablyModalOpen, setIsProvablyModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isRainActive, setIsRainActive] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [mobileActivePanel, setMobileActivePanel] = useState<MobilePanel>('game');

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [inputPhone, setInputPhone] = useState('');
  const [inputAmount, setInputAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);

  const [deckA, setDeckA] = useState<BetDeckState>({
    wager: MIN_WAGER,
    isAuto: false,
    isAutoCash: false,
    cashVal: 2.0,
    hasBetNext: false,
    hasBetCurrent: false,
  });

  const [deckB, setDeckB] = useState<BetDeckState>({
    wager: 20,
    isAuto: false,
    isAutoCash: false,
    cashVal: 3.0,
    hasBetNext: false,
    hasBetCurrent: false,
  });

  const [multiplier, setMultiplier] = useState(1.0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [countdownProgress, setCountdownProgress] = useState(100);
  const [historyTape, setHistoryTape] = useState<number[]>([]);

  const [activePlayersCount, setActivePlayersCount] = useState(3412);
  const [liveBetsFeed, setLiveBetsFeed] = useState<LiveBet[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([
    { user: '071***45', msg: 'Admin, background rain drop claim active? ', time: '08:02' },
    { user: '072***89', msg: 'Leo tunakula rocket safi sana hapa JetPesa! ', time: '08:04' },
    { user: '079***12', msg: 'Nĩngwenda gũkĩria 10x rũũgĩ rũfĩfĩ rwa Deck B gaka!', time: '08:04' },
    { user: '011***90', msg: 'Asego mar plane ni e ma duong’! Multiplier obiro thuth!', time: '08:05' },
  ]);

  const [provablyData, setProvablyData] = useState<ProvablyFairRound | null>(null);
  const [provablyLoading, setProvablyLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationId = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const planeImageRef = useRef<HTMLImageElement | null>(null);
  const balanceRef = useRef(balance);
  const deckARef = useRef(deckA);
  const deckBRef = useRef(deckB);
  const gameStatusRef = useRef(gameStatus);
  const audioMutedRef = useRef(audioMuted);
  const rainActiveRef = useRef(isRainActive);
  const userRef = useRef(user);
  const lastCycleRef = useRef<number | null>(null);
  const recordedCrashCycleRef = useRef<number | null>(null);
  const betNonceRef = useRef(1);

  const currentRoundRef = useRef<ProvablyFairRound>({
    nonce: 1,
    crashPoint: 2.0,
    serverSeedHash: '',
    roundHash: '',
    clientSeed: '',
    algorithm: '',
    verifyInput: '',
    serverSeed: '',
    houseEdge: 0.01,
  });

  balanceRef.current = balance;
  deckARef.current = deckA;
  deckBRef.current = deckB;
  gameStatusRef.current = gameStatus;
  audioMutedRef.current = audioMuted;
  rainActiveRef.current = isRainActive;
  userRef.current = user;

  useEffect(() => {
    const svgPlane = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 180">
        <defs>
          <linearGradient id="bodyRed" x1="0" x2="1">
            <stop offset="0%" stop-color="#ff6b6b"/>
            <stop offset="45%" stop-color="#e11d48"/>
            <stop offset="100%" stop-color="#7f1d1d"/>
          </linearGradient>
          <linearGradient id="glass" x1="0" x2="1">
            <stop offset="0%" stop-color="#dbeafe"/>
            <stop offset="100%" stop-color="#1e293b"/>
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000000" flood-opacity="0.45"/>
          </filter>
        </defs>
        <g filter="url(#shadow)" transform="rotate(-12 210 90)">
          <path d="M70 98 L12 60 L110 84 Z" fill="url(#bodyRed)" stroke="#111827" stroke-width="3"/>
          <path d="M150 104 L40 168 L290 116 Z" fill="url(#bodyRed)" stroke="#111827" stroke-width="4"/>
          <path d="M72 82 C145 44, 270 40, 360 74 C376 80, 376 96, 360 101 C260 130, 142 125, 72 100 C50 92, 50 88, 72 82 Z" fill="url(#bodyRed)" stroke="#111827" stroke-width="4"/>
          <path d="M112 95 C175 84, 255 84, 340 92" stroke="#ffffff" stroke-width="5" opacity="0.45" fill="none"/>
          <path d="M160 68 C190 48, 230 50, 252 72 C222 78, 192 80, 160 68 Z" fill="url(#glass)" stroke="#111827" stroke-width="2"/>
          <path d="M78 82 L48 28 C76 28, 98 50, 105 80 Z" fill="url(#bodyRed)" stroke="#111827" stroke-width="4"/>
          <ellipse cx="362" cy="88" rx="22" ry="15" fill="#1e293b" stroke="#000" stroke-width="3"/>
          <circle cx="382" cy="88" r="10" fill="#d1d5db" stroke="#111827" stroke-width="3"/>
          <circle cx="384" cy="88" r="4" fill="#ffffff" opacity="0.8"/>
        </g>
      </svg>
    `;

    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgPlane);
    planeImageRef.current = img;
  }, []);

  const triggerToast = (msg: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const playSynthesizedTone = (freq: number, type: OscillatorType, duration: number, volume = 0.03) => {
    if (audioMutedRef.current) return;

    try {
      if (!audioCtxRef.current) {
        const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextConstructor) return;
        audioCtxRef.current = new AudioContextConstructor();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.value = freq;
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.log(e);
    }
  };

  const makeRandomBet = (): LiveBet => {
    const px = ['070***', '071***', '072***', '079***', '011***', '074***', '010***'];
    const av = ['JP'];

    return {
      id: Date.now() + Math.random(),
      username:
        av[Math.floor(Math.random() * av.length)] +
        px[Math.floor(Math.random() * px.length)] +
        Math.floor(Math.random() * 89 + 10),
      bet: Math.floor(Math.random() * 4800 + 100),
      mult: parseFloat((Math.random() * 2.8 + 1.05).toFixed(2)),
      won: Math.random() > 0.58,
      status: 'queued',
    };
  };

  const startFreshLiveBetsFeed = () => {
    setLiveBetsFeed([]);
    setActivePlayersCount(Math.floor(Math.random() * 1500 + 3000));

    let count = 0;
    const interval = setInterval(() => {
      count += 1;

      setLiveBetsFeed((prev) => [makeRandomBet(), ...prev].slice(0, 28));

      if (count >= 25) clearInterval(interval);
    }, 120);
  };

  const updateLiveBetStatuses = (currentMultiplier: number) => {
    setLiveBetsFeed((prev) =>
      prev.map((b) => {
        if (b.status !== 'queued') return b;

        if (currentMultiplier >= b.mult && b.won) {
          return {
            ...b,
            status: 'cashed',
            payout: Math.floor(b.bet * b.mult),
          };
        }

        return {
          ...b,
          status: 'flying',
        };
      })
    );
  };

  const markLiveBetsCrashed = () => {
    setLiveBetsFeed((prev) =>
      prev.map((b) =>
        b.status === 'cashed'
          ? b
          : {
              ...b,
              status: 'lost',
            }
      )
    );
  };

  const sha256Hex = async (input: string) => {
    const bytes = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const hmacSha256Hex = async (key: string, message: string) => {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
    return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const deriveCrashPointFromHash = (hash: string, houseEdge = 0.01) => {
    const h = parseInt(hash.slice(0, 13), 16);
    const e = Math.pow(2, 52);

    if (h % 33 === 0) return 1.0;

    const raw = (100 * e - h) / (e - h);
    const edged = raw * (1 - houseEdge);
    return Math.max(1, Math.floor(edged) / 100);
  };

  const generateLocalProvablyRound = async (nonce: number): Promise<ProvablyFairRound> => {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);

    const serverSeed = [...randomBytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    const clientSeed = `${user?.uid || 'guest'}:${nonce}:jetpesa`;
    const verifyInput = `${clientSeed}:${nonce}`;
    const roundHash = await hmacSha256Hex(serverSeed, verifyInput);
    const serverSeedHash = await sha256Hex(serverSeed);
    const crashPoint = deriveCrashPointFromHash(roundHash, 0.01);

    return {
      nonce,
      crashPoint,
      serverSeedHash,
      serverSeed,
      roundHash,
      clientSeed,
      verifyInput,
      houseEdge: 0.01,
      algorithm: 'HMAC_SHA256(serverSeed, clientSeed:nonce), SHA256 serverSeed commitment',
    };
  };

  const persistCrashToHistory = (crashPoint: number, cycleIndex: number) => {
    if (recordedCrashCycleRef.current === cycleIndex) return;

    recordedCrashCycleRef.current = cycleIndex;
    const cleanCrash = Number(Number(crashPoint).toFixed(2));

    setHistoryTape((prev) => {
      const next = [cleanCrash, ...prev].slice(0, 14);

      if (typeof window !== 'undefined') {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      }

      return next;
    });
  };

  const fetchProvablyRound = async (nonce: number, openModal = false): Promise<ProvablyFairRound> => {
    try {
      if (openModal) setProvablyLoading(true);

      const res = await fetch(`/api/game/provably?nonce=${nonce}`, {
        cache: 'no-store',
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not load provably fair round.');
      }

      currentRoundRef.current = {
        nonce: data.nonce,
        crashPoint: Number(data.crashPoint || 1),
        serverSeedHash: data.serverSeedHash,
        roundHash: data.roundHash,
        clientSeed: data.clientSeed,
        algorithm: data.algorithm,
        verifyInput: data.verifyInput,
        serverSeed: data.serverSeed || '',
        houseEdge: Number(data.houseEdge ?? 0.01),
      };

      setProvablyData(currentRoundRef.current);

      if (openModal) {
        setIsProvablyModalOpen(true);
      }

      return currentRoundRef.current;
    } catch (e) {
      const fallbackRound = await generateLocalProvablyRound(nonce);

      currentRoundRef.current = fallbackRound;
      setProvablyData(fallbackRound);

      if (openModal) {
        setIsProvablyModalOpen(true);
      }

      triggerToast(`Server fair API unavailable. Using local cryptographic fallback.`, 'info');
      return fallbackRound;
    } finally {
      if (openModal) setProvablyLoading(false);
    }
  };

  const openProvablyModal = async () => {
    await fetchProvablyRound(currentRoundRef.current.nonce, true);
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) {
        setHistoryTape(saved.map(Number).filter(Boolean).slice(0, 14));
      }
    } catch {
      setHistoryTape([]);
    }

    const savedPhone = localStorage.getItem('jetpesa_saved_phone');

    if (savedPhone) {
      setInputPhone(savedPhone);
      setPhoneProfile(savedPhone);
      setEditPhone(savedPhone);
    }

    if (isDemoMode) {
      const demoUser = JSON.parse(localStorage.getItem('jetpesa_demo_user') || 'null');
      if (!demoUser) { router.push('/auth'); return undefined; }
      setUser(demoUser);
      setBalance(Number(localStorage.getItem('jetpesa_demo_balance') || 1000));
      setProfileName(demoUser.displayName || 'Demo Pilot');
      setEditName(demoUser.displayName || 'Demo Pilot');
      if (!savedPhone) {
        setPhoneProfile(demoUser.mpesaPhone); setInputPhone(demoUser.mpesaPhone); setEditPhone(demoUser.mpesaPhone);
      }
      fetchProvablyRound(1); startFreshLiveBetsFeed();
      return undefined;
    }

    if (!auth || !db) { router.replace('/auth'); return undefined; }

    const database = db;
    const unsubscribe = onAuthStateChanged(auth, async (curr) => {
      if (!curr) {
        router.replace('/auth');
        return;
      }

      setUser(curr);

      try {
        const userDoc = await getDoc(doc(database, 'users', curr.uid));

        if (userDoc.exists()) {
          const d = userDoc.data();

          setBalance(d.walletBalance || 0.0);
          setProfileName(d.displayName || curr.displayName || '');
          setEditName(d.displayName || curr.displayName || '');

          if (!savedPhone && d.mpesaPhone) {
            setPhoneProfile(d.mpesaPhone);
            setInputPhone(d.mpesaPhone);
            setEditPhone(d.mpesaPhone);
          }
        }
      } catch (firestoreError) {
        console.warn('Signed in, but the Firebase profile is temporarily unavailable.', firestoreError);
        setProfileName(curr.displayName || '');
        setEditName(curr.displayName || '');
      }
    });

    fetchProvablyRound(1);
    startFreshLiveBetsFeed();

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);

  useEffect(() => {
    const chatPool = [
      { user: '072***14', msg: 'Weh, plane irefuka maze, cash out haraka!' },
      { user: '079***88', msg: 'Mũgĩthĩ ũũ no rũgendo rũranya gũgĩkũra na igũrũ.' },
      { user: '011***23', msg: 'Anya tero mwandu nyaka polo! Retain control omera.' },
      { user: '070***66', msg: 'Free bets admin please.....' },
      { user: '072***99', msg: '50k innit! hii ni ingine mwechecheeee' },
      { user: '010***45', msg: 'Wakuu mmenikula ata school fees, watu wanichangie please' },
      { user: '075***04', msg: 'Nimeweka 500 stake hapa, twende sasa kabla iland.' },
    ];

    const intervalChat = setInterval(() => {
      const picked = chatPool[Math.floor(Math.random() * chatPool.length)];

      setChatLogs((p) => [
        ...p,
        {
          ...picked,
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    }, 8000);

    return () => clearInterval(intervalChat);
  }, []);

  useEffect(() => {
    function runDistributedClockLoop() {
      const epochTimeMs = Date.now();
      const cycleInterval = 21000;
      const countdownInterval = 5000;
      const simulationWindow = 14000;
      const cycleIndex = Math.floor(epochTimeMs / cycleInterval);
      const offsetMs = epochTimeMs % cycleInterval;

      if (lastCycleRef.current !== cycleIndex) {
        lastCycleRef.current = cycleIndex;
        const nextNonce = cycleIndex + 1;
        let nextBalance = balanceRef.current;
        let activatedQueuedBet = false;

        const currentDeckA = deckARef.current;
        const currentDeckB = deckBRef.current;

        if (currentDeckA.hasBetNext && !currentDeckA.hasBetCurrent && nextBalance >= Number(currentDeckA.wager)) {
          nextBalance -= Number(currentDeckA.wager);
          activatedQueuedBet = true;
          setDeckA((prev) => ({ ...prev, hasBetCurrent: true, hasBetNext: prev.isAuto }));
        }

        if (currentDeckB.hasBetNext && !currentDeckB.hasBetCurrent && nextBalance >= Number(currentDeckB.wager)) {
          nextBalance -= Number(currentDeckB.wager);
          activatedQueuedBet = true;
          setDeckB((prev) => ({ ...prev, hasBetCurrent: true, hasBetNext: prev.isAuto }));
        }

        if (activatedQueuedBet) {
          setBalance(nextBalance);
          commitWalletBalance(nextBalance);
        }

        startFreshLiveBetsFeed();
        fetchProvablyRound(nextNonce);
      }

      const crashPoint = currentRoundRef.current.crashPoint || 2;

      if (offsetMs < countdownInterval) {
        if (gameStatusRef.current !== 'idle') {
          setGameStatus('idle');
          setMultiplier(1.0);
          playSynthesizedTone(440, 'triangle', 0.05, 0.03);
        }

        setCountdownProgress(((countdownInterval - offsetMs) / countdownInterval) * 100);

        if (offsetMs % 1000 < 20) {
          playSynthesizedTone(320, 'sine', 0.03, 0.02);
        }

      } else if (offsetMs < countdownInterval + simulationWindow) {
        setGameStatus('running');

        const activeSeconds = (offsetMs - countdownInterval) / 1000;
        const computedMultiplier = parseFloat(Math.pow(Math.E, 0.078 * activeSeconds).toFixed(2));

        if (computedMultiplier >= crashPoint) {
          setGameStatus('crashed');
          setMultiplier(crashPoint);
          markLiveBetsCrashed();
          persistCrashToHistory(crashPoint, cycleIndex);
          setDeckA((p) => ({ ...p, hasBetCurrent: false }));
          setDeckB((p) => ({ ...p, hasBetCurrent: false }));
        } else {
          setMultiplier(computedMultiplier);
          updateLiveBetStatuses(computedMultiplier);

          if (offsetMs % 300 < 20) {
            playSynthesizedTone(200 + computedMultiplier * 15, 'sine', 0.015, 0.012);
          }

          setDeckA((p) => {
            if (p.hasBetCurrent && p.isAutoCash && computedMultiplier >= Number(p.cashVal)) {
              triggerPayoutSequence('A', computedMultiplier, p);
              return { ...p, hasBetCurrent: false };
            }
            return p;
          });

          setDeckB((p) => {
            if (p.hasBetCurrent && p.isAutoCash && computedMultiplier >= Number(p.cashVal)) {
              triggerPayoutSequence('B', computedMultiplier, p);
              return { ...p, hasBetCurrent: false };
            }
            return p;
          });
        }
      } else {
        setGameStatus('crashed');
        setMultiplier(crashPoint);
        markLiveBetsCrashed();
        persistCrashToHistory(crashPoint, cycleIndex);
        setDeckA((p) => ({ ...p, hasBetCurrent: false }));
        setDeckB((p) => ({ ...p, hasBetCurrent: false }));
      }

      renderRadarCanvas(offsetMs, countdownInterval);
      animationId.current = requestAnimationFrame(runDistributedClockLoop);
    }

    animationId.current = requestAnimationFrame(runDistributedClockLoop);
    return () => { if (animationId.current !== null) cancelAnimationFrame(animationId.current); };
  }, []);

  const drawRain = (ctx: CanvasRenderingContext2D, W: number, H: number, secondsInAir: number) => {
    if (!rainActiveRef.current) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.34)';
    ctx.lineWidth = W < 520 ? 1 : 1.4;
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(56,189,248,0.45)';

    const drops = W < 520 ? 48 : 85;

    for (let i = 0; i < drops; i++) {
      const x = ((i * 71 + secondsInAir * 360) % (W + 120)) - 80;
      const y = ((i * 47 + secondsInAir * 620) % (H + 140)) - 80;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 9, y + 24);
      ctx.stroke();
    }

    ctx.restore();
  };

  const renderRadarCanvas = (offsetMs: number, countdownLimit: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 1;

    for (let i = 0; i < W; i += W < 520 ? 40 : 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, H);
      ctx.stroke();
    }

    for (let j = 0; j < H; j += W < 520 ? 34 : 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(W, j);
      ctx.stroke();
    }

    if (offsetMs >= countdownLimit && gameStatusRef.current === 'running') {
      const secondsInAir = (offsetMs - countdownLimit) / 1000;

      drawRain(ctx, W, H, secondsInAir);

      const flightProgress = Math.min(secondsInAir / 11, 1);
      const smoothProgress = 1 - Math.pow(1 - flightProgress, 2.4);
      const multiplierLift = Math.min((multiplier - 1) / 2.8, 1);
      const liftFactor = Math.max(smoothProgress * 0.9, multiplierLift);

      const startX = W < 520 ? 42 : 50;
      const baseY = H - (W < 520 ? 54 : 48);
      const maxLift = H - (W < 520 ? 135 : 118);

      const cx = startX + (W - (W < 520 ? 120 : 135)) * Math.min(Math.pow(flightProgress, 0.82), 1);
      const cy = baseY - maxLift * Math.min(liftFactor, 1);

      const controlX = startX + (cx - startX) * 0.48;
      const controlY = baseY - maxLift * Math.min(liftFactor * 0.42, 0.62);

      ctx.beginPath();
      ctx.moveTo(startX, baseY);
      ctx.quadraticCurveTo(controlX, controlY, cx, cy);

      ctx.strokeStyle = 'rgba(225,29,72,0.98)';
      ctx.lineWidth = W < 520 ? 5 : 6;
      ctx.shadowBlur = 28;
      ctx.shadowColor = '#e11d48';
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.lineTo(cx, baseY);
      ctx.lineTo(startX, baseY);
      ctx.closePath();

      const underGradient = ctx.createLinearGradient(startX, cy, startX, baseY);
      underGradient.addColorStop(0, 'rgba(225,29,72,0.26)');
      underGradient.addColorStop(0.45, 'rgba(225,29,72,0.1)');
      underGradient.addColorStop(1, 'transparent');

      ctx.fillStyle = underGradient;
      ctx.fill();

      const planeAngle =
        -0.32 +
        Math.min(liftFactor * 0.38, 0.26) +
        Math.sin(secondsInAir * 5) * 0.018;

      const planeW = W < 520 ? 156 : 136;
      const planeH = W < 520 ? 74 : 64;

      ctx.save();
      ctx.translate(cx + 8, cy + 13);
      ctx.rotate(planeAngle);
      ctx.globalAlpha = 0.24;
      ctx.filter = 'blur(11px)';

      if (planeImageRef.current) {
        ctx.drawImage(planeImageRef.current, -planeW / 2, -planeH / 2, planeW, planeH);
      }

      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(planeAngle);
      ctx.shadowBlur = 24;
      ctx.shadowColor = 'rgba(255,255,255,0.32)';

      if (planeImageRef.current) {
        ctx.drawImage(planeImageRef.current, -planeW / 2, -planeH / 2, planeW, planeH);
      }

      ctx.restore();

      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(
          cx - 36 - i * 11,
          cy + Math.sin(secondsInAir * 9 + i) * 4,
          2.2 + i * 0.35,
          0,
          Math.PI * 2
        );

        ctx.fillStyle =
          i % 2 === 0
            ? 'rgba(255,255,255,0.48)'
            : 'rgba(239,68,68,0.42)';

        ctx.fill();
      }
    }
  };

  const commitWalletBalance = async (balTarget: number) => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    if (isDemoMode) { localStorage.setItem('jetpesa_demo_balance', balTarget.toFixed(2)); return; }

    if (!db) throw new Error('Wallet storage is not configured.');
    await updateDoc(doc(db, 'users', currentUser.uid), {
      walletBalance: parseFloat(balTarget.toFixed(2)),
    });
  };

  const handleSignOut = async () => {
    try {
      if (isDemoMode) {
        localStorage.removeItem('jetpesa_demo_user');
      } else if (auth) {
        await signOut(auth);
      }
      setIsProfileModalOpen(false);
      router.replace('/auth');
      router.refresh();
    } catch (error) {
      triggerToast(`Sign out failed: ${getErrorMessage(error)}`, 'error');
    }
  };

  const handleResetDemo = () => {
    if (!isDemoMode) return;
    localStorage.setItem('jetpesa_demo_balance', '1000');
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    setBalance(1000);
    setHistoryTape([]);
    setMyBetsHistory([]);
    setDeckA((prev) => ({ ...prev, hasBetCurrent: false, hasBetNext: false }));
    setDeckB((prev) => ({ ...prev, hasBetCurrent: false, hasBetNext: false }));
    triggerToast('Demo balance and local bet history reset.', 'success');
  };
  const handleProfileUpdate = async () => {
    if (!user) return;

    const cleanPhone = editPhone.trim();

    if ((!cleanPhone.startsWith('07') && !cleanPhone.startsWith('01')) || cleanPhone.length !== 10) {
      triggerToast('Enter a valid M-Pesa phone number.', 'error');
      return;
    }

    if (isDemoMode) {
      const nextDemoUser = { ...user, displayName: editName.trim(), mpesaPhone: cleanPhone };
      localStorage.setItem('jetpesa_demo_user', JSON.stringify(nextDemoUser));
      setUser(nextDemoUser);
    } else {
      if (!db) throw new Error('Profile storage is not configured.');
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editName.trim(),
        mpesaPhone: cleanPhone,
      });
    }

    setProfileName(editName.trim());
    setPhoneProfile(cleanPhone);
    setInputPhone(cleanPhone);
    localStorage.setItem('jetpesa_saved_phone', cleanPhone);

    setIsProfileModalOpen(false);
    triggerToast('Profile updated successfully.', 'success');
  };

  const handleWithdrawExecution = async () => {
    const amt = parseInt(withdrawAmount);

    if (isNaN(amt) || amt < 50) {
      triggerToast('Minimum withdrawal is KES 50.', 'error');
      return;
    }

    if (amt > balance) {
      triggerToast('Withdrawal exceeds wallet balance.', 'error');
      return;
    }

    setLoadingWithdraw(true);

    try {
      const nextBal = balance - amt;

      setBalance(nextBal);
      await commitWalletBalance(nextBal);

      setWithdrawAmount('');
      setIsWithdrawModalOpen(false);

      triggerToast(`Withdrawal request submitted: KES ${amt}`, 'success');
    } catch (e) {
      triggerToast('Withdrawal failed: ' + getErrorMessage(e), 'error');
    } finally {
      setLoadingWithdraw(false);
    }
  };

  const triggerPayoutSequence = (deckName: BetDeckName, multVal: number, activeState: BetDeckState) => {
    const rawWin = activeState.wager * multVal;
    const resolvedBalance = balance + rawWin;

    setBalance(resolvedBalance);
    commitWalletBalance(resolvedBalance);

    setMyBetsHistory((p) => [
      {
        roundId: Date.now().toString().slice(-5),
        stake: activeState.wager,
        multiplier: multVal,
        yieldAmount: rawWin,
        status: 'WON',
      },
      ...p,
    ]);

    playSynthesizedTone(523.25, 'sine', 0.15, 0.05);
    setTimeout(() => playSynthesizedTone(659.25, 'sine', 0.15, 0.05), 100);
    setTimeout(() => playSynthesizedTone(783.99, 'sine', 0.3, 0.06), 200);

    confetti({ particleCount: 90, spread: 65, origin: { y: 0.35 } });
    triggerToast(`Deck ${deckName} Auto Cashout hit @ ${multVal}x! Received KES ${rawWin.toFixed(2)}`, 'success');
  };

  const placeWagerIntent = (targetDeck: BetDeckName) => {
    if (balance <= 0) {
      triggerToast('Wallet reads KES 0.00. Please deposit first.', 'error');
      return;
    }

    const isA = targetDeck === 'A';
    const currentWagerAmount = Math.max(MIN_WAGER, Number(isA ? deckA.wager : deckB.wager) || MIN_WAGER);
    const userBetNonce = betNonceRef.current++;
    if (currentWagerAmount < MIN_WAGER) {
    triggerToast('Minimum wager is KES 10.', 'error');
    return;
      }

    const otherQueuedStake = isA
      ? (deckB.hasBetNext ? Number(deckB.wager) : 0)
      : (deckA.hasBetNext ? Number(deckA.wager) : 0);

    if (balance < currentWagerAmount + (gameStatus === 'running' ? otherQueuedStake : 0)) {
      triggerToast('Selected stake exceeds your available balance.', 'error');
      return;
    }

    if (gameStatus === 'running') {
      if (isA) setDeckA((p) => ({ ...p, hasBetNext: !p.hasBetNext }));
      else setDeckB((p) => ({ ...p, hasBetNext: !p.hasBetNext }));

      triggerToast(`Deck ${targetDeck} round queue updated.`, 'info');
    } else {
      if (isA) setDeckA((p) => ({ ...p, hasBetCurrent: true }));
      else setDeckB((p) => ({ ...p, hasBetCurrent: true }));

      setBalance((b) => b - currentWagerAmount);
    }
  };

  const handleManualPayoutExecution = (targetDeck: BetDeckName) => {
    const isA = targetDeck === 'A';
    const targetState = isA ? deckA : deckB;

    if (!targetState.hasBetCurrent) return;

    const preciseWin = targetState.wager * multiplier;
    const updatedWallet = balance + preciseWin;

    setBalance(updatedWallet);
    commitWalletBalance(updatedWallet);

    setMyBetsHistory((p) => [
      {
        roundId: Date.now().toString().slice(-5),
        stake: targetState.wager,
        multiplier,
        yieldAmount: preciseWin,
        status: 'WON',
      },
      ...p,
    ]);

    if (isA) setDeckA((p) => ({ ...p, hasBetCurrent: false }));
    else setDeckB((p) => ({ ...p, hasBetCurrent: false }));

    playSynthesizedTone(587.33, 'sine', 0.12, 0.05);
    setTimeout(() => playSynthesizedTone(880.0, 'sine', 0.25, 0.05), 110);

    confetti({ particleCount: 60, spread: 50, origin: { y: 0.4 } });
    triggerToast(`Manual Cashout Approved! + KES ${preciseWin.toFixed(2)}`, 'success');
  };

  const broadcastChatMessage = () => {
    if (!chatInput.trim()) return;

    if (balance <= 1000) {
      triggerToast('Only users with wallet above KES 1,000 can send messages.', 'error');
      return;
    }

    setChatLogs((p) => [
      ...p,
      {
        user: '070***01',
        msg: chatInput,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);

    setChatInput('');
    playSynthesizedTone(800, 'sine', 0.03, 0.01);
  };

  const handlePaymentInitiation = async () => {
    const amt = parseInt(inputAmount, 10);
    const cleanPhone = inputPhone.trim().replace(/\s+/g, '');

    if (isNaN(amt) || amt < 49) {
      triggerToast('Minimum deposit is KES 49.', 'error');
      return;
    }

    if ((!cleanPhone.startsWith('07') && !cleanPhone.startsWith('01')) || cleanPhone.length !== 10) {
      triggerToast('Enter a valid M-Pesa phone number.', 'error');
      return;
    }

    if (!user?.uid) {
      triggerToast('Login session expired. Please sign in again.', 'error');
      return;
    }

    setLoadingDeposit(true);

    try {
      if (isDemoMode) {
        const nextBalance = balance + amt; setBalance(nextBalance); await commitWalletBalance(nextBalance);
        if (rememberPhone) localStorage.setItem('jetpesa_saved_phone', cleanPhone);
        setIsDepositModalOpen(false);
        triggerToast(`Demo funds added: KES ${amt}. No payment was made.`, 'success');
        return;
      }
      const res = await fetch('/api/payhero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, phone: cleanPhone, username: user.uid }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Payment initiation failed.');
      }

      if (rememberPhone) {
        localStorage.setItem('jetpesa_saved_phone', cleanPhone);
      }

      triggerToast(data.message || 'STK push sent. Complete payment on your phone.', 'info');

      let attempts = 0;
      const maxAttempts = 36;

      const poll = setInterval(async () => {
        attempts += 1;

        try {
          const statusRes = await fetch(`/api/payhero-status?reference=${data.reference}`);
          const statusData = await statusRes.json();

          if (statusData.status === 'completed') {
            clearInterval(poll);

            if (!db) throw new Error('Wallet storage is not configured.');
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const freshBalance = userDoc.exists()
              ? Number(userDoc.data().walletBalance || 0)
              : balance;

            setBalance(freshBalance);
            setIsDepositModalOpen(false);
            setLoadingDeposit(false);

            triggerToast(`Deposit confirmed. KES ${amt} added.`, 'success');
          }

          if (statusData.status === 'failed') {
            clearInterval(poll);
            setLoadingDeposit(false);

            triggerToast(`${statusData.failureReason || 'Payment failed or was cancelled.'}`, 'error');
          }

          if (attempts >= maxAttempts) {
            clearInterval(poll);
            setLoadingDeposit(false);

            triggerToast('Payment is still pending. Wallet will update after confirmation.', 'info');
          }
        } catch (e) {
          if (attempts >= maxAttempts) {
            clearInterval(poll);
            setLoadingDeposit(false);
            triggerToast(getErrorMessage(e), 'error');
          }
        }
      }, 5000);
    } catch (e) {
      setLoadingDeposit(false);
      triggerToast(getErrorMessage(e), 'error');
    }
  };

  const renderLiveBets = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px', minHeight: 0 }}>
      <div style={liveTableHead}>
        <span>Pilot</span>
        <span>Stake</span>
        <span>Status</span>
      </div>

      {liveBetsFeed.length === 0 ? (
        <div style={emptyTableState}>
          <div style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '900', letterSpacing: '0.08em' }}>NO BETS</div>
          <strong>Preparing new round</strong>
          <span>New wagers are entering...</span>
        </div>
      ) : (
        liveBetsFeed.map((b) => (
          <div key={b.id} style={liveRow}>
            <div style={{ minWidth: 0 }}>
              <span style={liveUser}>{b.username}</span>
              <span style={liveSub}>Round #{currentRoundRef.current.nonce}</span>
            </div>

            <span style={liveStake}>{b.bet} KES</span>

            {b.status === 'cashed' ? (
              <span style={winBadge}>{b.mult.toFixed(2)}x</span>
            ) : b.status === 'lost' ? (
              <span style={lostBadge}>Lost</span>
            ) : b.status === 'flying' ? (
              <span style={flyingBadge}>Flying</span>
            ) : (
              <span style={queueBadge}>Queued</span>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderDeckPanel = (name: BetDeckName, deck: BetDeckState, setter: Dispatch<SetStateAction<BetDeckState>>, color: string) => (
    <div key={name} className="deckPanel" style={deckPanelStyle}>
      <div style={spribeToggleRow}>
        <button
          onClick={() => setter((p) => ({ ...p, isAuto: false }))}
          style={{
            ...spribeTab,
            background: !deck.isAuto ? '#2a2d37' : 'transparent',
            color: !deck.isAuto ? '#fff' : '#64748b',
          }}
        >
          Bet
        </button>

        <button
          onClick={() => setter((p) => ({ ...p, isAuto: true }))}
          style={{
            ...spribeTab,
            background: deck.isAuto ? '#2a2d37' : 'transparent',
            color: deck.isAuto ? '#fff' : '#64748b',
          }}
        >
          Auto
        </button>
      </div>

      <div style={wagerControlsRow}>
        <button onClick={() => setter((p) => ({ ...p, wager: Math.max(MIN_WAGER, p.wager - MIN_WAGER) }))} style={roundMiniButton}>−</button>

        <input
          type="number"
          min={MIN_WAGER}
          step={MIN_WAGER}
          value={deck.wager}
          onChange={(e) =>   setter((p) => ({     ...p,     wager: Math.max(MIN_WAGER, parseInt(e.target.value, 10) || MIN_WAGER),   })) }
          style={wagerInput}
        />

        <button onClick={() => setter((p) => ({ ...p, wager: p.wager + MIN_WAGER }))} style={roundMiniButton}>+</button>
      </div>

      <div style={quickStakeRow}>
        {[10, 50, 100, 500].map((v) => (
          <button key={v} onClick={() => setter((p) => ({ ...p, wager: v }))} style={quickStakeButton}>
            {v}
          </button>
        ))}
      </div>

      <div style={autoCashRow}>
        <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '900' }}>Auto Cash Out</span>

        <button
          onClick={() => setter((p) => ({ ...p, isAutoCash: !p.isAutoCash }))}
          style={{
            ...switchTrack,
            background: deck.isAutoCash ? '#22c55e' : '#1f2937',
          }}
        >
          <span
            style={{
              ...switchKnob,
              transform: deck.isAutoCash ? 'translateX(18px)' : 'translateX(0)',
            }}
          />
        </button>
      </div>

      <input
        type="number"
        step="0.1"
        disabled={!deck.isAutoCash}
        value={deck.cashVal}
        onChange={(e) => setter((p) => ({ ...p, cashVal: e.target.value }))}
        style={{
          ...autoCashInput,
          opacity: deck.isAutoCash ? 1 : 0.4,
        }}
      />

      {deck.hasBetCurrent ? (
        <button onClick={() => handleManualPayoutExecution(name)} className="cashOutButton" style={cashOutButton}>
          CASH OUT
          <br />
          <span style={{ fontSize: '16px' }}>{(deck.wager * multiplier).toFixed(2)} KES</span>
        </button>
      ) : (
        <button
          onClick={() => placeWagerIntent(name)}
          className="betActionButton"
          style={{
            ...betButton,
            background: deck.hasBetNext ? '#475569' : color,
          }}
        >
          {deck.hasBetNext ? (
            <>
              CANCEL
              <br />
              <span style={{ fontSize: '12px' }}>Queued</span>
            </>
          ) : (
            <>
              BET
              <br />
              <span style={{ fontSize: '16px' }}>{deck.wager} KES</span>
            </>
          )}
        </button>
      )}
      {deck.hasBetCurrent && deck.hasBetNext && (
        <button
          type="button"
          onClick={() => {
            setter((prev) => ({ ...prev, hasBetNext: false }));
            triggerToast(`Deck ${name} next bet cancelled.`, 'info');
          }}
          aria-label={`Cancel Deck ${name} bet queued for the next round`}
          style={{ ...betButton, minHeight: '44px', marginTop: '8px', background: '#475569' }}
        >
          CANCEL NEXT BET
        </button>
      )}
    </div>
  );

  return (
    <div className="dashboardShell" style={{ background: '#07080e', color: '#f1f5f9', minHeight: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {isDemoMode && <div role="status" className="demoBanner">DEMO MODE · Simulated funds and gameplay · No real money</div>}
      <div style={{ position: 'fixed', top: '85px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '8px', width: '90%', maxWidth: '440px' }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ background: t.type === 'error' ? 'rgba(220,38,38,0.95)' : t.type === 'success' ? 'rgba(22,163,74,0.95)' : 'rgba(30,27,75,0.95)', color: '#fff', padding: '12px 24px', borderRadius: '30px', boxShadow: '0 16px 32px rgba(0,0,0,0.6)', fontWeight: '800', fontSize: '13px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
            {t.msg}
          </div>
        ))}
      </div>

      <header className="dashboardHeader" style={{ background: 'rgba(12,14,24,0.75)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', flexShrink: 0, zIndex: 99 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-1px', color: '#f8fafc' }}>JETPESA</span>

          <button style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', cursor: 'pointer' }} onClick={openProvablyModal}>
            FAIR #{currentRoundRef.current.nonce}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeSelector compact />

          <button onClick={() => setAudioMuted(!audioMuted)} style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer' }}>
            {audioMuted ? 'SOUND OFF' : 'SOUND ON'}
          </button>

          <button onClick={() => setIsRainActive(!isRainActive)} style={{ background: isRainActive ? '#38bdf8' : 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '7px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>
            RAIN
          </button>

          <button onClick={() => setIsHelpModalOpen(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', color: '#cbd5e1', padding: '8px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
            HOW TO PLAY
          </button>

          <button onClick={() => setIsProfileModalOpen(true)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}>
            {profileName || 'PROFILE'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 3px 3px 12px', borderRadius: '30px', gap: '8px' }}>
            <button onClick={() => balance > 0 ? setIsWithdrawModalOpen(true) : triggerToast('Wallet is empty. Deposit first.', 'info')} style={{ background: 'transparent', border: 'none', color: '#22c55e', fontWeight: '900', fontSize: '14px', cursor: balance > 0 ? 'pointer' : 'default' }}>
              {balance.toFixed(2)} KES
            </button>

            <button onClick={() => setIsDepositModalOpen(true)} style={{ background: '#15803d', border: 'none', color: '#fff', fontWeight: '900', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}>
              DEPOSIT
            </button>
          </div>
        </div>
      </header>

      <div className="historyTape3D" style={{ display: 'flex', gap: '9px', background: '#0b0f18', padding: '10px 20px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, perspective: '700px' }}>
        {historyTape.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '900', padding: '5px 2px' }}>Previous rounds will appear after the first completed flight.</div>
        ) : (
          historyTape.map((h, i) => (
            <div key={`${h}-${i}`} style={{ ...historyChip3D, ...(h >= 10 ? historyChipUltra : h >= 2 ? historyChipHigh : historyChipLow), transform: `rotateX(14deg) translateZ(${Math.max(0, 12 - i)}px)` }}>
              {Number(h).toFixed(2)}x
            </div>
          ))
        )}
      </div>

      <div className="cockpitMainLayout" style={{ flex: 1, display: 'grid', padding: '16px', gap: '16px', boxSizing: 'border-box', minHeight: 0, height: 'calc(100% - 130px)' }}>
        <div className="leftPanelLayout" style={{ background: 'rgba(18,20,32,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', flexShrink: 0 }}>
            <button onClick={() => setActiveTab('all')} style={{ flex: 1, padding: '12px', background: activeTab === 'all' ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', color: '#fff', fontSize: '11px', fontWeight: '800', borderRadius: '8px', cursor: 'pointer' }}>
              LIVE ({activePlayersCount})
            </button>

            <button onClick={() => setActiveTab('mine')} style={{ flex: 1, padding: '12px', background: activeTab === 'mine' ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', color: '#fff', fontSize: '11px', fontWeight: '800', borderRadius: '8px', cursor: 'pointer' }}>
              MY BETS
            </button>
          </div>

          {activeTab === 'all' ? (
            renderLiveBets()
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', minHeight: 0 }}>
              {myBetsHistory.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#475569', fontSize: '12px', marginTop: '40px', fontWeight: '600' }}>No local round wagers recorded.</div>
              ) : (
                myBetsHistory.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', marginBottom: '6px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>ROUND #{m.roundId}</span>
                      <span style={{ fontWeight: '800' }}>{m.stake} KES</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#22c55e', fontWeight: '900', display: 'block' }}>{m.multiplier.toFixed(2)}x</span>
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>+{m.yieldAmount.toFixed(1)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="centerPanelLayout" style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', minHeight: 0 }}>
          <div style={{ flex: 1, background: '#020306', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden', minHeight: 0, boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9)' }}>
            {gameStatus === 'idle' && (
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(4,5,9,0.94)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <div style={{ width: '70%', maxWidth: '300px', background: 'rgba(255,255,255,0.03)', padding: '5px', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div style={{ height: '8px', background: '#22c55e', borderRadius: '8px', width: `${countdownProgress}%` }} />
                </div>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: '900', marginTop: '14px', letterSpacing: '1px' }}>WAITING FOR NEXT FLIGHT ROUND...</span>
                <span style={{ color: '#475569', fontSize: '11px', fontWeight: '700', marginTop: '4px' }}>New wagers loading...</span>
              </div>
            )}

            <canvas ref={canvasRef} width={900} height={460} style={{ width: '100%', height: '100%', display: 'block' }} />

            {gameStatus !== 'idle' && (
              <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                {gameStatus === 'crashed' ? (
                  <div>
                    <h1 style={{ color: '#e11d48', fontSize: '3.6rem', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>FLEW AWAY</h1>
                    <span style={{ color: '#475569', fontSize: '14px', fontWeight: '800' }}>Ended @ {multiplier.toFixed(2)}x</span>
                  </div>
                ) : (
                  <h1 style={{ fontSize: '5.8rem', fontWeight: '900', color: '#fff', margin: 0, letterSpacing: '-2px', textShadow: '0 0 30px rgba(255,255,255,0.2)' }}>{multiplier.toFixed(2)}x</h1>
                )}
              </div>
            )}
          </div>

          <div className="betControlsGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(18,20,32,0.8)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px', borderRadius: '20px', flexShrink: 0 }}>
            {renderDeckPanel('A', deckA, setDeckA, '#22c55e')}
            {renderDeckPanel('B', deckB, setDeckB, '#16a34a')}
          </div>
        </div>

        <div className="rightPanelLayout" style={{ background: '#0b141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', boxShadow: '0 12px 24px rgba(0,0,0,0.4)' }}>
          <div style={{ background: '#202c33', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00a884' }} />
            <span style={{ fontWeight: '800', fontSize: '14px', color: '#e9edef' }}>Lobby Lounge Chat Room</span>
          </div>

          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: '#0b141a', minHeight: 0 }}>
            {chatLogs.map((c, i) => {
              const isMe = c.user === '070***01';

              return (
                <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', background: isMe ? '#005c4b' : '#202c33', padding: '8px 12px', borderRadius: '10px', position: 'relative', boxShadow: '0 1px 2px rgba(0,0,0,0.3)', flexShrink: 0 }}>
                  {!isMe && <span style={{ color: '#30d6b5', fontWeight: '800', fontSize: '11px', display: 'block', marginBottom: '3px' }}>{c.user}</span>}
                  <span style={{ color: '#e9edef', fontSize: '12.5px', lineHeight: '1.4', wordBreak: 'break-word', display: 'block' }}>{c.msg}</span>
                  <span style={{ display: 'block', textTransform: 'uppercase', textAlign: 'right', fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{c.time}</span>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: '10px 14px', background: '#202c33', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <input type="text" placeholder={balance > 1000 ? 'Type chat message...' : 'Requires KES 1001+ balance'} disabled={balance <= 1000} value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') broadcastChatMessage(); }} style={{ flex: 1, padding: '10px 14px', background: '#2a3942', border: 'none', color: '#fff', borderRadius: '8px', fontSize: '13px' }} />
            <button onClick={broadcastChatMessage} style={{ background: '#00a884', border: 'none', width: '38px', height: '38px', borderRadius: '50%', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>➔</button>
          </div>
        </div>
      </div>

      <div className="mobileUtilityFooterBar" style={{ background: '#0c0d12', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'none', justifyContent: 'space-around', padding: '12px 0', position: 'sticky', bottom: 0, zIndex: 999, flexShrink: 0 }}>
        <button onClick={() => setMobileActivePanel('bets')} style={{ background: 'transparent', border: 'none', color: mobileActivePanel === 'bets' ? '#22c55e' : '#64748b', fontSize: '12px', fontWeight: '800' }}>LIVE</button>
        <button onClick={() => setMobileActivePanel('game')} style={{ background: 'transparent', border: 'none', color: mobileActivePanel === 'game' ? '#e11d48' : '#64748b', fontSize: '12px', fontWeight: '800' }}>GAME</button>
        <button onClick={() => setMobileActivePanel('chat')} style={{ background: 'transparent', border: 'none', color: mobileActivePanel === 'chat' ? '#38bdf8' : '#64748b', fontSize: '12px', fontWeight: '800' }}>CHAT</button>
      </div>

      {isDepositModalOpen && (
        <div style={modalOverlay}>
          <div style={modalBoxGreen}>
            <button onClick={() => setIsDepositModalOpen(false)} style={modalClose}>×</button>
            <h3 style={{ margin: '0 0 16px 0', color: '#22c55e', fontWeight: '900' }}>Safaricom M-Pesa Wire</h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={modalLabel}>DEPOSIT QUANTITY (MIN 49 KES)</label>
              <input type="number" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} style={modalInput} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={modalLabel}>M-PESA REGISTERED TELEPHONE</label>
              <input type="text" value={inputPhone} onChange={(e) => setInputPhone(e.target.value)} placeholder="07XXXXXXXX" style={modalInput} />
            </div>

            <button onClick={handlePaymentInitiation} disabled={loadingDeposit} style={greenButton}>
              {loadingDeposit ? 'SYNCHRONIZING...' : 'AUTHORIZE DEPOSIT'}
            </button>
          </div>
        </div>
      )}

      {isProfileModalOpen && (
        <div style={modalOverlay}>
          <div style={modalBoxBlue}>
            <button onClick={() => setIsProfileModalOpen(false)} style={modalClose}>×</button>
            <h3 style={{ margin: '0 0 16px 0', color: '#38bdf8', fontWeight: '900' }}>Profile Settings</h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={modalLabel}>DISPLAY NAME</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your name" style={modalInput} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={modalLabel}>EMAIL</label>
              <input type="text" value={user?.email || ''} disabled style={{ ...modalInput, opacity: 0.6 }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={modalLabel}>M-PESA PHONE</label>
              <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="07XXXXXXXX" style={modalInput} />
            </div>

            <button onClick={handleProfileUpdate} style={blueButton}>
              SAVE PROFILE
            </button>

            {isDemoMode && (
              <button type="button" onClick={handleResetDemo} style={{ ...secondaryModalButton, marginTop: '10px' }}>
                RESET DEMO DATA
              </button>
            )}

            <button type="button" onClick={handleSignOut} style={{ ...dangerButton, marginTop: '10px' }}>
              SIGN OUT
            </button>
          </div>
        </div>
      )}

      {isWithdrawModalOpen && (
        <div style={modalOverlay}>
          <div style={modalBoxOrange}>
            <button onClick={() => setIsWithdrawModalOpen(false)} style={modalClose}>×</button>
            <h3 style={{ margin: '0 0 16px 0', color: '#f59e0b', fontWeight: '900' }}>Withdraw Funds</h3>

            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '14px' }}>
              Available Balance: <strong style={{ color: '#22c55e' }}>KES {balance.toFixed(2)}</strong>
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={modalLabel}>WITHDRAW AMOUNT</label>
              <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Minimum 50" style={modalInput} />
            </div>

            <button onClick={handleWithdrawExecution} disabled={loadingWithdraw} style={orangeButton}>
              {loadingWithdraw ? 'PROCESSING...' : 'WITHDRAW TO M-PESA'}
            </button>
          </div>
        </div>
      )}

      {isHelpModalOpen && (
        <div style={modalOverlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsHelpModalOpen(false); }}>
          <div style={modalBoxBase} role="dialog" aria-modal="true" aria-labelledby="how-to-play-title">
            <button aria-label="Close how to play" onClick={() => setIsHelpModalOpen(false)} style={modalClose}>×</button>
            <h3 id="how-to-play-title" style={{ margin: '0 0 8px', color: '#f8fafc' }}>How to play</h3>
            <p style={modalHelpText}>Choose a stake before the round begins. The multiplier rises after takeoff and the round can end at any time.</p>
            <ol style={rulesList}>
              <li>Set a stake of at least KES {MIN_WAGER} on either deck.</li>
              <li>Select BET before takeoff, or queue the next round while a flight is running.</li>
              <li>Cash out before the flight ends to receive stake × multiplier.</li>
              <li>Auto Bet repeats a queued stake. Auto Cash Out exits at your selected multiplier.</li>
              <li>Use CANCEL NEXT BET to stop the next automatic stake without affecting the current round.</li>
            </ol>
            <div style={responsibleNotice}>Demo funds have no monetary value. Set a limit, take breaks, and never chase losses.</div>
            <button type="button" onClick={() => setIsHelpModalOpen(false)} style={{ ...secondaryModalButton, marginTop: '16px' }}>GOT IT</button>
          </div>
        </div>
      )}
      {isProvablyModalOpen && (
        <div style={modalOverlay}>
          <div style={modalBoxPurple}>
            <button onClick={() => setIsProvablyModalOpen(false)} style={modalClose}>×</button>
            <h3 style={{ margin: '0 0 8px 0', color: '#a855f7', fontWeight: '900' }}>Provably Fair Round</h3>

            {provablyLoading ? (
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>Loading hash details...</p>
            ) : (
              <>
                <div style={fairSummaryGrid}>
                  <div style={fairMiniCard}>
                    <span>Round</span>
                    <strong>#{provablyData?.nonce || currentRoundRef.current.nonce}</strong>
                  </div>
                  <div style={fairMiniCard}>
                    <span>Crash</span>
                    <strong>{Number(provablyData?.crashPoint || currentRoundRef.current.crashPoint).toFixed(2)}x</strong>
                  </div>
                </div>

                <HashLine label="Server Seed Hash" value={provablyData?.serverSeedHash || currentRoundRef.current.serverSeedHash} />
                <HashLine label="Round Hash" value={provablyData?.roundHash || currentRoundRef.current.roundHash} />
                <HashLine label="Client Seed" value={provablyData?.clientSeed || currentRoundRef.current.clientSeed} />
                <HashLine label="Verify Input" value={provablyData?.verifyInput || currentRoundRef.current.verifyInput} />
                <HashLine label="Revealed Server Seed" value={provablyData?.serverSeed || currentRoundRef.current.serverSeed || 'Available from server after round close'} />
                <HashLine label="Algorithm" value={provablyData?.algorithm || currentRoundRef.current.algorithm || 'HMAC_SHA256'} />

                <button onClick={() => fetchProvablyRound(currentRoundRef.current.nonce, true)} style={purpleButton}>
                  REFRESH HASH DETAILS
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .demoBanner { background: #14532d; color: #dcfce7; text-align: center; padding: 7px 16px; font-size: 11px; font-weight: 900; letter-spacing: .45px; }
        .cockpitMainLayout {
          grid-template-columns: 310px minmax(0, 1fr) 310px;
        }

        canvas {
          image-rendering: auto;
        }

        @media (max-width: 1180px) {
          .cockpitMainLayout {
            grid-template-columns: 260px minmax(0, 1fr) 260px !important;
            gap: 10px !important;
            padding: 10px !important;
          }
        }

        @media (max-width: 992px) {
          .cockpitMainLayout {
            grid-template-columns: 1fr !important;
            height: calc(100dvh - 138px) !important;
            padding: 8px !important;
            padding-bottom: 62px !important;
          }

          .mobileUtilityFooterBar {
            display: flex !important;
          }

          .leftPanelLayout {
            display: ${mobileActivePanel === 'bets' ? 'flex !important' : 'none !important'};
            height: 100% !important;
          }

          .centerPanelLayout {
            display: ${mobileActivePanel === 'game' ? 'flex !important' : 'none !important'};
            height: 100% !important;
          }

          .rightPanelLayout {
            display: ${mobileActivePanel === 'chat' ? 'flex !important' : 'none !important'};
            height: 100% !important;
          }

          .centerPanelLayout > div:first-child {
            min-height: 260px !important;
            flex: 1 1 auto !important;
          }

          .betControlsGrid {
            grid-template-columns: 1fr 1fr !important;
            max-height: 255px !important;
            overflow: visible !important;
            padding: 7px !important;
            gap: 7px !important;
            flex-shrink: 0 !important;
          }

          .deckPanel {
            padding: 7px !important;
            border-radius: 12px !important;
          }

          .betActionButton,
          .cashOutButton {
            padding: 9px 5px !important;
            min-height: 56px !important;
          }

          header {
            padding: 8px 10px !important;
            gap: 6px !important;
            flex-wrap: wrap;
          }

          header > div {
            flex-wrap: wrap;
            gap: 7px !important;
          }

          header span {
            font-size: 19px !important;
          }
        }

        @media (max-width: 560px) {
          .cockpitMainLayout {
            height: calc(100dvh - 150px) !important;
            padding: 6px !important;
            padding-bottom: 56px !important;
          }

          .centerPanelLayout {
            gap: 7px !important;
          }

          .centerPanelLayout > div:first-child {
            min-height: 225px !important;
            border-radius: 16px !important;
          }

          .betControlsGrid {
            grid-template-columns: 1fr 1fr !important;
            gap: 5px !important;
            border-radius: 14px !important;
            max-height: 245px !important;
          }

          .deckPanel input {
            padding-top: 6px !important;
            padding-bottom: 6px !important;
            font-size: 12px !important;
          }

          .deckPanel button {
            font-size: 10px !important;
          }

          .mobileUtilityFooterBar {
            padding: 8px 0 !important;
          }

          .mobileUtilityFooterBar button {
            font-size: 10px !important;
          }

          h1 {
            font-size: 3.1rem !important;
          }
        }

        @media (max-width: 420px) {
          .centerPanelLayout > div:first-child {
            min-height: 200px !important;
          }

          .betControlsGrid {
            max-height: 235px !important;
            padding: 5px !important;
          }

          h1 {
            font-size: 2.65rem !important;
          }

          .cockpitMainLayout {
            height: calc(100dvh - 164px) !important;
          }
        }
      `}</style>
    </div>
  );
}

function HashLine({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <label style={modalLabel}>{label}</label>
      <div style={hashBox}>{value || 'Unavailable'}</div>
    </div>
  );
}


const historyChip3D: CSSProperties = {
  padding: '5px 15px',
  borderRadius: '10px',
  fontSize: '11px',
  fontWeight: '950',
  flexShrink: 0,
  letterSpacing: '0.2px',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 9px 16px rgba(0,0,0,0.42)',
  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
};

const historyChipLow: CSSProperties = {
  background: '#1e293b',
  color: '#cbd5e1',
};

const historyChipHigh: CSSProperties = {
  background: '#6d28d9',
  color: '#fff',
};

const historyChipUltra: CSSProperties = {
  background: '#b45309',
  color: '#fff7ed',
};

const liveTableHead: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 72px 72px',
  gap: '8px',
  color: '#64748b',
  fontSize: '10px',
  fontWeight: '900',
  textTransform: 'uppercase',
  padding: '4px 8px 8px',
};

const liveRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 72px 72px',
  gap: '8px',
  alignItems: 'center',
  padding: '9px 10px',
  background: '#0f172a',
  border: '1px solid rgba(255,255,255,0.055)',
  borderRadius: '12px',
  fontSize: '12px',
  marginBottom: '7px',
};

const liveUser: CSSProperties = {
  display: 'block',
  color: '#e2e8f0',
  fontWeight: '900',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const liveSub: CSSProperties = {
  display: 'block',
  color: '#475569',
  fontSize: '9px',
  fontWeight: '800',
  marginTop: '2px',
};

const liveStake: CSSProperties = {
  color: '#fff',
  fontWeight: '900',
  textAlign: 'right',
};

const winBadge: CSSProperties = {
  color: '#22c55e',
  background: 'rgba(34,197,94,0.1)',
  border: '1px solid rgba(34,197,94,0.22)',
  borderRadius: '999px',
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: '950',
  textAlign: 'center',
};

const lostBadge: CSSProperties = {
  color: '#ef4444',
  background: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.22)',
  borderRadius: '999px',
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: '950',
  textAlign: 'center',
};

const flyingBadge: CSSProperties = {
  color: '#38bdf8',
  background: 'rgba(56,189,248,0.1)',
  border: '1px solid rgba(56,189,248,0.22)',
  borderRadius: '999px',
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: '950',
  textAlign: 'center',
};

const queueBadge: CSSProperties = {
  color: '#94a3b8',
  background: 'rgba(148,163,184,0.1)',
  border: '1px solid rgba(148,163,184,0.16)',
  borderRadius: '999px',
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: '950',
  textAlign: 'center',
};

const emptyTableState: CSSProperties = {
  height: '70%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  color: '#64748b',
  fontSize: '12px',
  gap: '4px',
  textAlign: 'center',
};

const deckPanelStyle: CSSProperties = {
  background: 'rgba(0,0,0,0.28)',
  border: '1px solid rgba(255,255,255,0.06)',
  padding: '10px',
  borderRadius: '14px',
  minWidth: 0,
  boxSizing: 'border-box',
};

const spribeToggleRow: CSSProperties = {
  display: 'flex',
  background: '#111827',
  borderRadius: '999px',
  padding: '3px',
  marginBottom: '8px',
};

const spribeTab: CSSProperties = {
  flex: 1,
  border: 'none',
  borderRadius: '999px',
  padding: '7px',
  fontSize: '10px',
  fontWeight: '900',
  cursor: 'pointer',
};

const wagerControlsRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '30px 1fr 30px',
  gap: '6px',
  alignItems: 'center',
  marginBottom: '6px',
};

const roundMiniButton: CSSProperties = {
  height: '30px',
  borderRadius: '50%',
  border: 'none',
  background: '#1f2937',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '900',
  cursor: 'pointer',
};

const wagerInput: CSSProperties = {
  width: '100%',
  padding: '8px',
  background: '#030712',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  fontWeight: '900',
  textAlign: 'center',
  borderRadius: '999px',
  fontSize: '14px',
  boxSizing: 'border-box',
};

const quickStakeRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '4px',
  marginBottom: '8px',
};

const quickStakeButton: CSSProperties = {
  background: '#1f2937',
  border: 'none',
  color: '#cbd5e1',
  borderRadius: '999px',
  padding: '5px 2px',
  fontSize: '10px',
  fontWeight: '900',
  cursor: 'pointer',
};

const autoCashRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '6px',
};

const switchTrack: CSSProperties = {
  width: '40px',
  height: '22px',
  borderRadius: '999px',
  border: 'none',
  padding: '2px',
  cursor: 'pointer',
  transition: '0.2s',
};

const switchKnob: CSSProperties = {
  display: 'block',
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  background: '#fff',
  transition: '0.2s',
};

const autoCashInput: CSSProperties = {
  width: '100%',
  padding: '8px',
  background: '#030712',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: '900',
  textAlign: 'center',
  marginBottom: '8px',
  boxSizing: 'border-box',
};

const betButton: CSSProperties = {
  width: '100%',
  padding: '11px',
  border: 'none',
  color: '#fff',
  fontWeight: '950',
  fontSize: '13px',
  borderRadius: '12px',
  cursor: 'pointer',
  boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
};

const cashOutButton: CSSProperties = {
  width: '100%',
  padding: '11px',
  background: '#b45309',
  border: 'none',
  color: '#fff',
  fontWeight: '950',
  fontSize: '13px',
  borderRadius: '12px',
  cursor: 'pointer',
};

const modalOverlay: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '12px',
};

const modalBoxBase: CSSProperties = {
  background: '#0c0d12',
  borderRadius: '20px',
  width: '100%',
  maxWidth: '390px',
  padding: '26px',
  position: 'relative',
  boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
};

const modalBoxGreen: CSSProperties = { ...modalBoxBase, border: '1px solid #22c55e' };
const modalBoxBlue: CSSProperties = { ...modalBoxBase, border: '1px solid #38bdf8' };
const modalBoxOrange: CSSProperties = { ...modalBoxBase, border: '1px solid #f59e0b' };
const modalBoxPurple: CSSProperties = { ...modalBoxBase, border: '1px solid #a855f7', maxWidth: '520px' };

const modalClose: CSSProperties = {
  position: 'absolute',
  top: '14px',
  right: '16px',
  background: 'transparent',
  border: 'none',
  color: '#64748b',
  fontSize: '24px',
  cursor: 'pointer',
};

const modalLabel: CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: '#94a3b8',
  fontWeight: '800',
  marginBottom: '4px',
};

const modalInput: CSSProperties = {
  width: '92%',
  padding: '12px',
  marginTop: '4px',
  background: '#141622',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  fontSize: '14px',
  borderRadius: '8px',
};

const hashBox: CSSProperties = {
  background: '#020617',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#e2e8f0',
  padding: '10px',
  borderRadius: '10px',
  fontSize: '11px',
  lineHeight: 1.45,
  wordBreak: 'break-all',
  fontFamily: 'monospace',
};

const fairSummaryGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
  margin: '14px 0',
};

const fairMiniCard: CSSProperties = {
  background: 'rgba(168,85,247,0.1)',
  border: '1px solid rgba(168,85,247,0.22)',
  borderRadius: '12px',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  color: '#c4b5fd',
  fontSize: '11px',
  fontWeight: '900',
};

const modalHelpText: CSSProperties = { color: '#94a3b8', fontSize: '13px', lineHeight: 1.6, margin: '0 0 14px' };
const rulesList: CSSProperties = { color: '#dbe3ee', fontSize: '13px', lineHeight: 1.65, paddingLeft: '20px', margin: 0 };
const responsibleNotice: CSSProperties = { marginTop: '16px', padding: '12px', background: '#111827', border: '1px solid #334155', borderRadius: '10px', color: '#cbd5e1', fontSize: '12px', lineHeight: 1.5 };
const secondaryModalButton: CSSProperties = { width: '100%', minHeight: '44px', padding: '12px', background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', fontWeight: '800', borderRadius: '10px', cursor: 'pointer' };
const dangerButton: CSSProperties = { width: '100%', minHeight: '44px', padding: '12px', background: '#7f1d1d', border: '1px solid #b91c1c', color: '#fff', fontWeight: '800', borderRadius: '10px', cursor: 'pointer' };
const greenButton: CSSProperties = {
  width: '100%',
  padding: '14px',
  background: '#15803d',
  border: 'none',
  color: '#fff',
  fontWeight: '900',
  borderRadius: '10px',
  cursor: 'pointer',
};

const blueButton: CSSProperties = {
  width: '100%',
  padding: '14px',
  background: '#0369a1',
  border: 'none',
  color: '#fff',
  fontWeight: '900',
  borderRadius: '10px',
  cursor: 'pointer',
};

const orangeButton: CSSProperties = {
  width: '100%',
  padding: '14px',
  background: '#b45309',
  border: 'none',
  color: '#fff',
  fontWeight: '900',
  borderRadius: '10px',
  cursor: 'pointer',
};

const purpleButton: CSSProperties = {
  width: '100%',
  padding: '13px',
  marginTop: '6px',
  background: '#7e22ce',
  border: 'none',
  color: '#fff',
  fontWeight: '900',
  borderRadius: '10px',
  cursor: 'pointer',
};
