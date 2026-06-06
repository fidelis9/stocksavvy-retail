import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Package,
  BarChart3,
  Users,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from 'lucide-react';

const features = [
  {
    icon: Package,
    title: 'Inventory Tracking',
    description: 'Monitor stock levels, SKUs, and product details in real time.',
  },
  {
    icon: BarChart3,
    title: 'Sales & Reports',
    description: 'Record transactions and view revenue, profit, and trends.',
  },
  {
    icon: Users,
    title: 'Team Access',
    description: 'Owner and Attendant roles with clear permission boundaries.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & Reliable',
    description: 'Built-in authentication, role management, and data protection.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">StockFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
              Log In
            </Button>
            <Button size="sm" onClick={() => navigate('/auth?tab=signup')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Inventory Management for Small Retail
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Run your shop with{' '}
            <span className="text-primary">confidence</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground sm:text-lg">
            Track stock, record sales, manage users, and view reports — all in one simple, fast system built for Kenyan small businesses.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={() => navigate('/auth?tab=signup')} className="gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            First user becomes Owner. Up to 3 team members.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/50 px-4 py-16">
        <div className="container mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-foreground">
            Everything you need to manage inventory
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1 font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-6">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 sm:flex-row">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">StockFlow</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built for small retail businesses in Kenya.
          </p>
        </div>
      </footer>
    </div>
  );
}
