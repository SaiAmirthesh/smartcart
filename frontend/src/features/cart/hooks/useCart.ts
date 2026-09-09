import { useState, useMemo, useCallback } from 'react';
import type { CartItem, CartTotals } from '../types';
import { TAX_RATE, SAMPLE_CATALOG, type CatalogProduct } from '../../../shared/config/constants';

const INITIAL_CART_ITEMS: CartItem[] = [
  {
    id: SAMPLE_CATALOG[0].id,
    name: SAMPLE_CATALOG[0].name,
    category: SAMPLE_CATALOG[0].category,
    price: SAMPLE_CATALOG[0].price,
    quantity: 1,
    rfidUid: SAMPLE_CATALOG[0].rfidUid,
    unit: SAMPLE_CATALOG[0].unit,
    icon: SAMPLE_CATALOG[0].icon,
  },
  {
    id: SAMPLE_CATALOG[1].id,
    name: SAMPLE_CATALOG[1].name,
    category: SAMPLE_CATALOG[1].category,
    price: SAMPLE_CATALOG[1].price,
    quantity: 2,
    rfidUid: SAMPLE_CATALOG[1].rfidUid,
    unit: SAMPLE_CATALOG[1].unit,
    icon: SAMPLE_CATALOG[1].icon,
  },
  {
    id: SAMPLE_CATALOG[2].id,
    name: SAMPLE_CATALOG[2].name,
    category: SAMPLE_CATALOG[2].category,
    price: SAMPLE_CATALOG[2].price,
    quantity: 1,
    rfidUid: SAMPLE_CATALOG[2].rfidUid,
    unit: SAMPLE_CATALOG[2].unit,
    icon: SAMPLE_CATALOG[2].icon,
  },
];

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>(INITIAL_CART_ITEMS);

  const totals: CartTotals = useMemo(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueItems = items.length;
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    return {
      itemCount,
      uniqueItems,
      subtotal,
      tax,
      total,
    };
  }, [items]);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setItems((prevItems) =>
      prevItems
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  }, []);

  const setQuantity = useCallback((id: string, qty: number) => {
    setItems((prevItems) => {
      if (qty <= 0) {
        return prevItems.filter((item) => item.id !== id);
      }
      return prevItems.map((item) => (item.id === id ? { ...item, quantity: qty } : item));
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  }, []);

  const addItem = useCallback((product: CatalogProduct, quantity = 1) => {
    setItems((prevItems) => {
      const existing = prevItems.find((item) => item.id === product.id || item.rfidUid === product.rfidUid);
      if (existing) {
        return prevItems.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...prevItems,
        {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          quantity,
          rfidUid: product.rfidUid,
          unit: product.unit,
          icon: product.icon,
        },
      ];
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const resetToDefault = useCallback(() => {
    setItems(INITIAL_CART_ITEMS);
  }, []);

  return {
    items,
    totals,
    updateQuantity,
    setQuantity,
    removeItem,
    addItem,
    clearCart,
    resetToDefault,
  };
};
