import { Link } from 'react-router-dom';
import { MapPin, Phone, User } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
  useCollectionStaff,
  useHomeCollections,
  useUpdateCollection,
  type CollectionStatus,
  type HomeCollectionRow,
} from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';

const stages: Array<{ key: CollectionStatus; label: string; tone: 'destructive' | 'secondary' | 'default' | 'success' | 'verified' }> = [
  { key: 'not_assigned', label: 'Awaiting assignment', tone: 'destructive' },
  { key: 'assigned', label: 'Assigned', tone: 'secondary' },
  { key: 'en_route', label: 'En route', tone: 'default' },
  { key: 'collected', label: 'Collected', tone: 'success' },
  { key: 'received_at_lab', label: 'At lab', tone: 'verified' },
];

function CollectionCard({ booking }: { booking: HomeCollectionRow }) {
  const { data: staff = [] } = useCollectionStaff();
  const update = useUpdateCollection(booking.id);

  return (
    <Card>
      <CardContent className="space-y-2 p-3 text-xs">
        <Link
          to={`/admin/bookings/${booking.id}`}
          className="font-mono text-[11px] text-primary hover:underline"
        >
          {booking.booking_code}
        </Link>
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {booking.patient_snapshot?.first_name} {booking.patient_snapshot?.last_name}
        </div>
        {booking.patient_snapshot?.mobile && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Phone className="h-3 w-3" />
            {booking.patient_snapshot.mobile}
          </div>
        )}
        {booking.delivery_address && (
          <div className="flex items-start gap-1 text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              {[booking.delivery_address.line1, booking.delivery_address.pincode]
                .filter(Boolean)
                .join(' — ')}
            </span>
          </div>
        )}
        <div className="text-muted-foreground">
          {booking.scheduled_date}
          {booking.scheduled_start_time &&
            ` ${booking.scheduled_start_time.slice(0, 5)}`}
        </div>
        <div className="font-semibold">
          {formatCurrencyINR(Number(booking.total_amount))}
        </div>

        {booking.collection_status === 'not_assigned' ? (
          <select
            defaultValue=""
            disabled={update.isPending}
            onChange={(e) =>
              e.target.value &&
              update.mutate({
                collection_status: 'assigned',
                assigned_staff_user_id: e.target.value,
              })
            }
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="">Assign staff…</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          booking.assigned_staff_name && (
            <Badge variant="outline" className="text-[10px]">
              {booking.assigned_staff_name}
            </Badge>
          )
        )}

        {booking.collection_status === 'assigned' && (
          <Button
            size="sm"
            className="w-full"
            disabled={update.isPending}
            onClick={() => update.mutate({ collection_status: 'en_route' })}
          >
            Mark en route
          </Button>
        )}
        {booking.collection_status === 'en_route' && (
          <Button
            size="sm"
            className="w-full"
            disabled={update.isPending}
            onClick={() => update.mutate({ collection_status: 'collected' })}
          >
            Mark collected
          </Button>
        )}
        {booking.collection_status === 'collected' && (
          <Button
            size="sm"
            className="w-full"
            disabled={update.isPending}
            onClick={() => update.mutate({ collection_status: 'received_at_lab' })}
          >
            Received at lab
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function HomeCollectionBoardPage() {
  const { data: bookings = [], isLoading } = useHomeCollections();

  const byStage = stages.map((stage) => ({
    ...stage,
    bookings: bookings.filter((b) => b.collection_status === stage.key),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Home Collection Dispatch</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? 'Loading…'
            : `${bookings.length} active home-collection booking(s). Auto-refreshes every 30s.`}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {byStage.map((column) => (
            <div key={column.key}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{column.label}</h3>
                <Badge variant={column.tone}>{column.bookings.length}</Badge>
              </div>
              <div className="space-y-2">
                {column.bookings.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                ) : (
                  column.bookings.map((b) => <CollectionCard key={b.id} booking={b} />)
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
