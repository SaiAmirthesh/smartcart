import React, { useState, useEffect } from 'react';
import { Search, Plus, Radio, Check, RefreshCw } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { SAMPLE_CATALOG, type CatalogProduct } from '../../../shared/config/constants';
import { smartCartApi, type ApiProduct } from '../../../shared/services/api';
import { formatCurrency } from '../../../shared/utils/formatters';

interface AddProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (rfidUid: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  Dairy: '🥛',
  Bakery: '🍞',
  Meat: '🍗',
  Produce: '🍌',
  Beverages: '☕',
  Pantry: '🍝',
};

export const AddProductDialog: React.FC<AddProductDialogProps> = ({
  isOpen,
  onClose,
  onAddProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [lastAddedUid, setLastAddedUid] = useState<string | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>(SAMPLE_CATALOG);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const apiProducts: ApiProduct[] = await smartCartApi.getProducts();
        if (apiProducts && apiProducts.length > 0) {
          const mapped: CatalogProduct[] = apiProducts.map((p) => ({
            id: String(p.id),
            name: p.name,
            category: p.category,
            price: p.price,
            rfidUid: p.rfid_uid,
            unit: 'Unit',
            icon: CATEGORY_ICONS[p.category] || '📦',
          }));
          setProducts(mapped);
        }
      } catch (err) {
        console.warn('Could not load products from backend API, using local catalog:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [isOpen]);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.rfidUid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = (rfidUid: string) => {
    onAddProduct(rfidUid);
    setLastAddedUid(rfidUid);
    setTimeout(() => {
      setLastAddedUid((curr) => (curr === rfidUid ? null : curr));
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add or Scan Product"
      subtitle="Select a tagged product from the backend database to simulate an RFID event"
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
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
              Loading products from backend...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching products found in database.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isAdded = lastAddedUid === product.rfidUid;

              return (
                <div
                  key={product.rfidUid}
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
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
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
                      onClick={() => handleAdd(product.rfidUid)}
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
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <Radio className="w-3.5 h-3.5" />
            Connected to FastAPI Product DB
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
