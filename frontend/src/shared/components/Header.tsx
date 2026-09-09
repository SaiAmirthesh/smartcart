import React from 'react';
import { ShoppingBag, RotateCcw, Plus } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';
import { DEFAULT_CART_ID, DEFAULT_STORE_NAME } from '../config/constants';

interface HeaderProps {
  cartId?: string;
  itemCount: number;
  onOpenAddModal: () => void;
  onResetCart: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartId = DEFAULT_CART_ID,
  itemCount,
  onOpenAddModal,
  onResetCart,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Terminal Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">SmartCart POS</h1>
              <Badge variant="purple" className="font-mono text-[10px] px-2 py-0">
                {cartId}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <span>{DEFAULT_STORE_NAME}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live RFID Engine
              </span>
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAddModal}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">Add / Scan Product</span>
            <span className="sm:hidden">Add Item</span>
          </Button>

          {itemCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetCart}
              icon={<RotateCcw className="w-3.5 h-3.5 text-slate-400" />}
              className="text-slate-500 hover:text-slate-800"
              title="Reset current cart"
            >
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
