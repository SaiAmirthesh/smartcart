import type { CartItem, CartTotals } from '../../cart/types';

export type PaymentStatus = 'awaiting_payment' | 'processing' | 'success' | 'failed';

export interface PaymentReceipt {
  transactionId: string;
  billNumber: string;
  cartId: string;
  storeName: string;
  totals: CartTotals;
  items: CartItem[];
  timestamp: string;
  paymentMethod: string;
}
