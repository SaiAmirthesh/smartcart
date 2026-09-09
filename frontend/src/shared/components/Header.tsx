import React from 'react';
import { ShoppingBag, RotateCcw, Plus, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';
import { DEFAULT_STORE_NAME } from '../config/constants';

interface HeaderProps {
  cartCode: string;
  itemCount: number;
  isBackendConnected: boolean;
  isSyncing?: boolean;
  onOpenAddModal: () => void;
  onResetCart: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCode,
  itemCount,
  isBackendConnected,
  isSyncing = false,
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
              <h1 className="text-base font-bold text-slate-900 tracking-tight">SmartCart</h1>
              {isSyncing && (
                <span className="flex items-center gap-1 text-[10px] text-indigo-600 font-mono animate-pulse">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  Syncing...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <span>{DEFAULT_STORE_NAME}</span>
              <span>•</span>
              {isBackendConnected ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600">
                  <WifiOff className="w-3 h-3 text-amber-500" />
                  Connecting to Backend...
                </span>
              )}
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
              title="Reset current cart and start new session"
            >
              <span className="hidden sm:inline">New Cart</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
