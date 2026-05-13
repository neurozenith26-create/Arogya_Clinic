import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Trash2, Minus, Plus, ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { formatCurrencyINR } from '../../lib/utils';
import { CLINIC_FULL_NAME } from '../../config/featureFlags';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  if (items.length === 0) {
    return (
      <>
        <Helmet>
          <title>Cart — {CLINIC_FULL_NAME}</title>
        </Helmet>
        <section className="container py-16 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">
            Browse our tests and packages to add them to your cart.
          </p>
          <Button asChild className="mt-6">
            <Link to="/services">Browse services</Link>
          </Button>
        </section>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Cart — {CLINIC_FULL_NAME}</title>
      </Helmet>

      <section className="container py-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/services">
            <ArrowLeft className="mr-1 h-4 w-4" /> Continue shopping
          </Link>
        </Button>
      </section>

      <section className="container pb-16">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Your Cart</h1>
        <p className="mt-1 text-sm text-muted-foreground">{items.length} item(s) in cart</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => (
              <Card key={item.service_id}>
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      {item.is_package && <Badge>Package</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.category_name}
                      {item.sample_type && ` · Sample: ${item.sample_type}`}
                      {` · ${item.report_turnaround_hours}h report`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.service_id, item.quantity - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <div className="w-8 text-center text-sm font-medium">{item.quantity}</div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.service_id, item.quantity + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="w-24 text-right font-semibold text-primary">
                    {formatCurrencyINR(item.price * item.quantity)}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.service_id)}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="sticky top-24 h-fit">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrencyINR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Home visit charge</span>
                <span className="text-muted-foreground">Calculated at checkout</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrencyINR(subtotal)}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Pay 50% advance now: {formatCurrencyINR(Math.round(subtotal / 2))}
                </div>
              </div>
              <Button asChild className="w-full" size="lg">
                <Link to="/book/test">Proceed to Booking</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
