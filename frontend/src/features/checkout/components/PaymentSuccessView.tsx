import React from 'react';
import { Check, Printer, RotateCcw, ShieldCheck, Tag } from 'lucide-react';
import { Button } from '../../../shared/components/Button';
import { formatCurrency, formatDateTime } from '../../../shared/utils/formatters';
import type { PaymentReceipt } from '../types';

interface PaymentSuccessViewProps {
  receipt: PaymentReceipt;
  onStartNewBill: () => void;
}

export const PaymentSuccessView: React.FC<PaymentSuccessViewProps> = ({
  receipt,
  onStartNewBill,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="text-center space-y-5 py-2">
      {/* Success Animation Icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-in zoom-in-75 duration-300">
          <Check className="w-8 h-8 stroke-[3]" />
        </div>
      </div>

      {/* Heading */}
      <div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Payment Successful!</h3>
        <p className="text-xs text-slate-500 mt-1">
          Transaction verified • Digital receipt generated
        </p>
      </div>

      {/* Receipt Paper Card */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-3 font-mono text-xs">
        {/* Receipt Header Info */}
        <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-300 text-slate-500">
          <div>
            <span className="font-bold text-slate-800">{receipt.storeName}</span>
            <div className="text-[11px] text-slate-400">Cart: {receipt.cartId}</div>
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-700">{receipt.billNumber}</span>
            <div className="text-[10px] text-slate-400">{formatDateTime(receipt.timestamp)}</div>
          </div>
        </div>

        {/* Transaction Reference */}
        <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/60">
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-400" />
            Txn Reference:
          </span>
          <span className="font-bold text-indigo-600">{receipt.transactionId}</span>
        </div>

        {/* Items List (compact POS style) */}
        <div className="py-2 space-y-1.5 border-b border-dashed border-slate-300 max-h-36 overflow-y-auto pr-1">
          {receipt.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-slate-700">
              <span className="truncate pr-2">
                {item.quantity} × {item.name}
              </span>
              <span className="font-bold shrink-0">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1 pt-1 text-slate-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(receipt.totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>GST (5%)</span>
            <span>{formatCurrency(receipt.totals.tax)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-black text-slate-900">
            <span>Paid Amount</span>
            <span className="text-emerald-600">{formatCurrency(receipt.totals.total)}</span>
          </div>
        </div>

        <div className="pt-2 text-[10px] text-center text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          Verified via SmartCart Payment Gateway
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="outline"
          size="md"
          onClick={handlePrint}
          icon={<Printer className="w-4 h-4" />}
          className="w-full justify-center"
        >
          Print Receipt
        </Button>

        <Button
          variant="primary"
          size="md"
          onClick={onStartNewBill}
          icon={<RotateCcw className="w-4 h-4" />}
          className="w-full justify-center bg-indigo-600 hover:bg-indigo-700"
        >
          Start New Bill
        </Button>
      </div>
    </div>
  );
};
