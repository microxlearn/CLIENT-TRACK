import type { Timestamp, DocumentReference } from 'firebase/firestore';

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
  clientId: string; // Storing ID as string for simplicity in subcollection queries
  paymentDate: Timestamp;
  amount: number;
  validityDays: number;
  startDate: Timestamp;
  endDate: Timestamp;
}
