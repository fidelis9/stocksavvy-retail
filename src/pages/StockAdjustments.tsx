import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useStockAdjustments, useCreateStockAdjustment, type StockAdjustmentInsert } from '@/hooks/useStockAdjustments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, TrendingUp, TrendingDown, Loader2, Package } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const adjustmentTypes = [
  { value: 'delivery', label: 'New Delivery', positive: true },
  { value: 'damaged', label: 'Damaged', positive: false },
  { value: 'expired', label: 'Expired', positive: false },
  { value: 'theft', label: 'Theft/Loss', positive: false },
  { value: 'correction', label: 'Correction', positive: null },
] as const;

export default function StockAdjustments() {
  const { data: products = [] } = useProducts();
  const { data: adjustments = [], isLoading } = useStockAdjustments();
  const createAdjustment = useCreateStockAdjustment();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<{
    product_id: string;
    adjustment_type: StockAdjustmentInsert['adjustment_type'];
    quantity: number;
    reason: string;
  }>({
    product_id: '',
    adjustment_type: 'delivery',
    quantity: 0,
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_id) {
      toast.error('Please select a product');
      return;
    }
    
    if (formData.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    try {
      const type = adjustmentTypes.find(t => t.value === formData.adjustment_type);
      const quantityChange = type?.positive === false 
        ? -Math.abs(formData.quantity) 
        : formData.quantity;

      await createAdjustment.mutateAsync({
        product_id: formData.product_id,
        adjustment_type: formData.adjustment_type,
        quantity_change: quantityChange,
        reason: formData.reason || undefined,
      });

      toast.success('Stock adjustment recorded successfully');
      setIsDialogOpen(false);
      setFormData({
        product_id: '',
        adjustment_type: 'delivery',
        quantity: 0,
        reason: '',
      });
    } catch (error) {
      toast.error('Failed to record adjustment');
    }
  };

  const getAdjustmentBadge = (type: string) => {
    switch (type) {
      case 'delivery':
        return <Badge className="bg-success text-success-foreground">Delivery</Badge>;
      case 'damaged':
        return <Badge variant="destructive">Damaged</Badge>;
      case 'expired':
        return <Badge className="bg-warning text-warning-foreground">Expired</Badge>;
      case 'theft':
        return <Badge variant="destructive">Theft/Loss</Badge>;
      case 'correction':
        return <Badge variant="secondary">Correction</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Adjustments</h1>
          <p className="text-muted-foreground">Record stock changes and deliveries</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Adjustment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Stock Adjustment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (Stock: {product.stock_quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <Select
                  value={formData.adjustment_type}
                  onValueChange={(value: StockAdjustmentInsert['adjustment_type']) => 
                    setFormData({ ...formData, adjustment_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adjustmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  placeholder="Enter quantity"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.adjustment_type === 'delivery' 
                    ? 'This will ADD to current stock'
                    : formData.adjustment_type === 'correction'
                    ? 'Use positive or negative values'
                    : 'This will SUBTRACT from current stock'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Reason / Notes</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Optional: Add notes about this adjustment"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAdjustment.isPending}>
                  {createAdjustment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Adjustment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Adjustments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : adjustments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">No adjustments recorded</p>
            <p className="text-muted-foreground">Record your first stock adjustment</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {adjustments.map((adjustment) => (
                <div
                  key={adjustment.id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${
                      adjustment.quantity_change > 0 
                        ? 'bg-success/10 text-success' 
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {adjustment.quantity_change > 0 
                        ? <TrendingUp className="h-5 w-5" />
                        : <TrendingDown className="h-5 w-5" />
                      }
                    </div>
                    <div>
                      <p className="font-medium">{adjustment.products?.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {getAdjustmentBadge(adjustment.adjustment_type)}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(adjustment.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      {adjustment.reason && (
                        <p className="mt-2 text-sm text-muted-foreground">{adjustment.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      adjustment.quantity_change > 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {adjustment.quantity_change > 0 ? '+' : ''}{adjustment.quantity_change}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      by {adjustment.profiles?.full_name || 'Unknown'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
