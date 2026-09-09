import type { CartTotals } from '../../cart/types';

export interface BillingDetails {
  totals: CartTotals;
  cartId: string;
  storeName: string;
}
