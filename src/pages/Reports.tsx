import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useSalesByDateRange } from '@/hooks/useSales';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, FileText, Package, TrendingUp, Loader2 } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Reports() {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: sales = [], isLoading: loadingSales } = useSalesByDateRange(
    startOfDay(dateRange.from),
    endOfDay(dateRange.to)
  );

  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const totalSales = sales.length;
  const totalItems = sales.reduce(
    (sum, sale) => sum + (sale.sale_items?.reduce((s, i) => s + i.quantity, 0) || 0),
    0
  );

  const exportToCSV = (type: 'sales' | 'stock') => {
    let csvContent = '';
    let filename = '';

    if (type === 'sales') {
      csvContent = 'Date,Sale ID,Total Amount,Items,User\n';
      sales.forEach((sale) => {
        csvContent += `${format(new Date(sale.sale_date), 'yyyy-MM-dd HH:mm')},${sale.id},$${Number(sale.total_amount).toFixed(2)},${sale.sale_items?.length || 0},${sale.profiles?.full_name || 'Unknown'}\n`;
      });
      filename = `sales-report-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.csv`;
    } else {
      csvContent = 'Product,SKU,Category,Stock Quantity,Min Level,Buying Price,Selling Price,Stock Value\n';
      products.forEach((product) => {
        const stockValue = product.stock_quantity * Number(product.selling_price);
        csvContent += `"${product.name}",${product.sku || ''},${product.category || ''},${product.stock_quantity},${product.minimum_stock_level},$${Number(product.buying_price).toFixed(2)},$${Number(product.selling_price).toFixed(2)},$${stockValue.toFixed(2)}\n`;
      });
      filename = `stock-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">View sales and stock reports</p>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sales" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Sales Report
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-2">
            <Package className="h-4 w-4" />
            Stock Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          {/* Date Range Picker */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Date Range:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {format(dateRange.from, 'MMM d, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {format(dateRange.to, 'MMM d, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button variant="outline" onClick={() => exportToCSV('sales')}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold text-primary">${totalRevenue.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-3xl font-bold">{totalSales}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Items Sold</p>
                <p className="text-3xl font-bold">{totalItems}</p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sales Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSales ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : sales.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">
                  No sales found for this period
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            {format(new Date(sale.sale_date), 'MMM d, yyyy h:mm a')}
                          </TableCell>
                          <TableCell>
                            {sale.sale_items?.map(item => (
                              <div key={item.id} className="text-sm">
                                {item.products?.name} x{item.quantity}
                              </div>
                            ))}
                          </TableCell>
                          <TableCell>{sale.profiles?.full_name || 'Unknown'}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${Number(sale.total_amount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => exportToCSV('stock')}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Stock Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                <p className="text-3xl font-bold">{products.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Stock</p>
                <p className="text-3xl font-bold">
                  {products.reduce((sum, p) => sum + p.stock_quantity, 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Stock Value</p>
                <p className="text-3xl font-bold text-primary">
                  ${products.reduce((sum, p) => sum + p.stock_quantity * Number(p.selling_price), 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stock Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Current Stock Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Min Level</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => {
                        const isLowStock = product.stock_quantity <= product.minimum_stock_level;
                        const stockValue = product.stock_quantity * Number(product.selling_price);
                        
                        return (
                          <TableRow key={product.id} className={isLowStock ? 'bg-warning/5' : ''}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.sku || '-'}</TableCell>
                            <TableCell>{product.category || '-'}</TableCell>
                            <TableCell className={cn(
                              "text-right font-medium",
                              isLowStock && "text-warning"
                            )}>
                              {product.stock_quantity}
                            </TableCell>
                            <TableCell className="text-right">{product.minimum_stock_level}</TableCell>
                            <TableCell className="text-right">
                              ${Number(product.selling_price).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${stockValue.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
