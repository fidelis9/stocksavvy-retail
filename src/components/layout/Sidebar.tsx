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
  ChevronLeft,
  Menu
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
  { path: '/users', label: 'Users', icon: Users },
];

const attendantNavItems = [
  { path: '/', label: 'New Sale', icon: ShoppingCart },
  { path: '/products', label: 'Stock', icon: Package },
];

export default function Sidebar() {
  const location = useLocation();
  const { signOut, isOwner, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = isOwner ? ownerNavItems : attendantNavItems;

  return (
    <>
      {/* Mobile header */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center border-b bg-card px-4 lg:hidden">
        <span className="flex-1 font-semibold">StockFlow</span>
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 lg:static",
          collapsed ? "w-0 lg:w-16 -translate-x-full lg:translate-x-0" : "w-64"
        )}
      >
        {/* Header - hidden on mobile since we have mobile header */}
        <div className="hidden h-16 items-center justify-between border-b border-sidebar-border px-4 lg:flex">
          <div className={cn("flex items-center gap-3", collapsed && "lg:justify-center")}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
              <Package className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-sidebar-foreground">StockFlow</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setCollapsed(true)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          {!collapsed && (
            <div className="mb-3 rounded-lg bg-sidebar-accent/50 px-3 py-2">
              <p className="text-xs text-sidebar-foreground/70">Signed in as</p>
              <p className="truncate text-sm font-medium">{user?.email}</p>
              <span className="mt-1 inline-block rounded bg-sidebar-primary/20 px-2 py-0.5 text-xs font-medium text-sidebar-primary">
                {isOwner ? 'Owner' : 'Attendant'}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "justify-center px-2"
            )}
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="ml-3">Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
