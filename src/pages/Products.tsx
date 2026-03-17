import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, isStockTracked, type Product, type ProductInsert, type ProductType } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import ProductForm from '@/components/products/ProductForm';

const TYPE_LABELS: Record<ProductType, string> = {
  product: 'Product',
  printing: 'Printing',
  service: 'Service',
};

const TYPE_COLORS: Record<ProductType, string> = {
  product: 'default',
  printing: 'secondary',
  service: 'outline',
};

export default function Products() {
  const { isOwner } = useAuth();
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => { if (p.category) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || p.product_type === filterType;
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [products, searchQuery, filterType, filterCategory]);

  const handleCreate = async (data: ProductInsert) => {
    try {
      await createProduct.mutateAsync(data);
      toast.success('Item added successfully');
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const handleUpdate = async (data: ProductInsert) => {
    if (!editingProduct) return;
    try {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
      toast.success('Item updated successfully');
      setEditingProduct(null);
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    try {
      await deleteProduct.mutateAsync(deletingProduct.id);
      toast.success('Item deleted successfully');
      setDeletingProduct(null);
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products & Services</h1>
          <p className="text-muted-foreground">
            {isOwner ? 'Manage your inventory, printing & services' : 'View available items'}
          </p>
        </div>

        {isOwner && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
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

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="printing">Printing</SelectItem>
            <SelectItem value="service">Service</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {existingCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            <p className="mt-4 text-lg font-medium">No items found</p>
            <p className="text-muted-foreground">
              {searchQuery || filterType !== 'all' || filterCategory !== 'all' ? 'Try different filters' : 'Add your first item to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const tracked = isStockTracked(product.product_type);
            const isLowStock = tracked && product.stock_quantity <= product.minimum_stock_level;

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
                    {tracked ? (
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
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Fulfillment</span>
                        <span className="text-sm font-medium text-muted-foreground">On-demand</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {tracked ? 'Selling Price' : 'Price per Unit'}
                      </span>
                      <span className="font-semibold text-primary">
                        KSH {Number(product.selling_price).toFixed(2)}
                      </span>
                    </div>
                    {isOwner && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {tracked ? 'Buying Price' : 'Cost per Unit'}
                        </span>
                        <span className="text-muted-foreground">
                          KSH {Number(product.buying_price).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant={TYPE_COLORS[product.product_type] as any}>
                        {TYPE_LABELS[product.product_type]}
                      </Badge>
                      {product.category && (
                        <Badge variant="secondary">
                          {product.category}
                        </Badge>
                      )}
                      {product.unit && (
                        <Badge variant="outline" className="text-xs">
                          per {product.unit}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
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
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
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
