export interface CartItem {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  rfidUid: string;
  unit?: string;
  icon?: string;
}

export interface CartTotals {
  itemCount: number; // total units (sum of quantities)
  uniqueItems: number; // count of distinct lines
  subtotal: number;
  tax: number;
  total: number;
}
