import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { TrendingUp, Download } from 'lucide-react';
import { mockBookings } from '../../lib/mockPhase2';
import { formatCurrencyINR } from '../../lib/utils';

export default function AdminAnalyticsPage() {
  const totalBookings = mockBookings.length;
  const totalRevenue = mockBookings.reduce((s, b) => s + b.advance_amount, 0);
  const onlineBookings = mockBookings.filter((b) => b.booking_origin === 'online').length;
  const walkInBookings = mockBookings.filter((b) => b.booking_origin === 'walk_in').length;
  const homeCollections = mockBookings.filter((b) => b.visit_type === 'home_visit').length;

  // Top tests by frequency
  const itemCounts = new Map<string, number>();
  for (const b of mockBookings) {
    for (const i of b.items) {
      itemCounts.set(i.item_name, (itemCounts.get(i.item_name) ?? 0) + i.quantity);
    }
  }
  const topTests = Array.from(itemCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue, bookings, and operational metrics
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Total bookings</div>
            <div className="mt-1 text-3xl font-bold">{totalBookings}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-green-700">
              <TrendingUp className="h-3 w-3" /> +18% vs last month
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Total revenue</div>
            <div className="mt-1 text-3xl font-bold">{formatCurrencyINR(totalRevenue)}</div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-green-700">
              <TrendingUp className="h-3 w-3" /> +12% vs last month
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Online vs walk-in</div>
            <div className="mt-1 text-3xl font-bold">
              {onlineBookings}/{walkInBookings}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {Math.round((onlineBookings / totalBookings) * 100)}% online
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Home collections</div>
            <div className="mt-1 text-3xl font-bold">{homeCollections}</div>
            <div className="mt-1 text-xs text-muted-foreground">of {totalBookings} bookings</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top tests / services</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {topTests.map(([name, count], i) => (
                <li key={name} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    {name}
                  </span>
                  <span className="text-muted-foreground">{count} bookings</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue trend (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end justify-between gap-2">
              {[35, 50, 42, 70, 60, 80, 65].map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/80"
                    style={{ height: `${h}%` }}
                    title={`Day ${i + 1}: ₹${h * 100}`}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Full charting will use Recharts once wired to live Supabase data.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
