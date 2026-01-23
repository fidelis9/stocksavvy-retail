import { useAuth } from '@/contexts/AuthContext';
import { useProducts, useLowStockProducts } from '@/hooks/useProducts';
import { useTodaySales } from '@/hooks/useSales';
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  variant = 'default' 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'success' | 'warning' | 'info';
}) {
  const variantStyles = {
    default: 'bg-card',
    success: 'bg-success/5 border-success/20',
    warning: 'bg-warning/5 border-warning/20',
    info: 'bg-info/5 border-info/20',
  };
  
  const iconStyles = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
  };

  return (
    <Card className={`${variantStyles[variant]} transition-all hover:shadow-md`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-lg p-3 ${iconStyles[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { isOwner } = useAuth();
  const { data: products = [] } = useProducts();
  const { data: lowStockProducts = [] } = useLowStockProducts();
  const { data: todaySales = [] } = useTodaySales();

  const todayRevenue = todaySales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your store's performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={todaySales.length}
          subtitle={`$${todayRevenue.toFixed(2)} revenue`}
          icon={ShoppingCart}
          variant="success"
        />
        <StatCard
          title="Today's Revenue"
          value={`$${todayRevenue.toFixed(2)}`}
          icon={DollarSign}
          variant="info"
        />
        <StatCard
          title="Total Products"
          value={totalProducts}
          subtitle={`${totalStock} items in stock`}
          icon={Package}
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockProducts.length}
          subtitle={lowStockProducts.length > 0 ? 'Items need restocking' : 'All items stocked'}
          icon={AlertTriangle}
          variant={lowStockProducts.length > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                All products are well stocked! ✓
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Min: {product.minimum_stock_level}
                      </p>
                    </div>
                    <Badge variant="outline" className="low-stock-badge">
                      {product.stock_quantity} left
                    </Badge>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground">
                    +{lowStockProducts.length - 5} more items
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-success" />
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaySales.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No sales recorded today
              </p>
            ) : (
              <div className="space-y-3">
                {todaySales.slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">${Number(sale.total_amount).toFixed(2)}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(sale.sale_date), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {sale.sale_items?.length || 0} items
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sale.profiles?.full_name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
