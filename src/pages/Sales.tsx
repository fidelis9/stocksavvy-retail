import { useState, useMemo } from 'react';
import { useProducts, type Product } from '@/hooks/useProducts';
import { useCreateSale, type SaleItem } from '@/hooks/useSales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

export default function Sales() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const createSale = useCreateSale();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const availableProducts = products.filter(p => p.stock_quantity > 0);
  
  const filteredProducts = useMemo(() => {
    const filtered = availableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered;
  }, [availableProducts, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total_price, 0);

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
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
        if (quantity > item.product.stock_quantity) {
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
          <p className="text-muted-foreground">Select products to add to cart</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
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
              <p className="mt-4 text-lg font-medium">No products available</p>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try a different search' : 'All products are out of stock'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => {
                  const cartItem = cart.find(item => item.product_id === product.id);
                  const inCart = !!cartItem;

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
                      <TableCell className="text-right font-semibold text-primary">
                        KSH {Number(product.selling_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{product.stock_quantity}</Badge>
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
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
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
                Cart is empty. Select products to add.
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
