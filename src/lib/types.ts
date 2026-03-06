import type { Timestamp, DocumentReference } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  createdAt: Timestamp;
  isLive: boolean;
  isAdmin: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  market: 'INDIAN' | 'FOREX' | 'BROKER';
  fee: number;
  subscriptionStartDate: Timestamp;
  subscriptionEndDate: Timestamp;
  paymentStatus: 'paid' | 'pending';
  totalPaid: number;
  createdAt: Timestamp;
  deleted: boolean;
  deletedAt: Timestamp | null;
}

export interface Payment {
  id: string;
  userId: string;
  clientId: string; // Storing ID as string for simplicity in subcollection queries
  paymentDate: Timestamp;
  amount: number;
  validityDays: number;
  startDate: Timestamp;
  endDate: Timestamp;
}
