import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getProductTypeFromCategory, isStockTracked, type Product, type ProductInsert, type ProductType } from '@/hooks/useProducts';

function generateSKU(existingProducts: Product[]): string {
  const regex = /^SK(\d+)$/i;
  let maxNum = 0;
  existingProducts.forEach((p) => {
    const match = p.sku?.match(regex);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1]));
    }
  });
  return `SK${String(maxNum + 1).padStart(4, '0')}`;
}

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductInsert) => void;
  onCancel: () => void;
  isLoading: boolean;
  existingCategories: string[];
  allProducts: Product[];
}

export default function ProductForm({
  product,
  onSubmit,
  onCancel,
  isLoading,
  existingCategories,
  allProducts,
}: ProductFormProps) {
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [formData, setFormData] = useState<ProductInsert>({
    name: product?.name || '',
    sku: product?.sku || generateSKU(allProducts),
    description: product?.description || '',
    buying_price: product?.buying_price || 0,
    selling_price: product?.selling_price || 0,
    stock_quantity: product?.stock_quantity || 0,
    minimum_stock_level: product?.minimum_stock_level || 1,
    category: product?.category || '',
    unit: product?.unit || '',
    product_type: product?.product_type || 'product',
  });

  const showStock = isStockTracked(formData.product_type!);

  const handleTypeChange = (value: ProductType) => {
    const updates: Partial<ProductInsert> = { product_type: value };
    if (!isStockTracked(value)) {
      updates.stock_quantity = 0;
      updates.minimum_stock_level = 0;
    } else if (formData.stock_quantity === 0 && !product) {
      updates.minimum_stock_level = 1;
    }
    setFormData({ ...formData, ...updates });
  };

  const handleCategoryChange = (value: string) => {
    if (value === '__new__') {
      setIsNewCategory(true);
      setFormData({ ...formData, category: '', product_type: 'product' });
    } else {
      setIsNewCategory(false);
      const autoType = getProductTypeFromCategory(value);
      setFormData({ ...formData, category: value, product_type: autoType });
    }
  };

  const handleNewCategoryInput = (value: string) => {
    const autoType = getProductTypeFromCategory(value);
    setFormData({ ...formData, category: value, product_type: autoType });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    const finalData = { ...formData };
    if (!finalData.sku) {
      finalData.sku = generateSKU(allProducts);
    }
    // Force stock to 0 for non-product types
    if (!isStockTracked(finalData.product_type!)) {
      finalData.stock_quantity = 0;
      finalData.minimum_stock_level = 0;
    }
    onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type selector at top */}
      <div className="space-y-2">
        <Label htmlFor="product_type">Item Type *</Label>
        <Select
          value={formData.product_type}
          onValueChange={(v: ProductType) => handleTypeChange(v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="product">Product (Inventory)</SelectItem>
            <SelectItem value="printing">Printing (On-demand)</SelectItem>
            <SelectItem value="service">Service (On-demand)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={formData.product_type === 'printing' ? 'e.g. A4 B/W Printing' : formData.product_type === 'service' ? 'e.g. Passport Photo' : 'Enter product name'}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          {!isNewCategory ? (
            <Select
              value={formData.category || undefined}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {existingCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
                <SelectItem value="__new__">+ Add New Category</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex gap-2">
              <Input
                value={formData.category}
                onChange={(e) => handleNewCategoryInput(e.target.value)}
                placeholder="Enter new category"
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsNewCategory(false);
                  setFormData({ ...formData, category: '', sku: '' });
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sku">SKU (auto-generated)</Label>
          <Input
            id="sku"
            value={formData.sku}
            readOnly
            className="bg-muted"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">
            {formData.product_type === 'printing'
              ? 'Unit (e.g. page, copy, sheet)'
              : formData.product_type === 'service'
              ? 'Unit (e.g. job, session, item)'
              : 'Unit (optional)'}
          </Label>
          <Input
            id="unit"
            value={formData.unit || ''}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value || undefined })}
            placeholder={
              formData.product_type === 'printing'
                ? 'e.g. page'
                : formData.product_type === 'service'
                ? 'e.g. job'
                : 'Leave empty for default'
            }
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="buying_price">
            {formData.product_type === 'product' ? 'Buying Price (KSH)' : 'Cost per Unit (KSH)'}
          </Label>
          <Input
            id="buying_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.buying_price}
            onChange={(e) => setFormData({ ...formData, buying_price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="selling_price">
            {formData.product_type === 'product' ? 'Selling Price (KSH)' : 'Price per Unit (KSH)'}
          </Label>
          <Input
            id="selling_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.selling_price === 0 ? '' : formData.selling_price}
            onChange={(e) => setFormData({ ...formData, selling_price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          />
        </div>
      </div>

      {/* Stock fields only for product type */}
      {showStock && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="stock_quantity">Stock Quantity</Label>
            <Input
              id="stock_quantity"
              type="number"
              min="0"
              value={formData.stock_quantity === 0 ? '' : formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value === '' ? 0 : parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minimum_stock_level">Minimum Stock Level</Label>
            <Input
              id="minimum_stock_level"
              type="number"
              min="0"
              value={formData.minimum_stock_level === 0 ? '' : formData.minimum_stock_level}
              onChange={(e) => setFormData({ ...formData, minimum_stock_level: e.target.value === '' ? 0 : parseInt(e.target.value) })}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {product ? 'Update' : 'Add'} {formData.product_type === 'product' ? 'Product' : formData.product_type === 'printing' ? 'Printing Item' : 'Service'}
        </Button>
      </div>
    </form>
  );
}
