import { ExternalLink, Mail, Phone } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import {
  useAdminEnquiries,
  useUpdateEnquiry,
  type AdminEnquiryRow,
} from '../../hooks/queries';

function EnquiryCard({ enquiry }: { enquiry: AdminEnquiryRow }) {
  const update = useUpdateEnquiry();
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-semibold">{enquiry.name}</div>
              <Badge
                variant={
                  enquiry.status === 'new'
                    ? 'destructive'
                    : enquiry.status === 'replied'
                      ? 'success'
                      : 'secondary'
                }
              >
                {enquiry.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(enquiry.created_at), { addSuffix: true })}
              </span>
            </div>
            {enquiry.subject && <div className="mt-1 font-medium">{enquiry.subject}</div>}
            <p className="mt-1 text-sm text-muted-foreground">{enquiry.message}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {enquiry.email && (
                <a
                  href={`mailto:${enquiry.email}`}
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  <Mail className="h-3 w-3" /> {enquiry.email}
                </a>
              )}
              {enquiry.phone && (
                <a
                  href={`tel:${enquiry.phone}`}
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  <Phone className="h-3 w-3" /> {enquiry.phone}
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {enquiry.status === 'new' && (
              <Button
                size="sm"
                variant="outline"
                disabled={update.isPending}
                onClick={() => update.mutate({ id: enquiry.id, status: 'read' })}
              >
                Mark read
              </Button>
            )}
            {enquiry.email && (
              <Button asChild size="sm">
                <a
                  href={`mailto:${enquiry.email}`}
                  onClick={() => update.mutate({ id: enquiry.id, status: 'replied' })}
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> Reply
                </a>
              </Button>
            )}
            {enquiry.status !== 'closed' && (
              <Button
                size="sm"
                variant="ghost"
                disabled={update.isPending}
                onClick={() => update.mutate({ id: enquiry.id, status: 'closed' })}
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminEnquiriesPage() {
  const { data: enquiries = [], isLoading } = useAdminEnquiries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? 'Loading…'
            : `${enquiries.length} contact-form submission(s) from the public website.`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : enquiries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No enquiries yet. Submissions from the public Contact form will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {enquiries.map((e) => (
            <EnquiryCard key={e.id} enquiry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
