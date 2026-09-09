import React from 'react';
import { Minus, Plus, Trash2, Tag } from 'lucide-react';
import type { CartItem } from '../types';
import { formatCurrency } from '../../../shared/utils/formatters';

interface ProductRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}

export const ProductRow: React.FC<ProductRowProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
}) => {
  const lineTotal = item.price * item.quantity;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group">
      {/* Product Details */}
      <td className="py-3.5 pl-4 pr-3 sm:pl-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0 border border-slate-200/60 shadow-2xs">
            {item.icon || '📦'}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-800 truncate">{item.name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500">{item.category}</span>
              {item.unit && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-400 font-mono">{item.unit}</span>
                </>
              )}
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/50 hidden sm:inline-flex">
                <Tag className="w-2.5 h-2.5 text-slate-400" />
                {item.rfidUid}
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* Unit Price */}
      <td className="py-3.5 px-3 text-sm text-slate-600 font-medium whitespace-nowrap text-right">
        {formatCurrency(item.price)}
      </td>

      {/* Quantity Stepper Control */}
      <td className="py-3.5 px-3 whitespace-nowrap">
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-200/80 shadow-2xs">
            <button
              onClick={() => onUpdateQuantity(item.id, -1)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white active:scale-95 transition-all cursor-pointer"
              title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
              aria-label="Decrease quantity"
            >
              {item.quantity === 1 ? (
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
            </button>

            <span className="w-9 text-center text-sm font-semibold text-slate-800 font-mono select-none">
              {item.quantity}
            </span>

            <button
              onClick={() => onUpdateQuantity(item.id, 1)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white active:scale-95 transition-all cursor-pointer"
              title="Increase quantity"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </td>

      {/* Line Total */}
      <td className="py-3.5 px-3 text-sm font-bold text-slate-900 whitespace-nowrap text-right font-mono">
        {formatCurrency(lineTotal)}
      </td>

      {/* Quick Remove Action */}
      <td className="py-3.5 pl-2 pr-4 sm:pr-6 text-right whitespace-nowrap">
        <button
          onClick={() => onRemove(item.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
          title="Remove from cart"
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};
