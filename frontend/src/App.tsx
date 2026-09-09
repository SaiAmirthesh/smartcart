import { useState } from 'react';
import { Header } from './shared/components/Header';
import { ProductTable } from './features/cart/components/ProductTable';
import { AddProductDialog } from './features/cart/components/AddProductDialog';
import { BillingSummary } from './features/billing/components/BillingSummary';
import { CheckoutModal } from './features/checkout/components/CheckoutModal';
import { useCart } from './features/cart/hooks/useCart';
import { DEFAULT_CART_ID } from './shared/config/constants';
import type { CatalogProduct } from './shared/config/constants';

export function App() {
  const {
    items,
    totals,
    updateQuantity,
    removeItem,
    addItem,
    clearCart,
    resetToDefault,
  } = useCart();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const handleAddProduct = (product: CatalogProduct) => {
    addItem(product, 1);
  };

  const handleStartCheckout = () => {
    if (items.length === 0) return;
    setIsCheckoutModalOpen(true);
  };

  const handleNewBill = () => {
    clearCart();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 antialiased flex flex-col font-sans">
      {/* POS Top Bar */}
      <Header
        cartId={DEFAULT_CART_ID}
        itemCount={totals.itemCount}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onResetCart={resetToDefault}
      />

      {/* Main Billing Canvas */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Section 1: Current Products & Quantity Controls */}
        <ProductTable
          items={items}
          onUpdateQuantity={updateQuantity}
          onRemove={removeItem}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onLoadSample={resetToDefault}
        />

        {/* Section 2: Below Section - Net Bill, Total Items & Checkout Button */}
        <BillingSummary
          totals={totals}
          onCheckout={handleStartCheckout}
          disabled={items.length === 0}
        />
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200/70 text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SmartCart POS Terminal • Autonomous RFID Checkout</span>
          <span className="font-mono text-[11px] text-slate-400">
            v2.1 • UPI Simulation Mode (Razorpay Ready)
          </span>
        </div>
      </footer>

      {/* Dialogs */}
      <AddProductDialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProduct={handleAddProduct}
      />

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        totals={totals}
        items={items}
        cartId={DEFAULT_CART_ID}
        onNewBill={handleNewBill}
      />
    </div>
  );
}

export default App;
