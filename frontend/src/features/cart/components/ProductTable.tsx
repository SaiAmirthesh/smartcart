import React from 'react';
import { Layers, Plus } from 'lucide-react';
import type { CartItem } from '../types';
import { ProductRow } from './ProductRow';
import { EmptyCartState } from './EmptyCartState';
import { Button } from '../../../shared/components/Button';

interface ProductTableProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onOpenAddModal: () => void;
  onLoadSample: () => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  items,
  onUpdateQuantity,
  onRemove,
  onOpenAddModal,
  onLoadSample,
}) => {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Section Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Current Cart Items</h2>
            <p className="text-xs text-slate-500">
              Adjust product quantities or add items to recalculate bill
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAddModal}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add More
          </Button>
        )}
      </div>

      {/* Product Content */}
      {items.length === 0 ? (
        <EmptyCartState onOpenAddModal={onOpenAddModal} onLoadSample={onLoadSample} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 pl-4 pr-3 sm:pl-6">Product Details</th>
                <th className="py-3 px-3 text-right">Unit Price</th>
                <th className="py-3 px-3 text-center">Quantity</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 pl-2 pr-4 sm:pr-6 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {items.map((item) => (
                <ProductRow
                  key={item.id}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemove}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
