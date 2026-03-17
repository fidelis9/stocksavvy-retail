import { useState, useMemo } from 'react';
import { useProducts, isStockTracked, type Product, type ProductType } from '@/hooks/useProducts';
import { useCreateSale, type SaleItem } from '@/hooks/useSales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle, 
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface CartItem extends SaleItem {
  product: Product;
}

const ITEMS_PER_PAGE = 10;

const TYPE_LABELS: Record<ProductType, string> = {
  product: 'Product',
  printing: 'Printing',
  service: 'Service',
};

export default function Sales() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const createSale = useCreateSale();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Show all products; for 'product' type, only those with stock > 0
  const availableProducts = products.filter(p => 
    !isStockTracked(p.product_type) || p.stock_quantity > 0
  );

  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    availableProducts.forEach((p) => { if (p.category) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [availableProducts]);
  
  const filteredProducts = useMemo(() => {
    return availableProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || p.product_type === filterType;
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [availableProducts, searchQuery, filterType, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total_price, 0);

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    const tracked = isStockTracked(product.product_type);
    
    if (existingItem) {
      if (tracked && existingItem.quantity >= product.stock_quantity) {
        toast.error('Not enough stock available');
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, {
        product_id: product.id,
        quantity: 1,
        unit_price: Number(product.selling_price),
        total_price: Number(product.selling_price),
        product,
      }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const tracked = isStockTracked(item.product.product_type);
        if (tracked && quantity > item.product.stock_quantity) {
          toast.error('Not enough stock available');
          return item;
        }
        return {
          ...item,
          quantity,
          total_price: item.unit_price * quantity,
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      const saleItems: SaleItem[] = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      await createSale.mutateAsync(saleItems);
      toast.success(`Sale completed! Total: KSH ${cartTotal.toFixed(2)}`);
      setCart([]);
    } catch (error) {
      toast.error('Failed to complete sale');
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row animate-fade-in">
      {/* Products Section */}
      <div className="flex-1 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">New Sale</h1>
          <p className="text-muted-foreground">Select items to add to cart</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="printing">Printing</SelectItem>
              <SelectItem value="service">Service</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
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

        {/* Products Table */}
        {loadingProducts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No items available</p>
              <p className="text-muted-foreground">
                {searchQuery || filterType !== 'all' || filterCategory !== 'all' ? 'Try different filters' : 'All products are out of stock'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => {
                  const cartItem = cart.find(item => item.product_id === product.id);
                  const inCart = !!cartItem;
                  const tracked = isStockTracked(product.product_type);

                  return (
                    <TableRow
                      key={product.id}
                      className={`cursor-pointer ${inCart ? 'bg-primary/5' : ''}`}
                      onClick={() => addToCart(product)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.unit && (
                            <span className="text-xs text-muted-foreground">per {product.unit}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABELS[product.product_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        KSH {Number(product.selling_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {tracked ? (
                          <Badge variant="secondary">{product.stock_quantity}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">∞</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {inCart ? (
                          <Badge variant="default">
                            {cartItem.quantity} {product.unit ? `${product.unit}${cartItem.quantity !== 1 ? 's' : ''}` : 'in cart'}
                          </Badge>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Cart Section */}
      <div className="lg:w-96">
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Cart is empty. Select items to add.
              </p>
            ) : (
              <>
                <div className="max-h-[400px] space-y-3 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product_id} className="sale-item">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            KSH {item.unit_price.toFixed(2)} {item.product.unit ? `per ${item.product.unit}` : 'each'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeFromCart(item.product_id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(item.product_id, item.quantity - 1);
                            }}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="text-center">
                            <span className="w-8 font-medium">{item.quantity}</span>
                            {item.product.unit && (
                              <span className="ml-1 text-xs text-muted-foreground">{item.product.unit}{item.quantity !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(item.product_id, item.quantity + 1);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="font-semibold">KSH {item.total_price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">KSH {cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={completeSale}
                  disabled={createSale.isPending}
                >
                  {createSale.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Complete Sale
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
