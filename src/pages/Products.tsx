import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, type Product, type ProductInsert } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Edit, Trash2, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function generateSKU(existingProducts: Product[]): string {
  const prefix = 'SKU';
  const regex = /^SKU-(\d+)$/;
  let maxNum = 0;
  existingProducts.forEach((p) => {
    const match = p.sku?.toUpperCase().match(regex);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1]));
    }
  });

  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

function ProductForm({ 
  product, 
  onSubmit, 
  onCancel,
  isLoading,
  existingCategories,
  allProducts,
}: { 
  product?: Product; 
  onSubmit: (data: ProductInsert) => void;
  onCancel: () => void;
  isLoading: boolean;
  existingCategories: string[];
  allProducts: Product[];
}) {
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
  });

  const handleCategoryChange = (value: string) => {
    if (value === '__new__') {
      setIsNewCategory(true);
      setFormData({ ...formData, category: '' });
    } else {
      setIsNewCategory(false);
      setFormData({ ...formData, category: value });
    }
  };

  const handleNewCategoryInput = (value: string) => {
    setFormData({ ...formData, category: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    // Auto-generate SKU if empty
    const finalData = { ...formData };
    if (!finalData.sku && finalData.category) {
      finalData.sku = generateSKU(finalData.category, allProducts);
    }
    onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter product name"
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
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
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

      <div className="space-y-2">
        <Label htmlFor="sku">SKU (auto-generated from category)</Label>
        <Input
          id="sku"
          value={formData.sku}
          readOnly
          className="bg-muted"
          placeholder="Select a category to auto-generate"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="buying_price">Buying Price (KSH)</Label>
          <Input
            id="buying_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.buying_price === 0 ? '' : formData.buying_price}
            onChange={(e) => setFormData({ ...formData, buying_price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="selling_price">Selling Price (KSH)</Label>
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

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {product ? 'Update Product' : 'Add Product'}
        </Button>
      </div>
    </form>
  );
}

export default function Products() {
  const { isOwner } = useAuth();
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => { if (p.category) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async (data: ProductInsert) => {
    try {
      await createProduct.mutateAsync(data);
      toast.success('Product added successfully');
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to add product');
    }
  };

  const handleUpdate = async (data: ProductInsert) => {
    if (!editingProduct) return;
    try {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
      toast.success('Product updated successfully');
      setEditingProduct(null);
    } catch (error) {
      toast.error('Failed to update product');
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    try {
      await deleteProduct.mutateAsync(deletingProduct.id);
      toast.success('Product deleted successfully');
      setDeletingProduct(null);
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            {isOwner ? 'Manage your product inventory' : 'View available stock'}
          </p>
        </div>

        {isOwner && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <ProductForm
                onSubmit={handleCreate}
                onCancel={() => setIsDialogOpen(false)}
                isLoading={createProduct.isPending}
                existingCategories={existingCategories}
                allProducts={products}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">No products found</p>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'Add your first product to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const isLowStock = product.stock_quantity <= product.minimum_stock_level;
            
            return (
              <Card key={product.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      {product.sku && (
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      )}
                    </div>
                    {isOwner && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingProduct(product)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Stock</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{product.stock_quantity}</span>
                        {isLowStock && (
                          <Badge variant="outline" className="low-stock-badge">
                            Low
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Selling Price</span>
                      <span className="font-semibold text-primary">
                        KSH {Number(product.selling_price).toFixed(2)}
                      </span>
                    </div>
                    {isOwner && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Buying Price</span>
                        <span className="text-muted-foreground">
                          KSH {Number(product.buying_price).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {product.category && (
                      <Badge variant="secondary" className="mt-2">
                        {product.category}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <ProductForm
              product={editingProduct}
              onSubmit={handleUpdate}
              onCancel={() => setEditingProduct(null)}
              isLoading={updateProduct.isPending}
              existingCategories={existingCategories}
              allProducts={products}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
