import React, { useState } from 'react';
import { Search, Plus, Radio, Check } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { SAMPLE_CATALOG, type CatalogProduct } from '../../../shared/config/constants';
import { formatCurrency } from '../../../shared/utils/formatters';

interface AddProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: CatalogProduct) => void;
}

export const AddProductDialog: React.FC<AddProductDialogProps> = ({
  isOpen,
  onClose,
  onAddProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const filteredProducts = SAMPLE_CATALOG.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.rfidUid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = (product: CatalogProduct) => {
    onAddProduct(product);
    setLastAddedId(product.id);
    setTimeout(() => {
      setLastAddedId((curr) => (curr === product.id ? null : curr));
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add or Scan Product"
      subtitle="Select a tagged product from the catalog to simulate an RFID cart event"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name, category, or RFID..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Product Grid / List */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
          {filteredProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching products found in catalog.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isAdded = lastAddedId === product.id;

              return (
                <div
                  key={product.id}
                  className="pt-2 first:pt-0 flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0 border border-slate-200/60">
                      {product.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{product.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{product.category}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">{product.unit}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-indigo-600 bg-indigo-50 px-1 rounded">
                          <Radio className="w-2.5 h-2.5" />
                          {product.rfidUid}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {formatCurrency(product.price)}
                    </span>
                    <Button
                      variant={isAdded ? 'success' : 'outline'}
                      size="sm"
                      onClick={() => handleAdd(product)}
                      icon={isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    >
                      {isAdded ? 'Added!' : 'Add'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-indigo-500" />
            Simulating live RFID sensor inputs
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
