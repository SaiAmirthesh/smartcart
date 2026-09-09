import { useState } from 'react';
import { Header } from './shared/components/Header';
import { ProductTable } from './features/cart/components/ProductTable';
import { AddProductDialog } from './features/cart/components/AddProductDialog';
import { BillingSummary } from './features/billing/components/BillingSummary';
import { CheckoutModal } from './features/checkout/components/CheckoutModal';
import { useCart } from './features/cart/hooks/useCart';

export function App() {
  const {
    items,
    totals,
    cartId,
    cartCode,
    isBackendConnected,
    isSyncing,
    updateQuantity,
    removeItem,
    addItemByRfid,
    createNewCart,
  } = useCart();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const handleAddProductRfid = (rfidUid: string) => {
    addItemByRfid(rfidUid);
  };

  const handleStartCheckout = () => {
    if (items.length === 0) return;
    setIsCheckoutModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 antialiased flex flex-col font-sans">
      {/* POS Top Bar with Live Backend Connection Status */}
      <Header
        cartCode={cartCode}
        itemCount={totals.itemCount}
        isBackendConnected={isBackendConnected}
        isSyncing={isSyncing}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onResetCart={createNewCart}
      />

      {/* Main Billing Canvas */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Section 1: Current Products & Quantity Adjustment */}
        <ProductTable
          items={items}
          onUpdateQuantity={updateQuantity}
          onRemove={removeItem}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onLoadSample={createNewCart}
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
          <span>SmartCart</span>
        </div>
      </footer>

      {/* Dialogs */}
      <AddProductDialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProduct={handleAddProductRfid}
      />

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        totals={totals}
        items={items}
        cartId={cartId}
        cartCode={cartCode}
        onNewBill={createNewCart}
      />
    </div>
  );
}

export default App;
