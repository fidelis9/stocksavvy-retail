import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FileText, 
  Users, 
  LogOut, 
  TrendingDown,
  Wallet,
  Menu,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const ownerNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/sales', label: 'Sales', icon: ShoppingCart },
  { path: '/stock-adjustments', label: 'Adjustments', icon: TrendingDown },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/finance', label: 'Finance', icon: Wallet },
  { path: '/users', label: 'Users', icon: Users },
];

const attendantNavItems = [
  { path: '/', label: 'New Sale', icon: ShoppingCart },
  { path: '/products', label: 'Stock', icon: Package },
];

export default function Sidebar() {
  const location = useLocation();
  const { signOut, isOwner, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = isOwner ? ownerNavItems : attendantNavItems;

  return (
    <>
      {/* Mobile header */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center border-b bg-card px-4 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Package className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="ml-3 flex-1 truncate font-semibold">StockFlow</span>
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar - always visible on desktop */}
      <aside
        className={cn(
          "fixed left-0 top-14 z-50 flex h-[calc(100%-3.5rem)] w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:top-0 lg:h-full lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Desktop header */}
        <div className="hidden h-16 items-center gap-3 border-b border-sidebar-border px-4 lg:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">StockFlow</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-3 rounded-lg bg-sidebar-accent/50 px-3 py-2">
            <p className="text-xs text-sidebar-foreground/70">Signed in as</p>
            <p className="truncate text-sm font-medium">{user?.email}</p>
            <span className="mt-1 inline-block rounded bg-sidebar-primary/20 px-2 py-0.5 text-xs font-medium text-sidebar-primary">
              {isOwner ? 'Owner' : 'Attendant'}
            </span>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            <span className="ml-3">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
