export const TAX_RATE = 0.05; // 5% GST
export const DEFAULT_CART_ID = 'SC-001';
export const DEFAULT_STORE_NAME = 'SmartCart Retail';
export const DEFAULT_STORE_LOCATION = 'Express Checkout #4';

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  rfidUid: string;
  unit: string;
  icon: string;
}

export const SAMPLE_CATALOG: CatalogProduct[] = [
  {
    id: 'P001',
    name: 'Farm Fresh Whole Milk',
    category: 'Dairy',
    price: 64.0,
    rfidUid: 'RFID-A91F2C',
    unit: '1 Litre',
    icon: '🥛',
  },
  {
    id: 'P002',
    name: 'Artisan Sliced Bread',
    category: 'Bakery',
    price: 48.0,
    rfidUid: 'RFID-B82E19',
    unit: '400g',
    icon: '🍞',
  },
  {
    id: 'P003',
    name: 'Fresh Chicken Breast',
    category: 'Meat & Poultry',
    price: 285.0,
    rfidUid: 'RFID-C71D42',
    unit: '500g',
    icon: '🍗',
  },
  {
    id: 'P004',
    name: 'Organic Bananas (Robusta)',
    category: 'Produce',
    price: 55.0,
    rfidUid: 'RFID-D63C81',
    unit: '1 kg',
    icon: '🍌',
  },
  {
    id: 'P005',
    name: 'Premium Roasted Coffee Beans',
    category: 'Beverages',
    price: 340.0,
    rfidUid: 'RFID-E54B99',
    unit: '250g',
    icon: '☕',
  },
  {
    id: 'P006',
    name: 'Greek Yogurt Plain',
    category: 'Dairy',
    price: 95.0,
    rfidUid: 'RFID-F45A12',
    unit: '200g',
    icon: '🥣',
  },
  {
    id: 'P007',
    name: 'Italian Penne Rigate Pasta',
    category: 'Pantry',
    price: 110.0,
    rfidUid: 'RFID-G36F73',
    unit: '500g',
    icon: '🍝',
  },
  {
    id: 'P008',
    name: 'Cold Pressed Extra Virgin Olive Oil',
    category: 'Pantry',
    price: 499.0,
    rfidUid: 'RFID-H27E45',
    unit: '500ml',
    icon: '🫒',
  },
];
