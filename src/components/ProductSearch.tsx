import { useState, useEffect } from 'react';
import { Search, Barcode } from 'lucide-react';
import { Input } from './ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
}

interface ProductSearchProps {
  products: Product[];
  onSelect: (product: Product) => void;
  placeholder?: string;
}

export function ProductSearch({ products, onSelect, placeholder = 'Search by name, SKU, or barcode...' }: ProductSearchProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  // Ensure products is an array
  const safeProducts = Array.isArray(products) ? products : [];

  const filteredProducts = safeProducts.filter((product) => {
    if (!product) return false;
    const searchLower = value.toLowerCase();
    return (
      (product.name || '').toLowerCase().includes(searchLower) ||
      (product.sku || '').toLowerCase().includes(searchLower) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-10 pr-10"
        />
        <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      </div>

      {open && value && filteredProducts.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-popover border rounded-lg shadow-lg max-h-80 overflow-auto">
          <div className="p-2 space-y-1">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  onSelect(product);
                  setValue('');
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p>{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {product.sku} {product.barcode && `• ${product.barcode}`}
                    </p>
                  </div>
                  <p className="text-primary">₦{product.price.toFixed(2)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
