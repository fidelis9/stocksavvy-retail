import { useState } from 'react';
import { useProducts, type Product } from '@/hooks/useProducts';
import { useCreateSale, type SaleItem } from '@/hooks/useSales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle, 
  Loader2,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

interface CartItem extends SaleItem {
  product: Product;
}

export default function Sales() {
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const createSale = useCreateSale();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const availableProducts = products.filter(p => p.stock_quantity > 0);
  
  const filteredProducts = availableProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      toast.success(`Sale completed! Total: $${cartTotal.toFixed(2)}`);
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
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Products Grid */}
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const cartItem = cart.find(item => item.product_id === product.id);
              const inCart = !!cartItem;
              
              return (
                <Card
                  key={product.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${inCart ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-lg font-bold text-primary">
                          ${Number(product.selling_price).toFixed(2)}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {product.stock_quantity} in stock
                      </Badge>
                    </div>
                    {inCart && (
                      <div className="mt-2 flex items-center justify-between rounded bg-primary/10 px-2 py-1">
                        <span className="text-sm font-medium text-primary">
                          {cartItem.quantity} in cart
                        </span>
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
                            ${item.unit_price.toFixed(2)} each
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
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
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
                        <p className="font-semibold">${item.total_price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">${cartTotal.toFixed(2)}</span>
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
