import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Heart,
  CalendarIcon,
  Loader2,
  Download,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Finance() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Fetch sales with items and product buying prices
  const { data: salesData = [], isLoading } = useQuery({
    queryKey: ['finance-sales', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data: sales, error } = await supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          sale_date,
          created_at,
          sale_items (
            id,
            quantity,
            unit_price,
            total_price,
            product_id
          )
        `)
        .gte('sale_date', dateRange.from.toISOString())
        .lte('sale_date', dateRange.to.toISOString())
        .order('sale_date', { ascending: false });

      if (error) throw error;

      // Fetch all products to get buying prices
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name, buying_price, selling_price');

      if (prodError) throw prodError;

      const productMap = new Map(products.map((p) => [p.id, p]));

      return (sales || []).map((sale) => {
        const items = (sale.sale_items || []).map((item: any) => {
          const product = productMap.get(item.product_id);
          return {
            ...item,
            product_name: product?.name || 'Unknown',
            buying_price: product?.buying_price || 0,
            cost: (product?.buying_price || 0) * item.quantity,
          };
        });

        const totalCost = items.reduce((sum: number, item: any) => sum + item.cost, 0);
        const totalRevenue = sale.total_amount;
        const profit = totalRevenue - totalCost;

        return {
          ...sale,
          items,
          totalCost,
          totalRevenue,
          profit,
        };
      });
    },
  });

  const summary = useMemo(() => {
    const totalRevenue = salesData.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalCost = salesData.reduce((sum, s) => sum + s.totalCost, 0);
    const totalProfit = totalRevenue - totalCost;
    const tithe = totalProfit > 0 ? totalProfit * 0.1 : 0;
    const netAfterTithe = totalProfit - tithe;

    return { totalRevenue, totalCost, totalProfit, tithe, netAfterTithe, salesCount: salesData.length };
  }, [salesData]);

  const exportFinanceCSV = () => {
    const headers = ['Date', 'Revenue', 'Cost', 'Profit'];
    const rows = salesData.map((s) => [
      format(new Date(s.sale_date), 'yyyy-MM-dd HH:mm'),
      s.totalRevenue.toFixed(2),
      s.totalCost.toFixed(2),
      s.profit.toFixed(2),
    ]);

    rows.push([]);
    rows.push(['TOTALS', summary.totalRevenue.toFixed(2), summary.totalCost.toFixed(2), summary.totalProfit.toFixed(2)]);
    rows.push(['10% Tithe', '', '', summary.tithe.toFixed(2)]);
    rows.push(['Net After Tithe', '', '', summary.netAfterTithe.toFixed(2)]);

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-report-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-muted-foreground">Track revenue, costs, profits &amp; tithe</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, 'MMM d')} – {format(dateRange.to, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  } else if (range?.from) {
                    setDateRange({ from: range.from, to: range.from });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={exportFinanceCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold">
                KSh {summary.totalRevenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-destructive/10 p-3">
              <TrendingDown className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold">
                KSh {summary.totalCost.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
              <p className={cn("text-2xl font-bold", summary.totalProfit < 0 && "text-destructive")}>
                KSh {summary.totalProfit.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">10% Tithe</p>
              <p className="text-2xl font-bold text-primary">
                KSh {summary.tithe.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Net (After Tithe)</p>
              <p className="text-2xl font-bold">
                KSh {summary.netAfterTithe.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Breakdown ({summary.salesCount} sales)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : salesData.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              No sales found for this period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData.map((sale) => {
                    const margin =
                      sale.totalRevenue > 0
                        ? ((sale.profit / sale.totalRevenue) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(sale.sale_date), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {sale.items.slice(0, 3).map((item: any) => (
                              <Badge key={item.id} variant="secondary" className="text-xs">
                                {item.product_name} ×{item.quantity}
                              </Badge>
                            ))}
                            {sale.items.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{sale.items.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          KSh {sale.totalRevenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          KSh {sale.totalCost.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-medium',
                            sale.profit < 0 ? 'text-destructive' : 'text-primary'
                          )}
                        >
                          KSh {sale.profit.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">{margin}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tithe Summary Card */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Tithe Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Total Profit</p>
              <p className="text-xl font-bold">
                KSh {summary.totalProfit.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-4">
              <p className="text-sm text-muted-foreground">10% Tithe Amount</p>
              <p className="text-xl font-bold text-primary">
                KSh {summary.tithe.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Remaining After Tithe</p>
              <p className="text-xl font-bold">
                KSh {summary.netAfterTithe.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
