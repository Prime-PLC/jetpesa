export type ThemePreference = 'system' | 'light' | 'dark';
export type GameStatus = 'idle' | 'running' | 'crashed';
export type MobilePanel = 'bets' | 'game' | 'chat';
export type ToastType = 'info' | 'success' | 'error';
export type BetStatus = 'queued' | 'flying' | 'cashed' | 'lost';

export interface JetPesaUser {
  uid: string;
  email: string | null;
  displayName?: string;
  mpesaPhone?: string;
  walletBalance?: number;
  createdAt?: string;
}

export interface BetDeckState {
  wager: number;
  isAuto: boolean;
  isAutoCash: boolean;
  cashVal: number | string;
  hasBetNext: boolean;
  hasBetCurrent: boolean;
}

export interface BetHistoryItem {
  roundId: string;
  stake: number;
  multiplier: number;
  yieldAmount: number;
  status: 'WON' | 'LOST';
}

export interface LiveBet {
  id: number;
  username: string;
  bet: number;
  mult: number;
  won: boolean;
  status: BetStatus;
  payout?: number;
}

export interface ChatMessage { user: string; msg: string; time: string; }

export interface ProvablyFairRound {
  nonce: number;
  crashPoint: number;
  serverSeedHash: string;
  serverSeed?: string;
  roundHash: string;
  clientSeed: string;
  verifyInput: string;
  algorithm: string;
  houseEdge: number;
}

export interface DepositRecord {
  reference: string;
  userId: string;
  amount: number;
  phone: string;
  status: 'pending' | 'completed' | 'failed';
  provider: 'payhero' | 'daraja' | null;
  credited: boolean;
  failureReason?: string;
}

export interface ApiResult<T = Record<string, unknown>> {
  success: boolean;
  message?: string;
  status?: string;
  data?: T;
}