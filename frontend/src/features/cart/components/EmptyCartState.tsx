import React from 'react';
import { ShoppingCart, Plus, Sparkles } from 'lucide-react';
import { Button } from '../../../shared/components/Button';

interface EmptyCartStateProps {
  onOpenAddModal: () => void;
  onLoadSample: () => void;
}

export const EmptyCartState: React.FC<EmptyCartStateProps> = ({
  onOpenAddModal,
  onLoadSample,
}) => {
  return (
    <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-500 mb-4 shadow-sm">
        <ShoppingCart className="w-8 h-8 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-bold text-slate-800">Your Cart is Empty</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">
        Scan an RFID-tagged product inside the smart cart or manually add items to start billing.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenAddModal}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Product
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onLoadSample}
          icon={<Sparkles className="w-4 h-4 text-indigo-500" />}
        >
          Load Demo Items
        </Button>
      </div>
    </div>
  );
};
