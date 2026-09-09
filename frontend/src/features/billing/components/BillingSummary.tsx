import React from 'react';
import { ArrowRight, Receipt, ShieldCheck, ShoppingCart } from 'lucide-react';
import type { CartTotals } from '../../cart/types';
import { formatCurrency } from '../../../shared/utils/formatters';
import { Button } from '../../../shared/components/Button';

interface BillingSummaryProps {
  totals: CartTotals;
  onCheckout: () => void;
  disabled?: boolean;
}

export const BillingSummary: React.FC<BillingSummaryProps> = ({
  totals,
  onCheckout,
  disabled = false,
}) => {
  const isCartEmpty = totals.itemCount === 0;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Bill Summary</h2>
            <p className="text-xs text-slate-500">Real-time invoice calculations & tax breakdown</p>
          </div>
        </div>
        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
          GST Included (5%)
        </div>
      </div>

      {/* Bill Breakdown Cards */}
      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Left: Detailed Line Items */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-slate-400" />
                Total Items
              </span>
              <span className="font-semibold text-slate-800 font-mono">
                {totals.itemCount} {totals.itemCount === 1 ? 'unit' : 'units'}{' '}
                <span className="text-xs text-slate-400 font-normal">
                  ({totals.uniqueItems} {totals.uniqueItems === 1 ? 'product' : 'products'})
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Items Subtotal</span>
              <span className="font-medium text-slate-800 font-mono">
                {formatCurrency(totals.subtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                GST / Sales Tax <span className="text-xs text-slate-400">(5%)</span>
              </span>
              <span className="font-medium text-slate-800 font-mono">
                {formatCurrency(totals.tax)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-emerald-700 font-medium">
              <span>Convenience / Cart Fee</span>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                FREE
              </span>
            </div>
          </div>

          {/* Right: Net Bill & Prominent Checkout Action */}
          <div className="flex flex-col justify-between h-full space-y-4">
            {/* Grand Total Box */}
            <div className="bg-linear-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md shadow-slate-900/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Net Payable Bill
                </span>
                <p className="text-xs text-slate-400 mt-0.5">Inclusive of all applicable taxes</p>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-400 font-mono">
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <div className="space-y-2">
              <Button
                variant="primary"
                size="lg"
                onClick={onCheckout}
                disabled={disabled || isCartEmpty}
                icon={<ArrowRight className="w-5 h-5" />}
                iconPosition="right"
                className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 py-3.5 text-base font-bold rounded-xl"
              >
                Proceed to Checkout
              </Button>

              <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Scan & Pay via UPI / QR Code • Contactless & Instant
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
