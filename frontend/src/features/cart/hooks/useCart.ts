import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { CartItem, CartTotals } from '../types';
import { TAX_RATE } from '../../../shared/config/constants';
import { smartCartApi, type ApiCartDetails } from '../../../shared/services/api';

const CATEGORY_ICONS: Record<string, string> = {
  Dairy: '🥛',
  Bakery: '🍞',
  Meat: '🍗',
  Produce: '🍌',
  Beverages: '☕',
  Pantry: '🍝',
};

const mapCartItem = (item: ApiCartDetails['items'][0], index: number): CartItem => {
  return {
    id: `item-${item.rfid_uid || index}`,
    name: item.product,
    category: 'Grocery',
    price: item.unit_price,
    quantity: item.quantity,
    rfidUid: item.rfid_uid,
    icon: CATEGORY_ICONS[item.product] || '📦',
  };
};

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<number | null>(null);
  const [cartCode, setCartCode] = useState<string>('CART-001');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const initializingRef = useRef(false);

  // Sync cart from backend
  const fetchCart = useCallback(async (targetCartId: number) => {
    try {
      setIsSyncing(true);
      const cartData = await smartCartApi.getCart(targetCartId);
      setCartCode(cartData.cart_code);

      // If cart is already checkout_pending, create a fresh cart
      if (cartData.status !== 'active') {
        const newCart = await smartCartApi.createCart();
        setCartId(newCart.id);
        setCartCode(newCart.cart_code);
        localStorage.setItem('smartcart_cart_id', String(newCart.id));
        setItems([]);
        return;
      }

      const mappedItems = cartData.items.map(mapCartItem);
      setItems(mappedItems);
    } catch (err) {
      console.warn('Failed to fetch cart from backend:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initialize or restore cart session
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    const initCart = async () => {
      setIsLoading(true);
      try {
        const isHealthy = await smartCartApi.checkHealth();
        setIsBackendConnected(isHealthy);

        if (isHealthy) {
          const savedCartId = localStorage.getItem('smartcart_cart_id');
          if (savedCartId) {
            const numericId = parseInt(savedCartId, 10);
            try {
              const existingCart = await smartCartApi.getCart(numericId);
              if (existingCart.status === 'active') {
                setCartId(numericId);
                setCartCode(existingCart.cart_code);
                setItems(existingCart.items.map(mapCartItem));
                setIsLoading(false);
                return;
              }
            } catch {
              // saved cart not valid, will create fresh below
            }
          }

          // Create new cart session
          const newCart = await smartCartApi.createCart();
          setCartId(newCart.id);
          setCartCode(newCart.cart_code);
          localStorage.setItem('smartcart_cart_id', String(newCart.id));

          // Auto-seed initial items if newly created cart
          try {
            await smartCartApi.addProductToCart(newCart.id, 'RFID-A91F2C');
            await smartCartApi.addProductToCart(newCart.id, 'RFID-B82E19');
            await smartCartApi.addProductToCart(newCart.id, 'RFID-B82E19');
            await smartCartApi.addProductToCart(newCart.id, 'RFID-C71D42');
            await fetchCart(newCart.id);
          } catch (seedErr) {
            console.warn('Could not auto-seed cart items:', seedErr);
          }
        }
      } catch (e) {
        console.error('Backend connection failed:', e);
        setIsBackendConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    initCart();
  }, [fetchCart]);

  // Totals calculations
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

  // Adjust quantity (+1 or -1) via backend
  const updateQuantity = useCallback(
    async (id: string, delta: number) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      if (cartId && isBackendConnected) {
        try {
          setIsSyncing(true);
          if (delta > 0) {
            await smartCartApi.addProductToCart(cartId, item.rfidUid);
          } else {
            await smartCartApi.removeProductFromCart(cartId, item.rfidUid);
          }
          await fetchCart(cartId);
          return;
        } catch (err) {
          console.error('Backend quantity update failed, falling back locally:', err);
        } finally {
          setIsSyncing(false);
        }
      }

      // Fallback local update
      setItems((prev) =>
        prev
          .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
          .filter((i) => i.quantity > 0)
      );
    },
    [cartId, isBackendConnected, items, fetchCart]
  );

  // Remove product
  const removeItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      if (cartId && isBackendConnected) {
        try {
          setIsSyncing(true);
          // remove all quantities of this product
          for (let q = 0; q < item.quantity; q++) {
            await smartCartApi.removeProductFromCart(cartId, item.rfidUid);
          }
          await fetchCart(cartId);
          return;
        } catch (err) {
          console.error('Backend remove item failed, falling back locally:', err);
        } finally {
          setIsSyncing(false);
        }
      }

      setItems((prev) => prev.filter((i) => i.id !== id));
    },
    [cartId, isBackendConnected, items, fetchCart]
  );

  // Add product by RFID UID
  const addItemByRfid = useCallback(
    async (rfidUid: string) => {
      if (cartId && isBackendConnected) {
        try {
          setIsSyncing(true);
          await smartCartApi.addProductToCart(cartId, rfidUid);
          await fetchCart(cartId);
          return;
        } catch (err) {
          console.error('Failed to add product to backend:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    },
    [cartId, isBackendConnected, fetchCart]
  );

  // Create new fresh cart (resets for new bill/shopper)
  const createNewCart = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isBackendConnected) {
        const newCart = await smartCartApi.createCart();
        setCartId(newCart.id);
        setCartCode(newCart.cart_code);
        localStorage.setItem('smartcart_cart_id', String(newCart.id));
      }
      setItems([]);
    } catch (err) {
      console.error('Failed to create new cart on backend:', err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isBackendConnected]);

  return {
    items,
    totals,
    cartId,
    cartCode,
    isBackendConnected,
    isLoading,
    isSyncing,
    updateQuantity,
    removeItem,
    addItemByRfid,
    createNewCart,
    refreshCart: () => cartId && fetchCart(cartId),
  };
};
