import { useState } from 'react';
import { Mail, Phone, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Enquiry {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'closed';
  created_at: string;
}

const seedEnquiries: Enquiry[] = [
  {
    id: 1,
    name: 'Rohit Kumar',
    email: 'rohit@example.com',
    phone: '9876543210',
    subject: 'Pricing for full-body checkup?',
    message: 'Hi, can you share the pricing for a comprehensive health package for a 45-year-old male? Thanks.',
    status: 'new',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    name: 'Priya Saha',
    phone: '9988776655',
    subject: 'Home collection in New Town?',
    message: 'Do you do home sample collection in Action Area II, New Town? Pincode 700156.',
    status: 'new',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 3,
    name: 'Anil Verma',
    email: 'anil.v@example.com',
    subject: 'Holter monitoring availability',
    message: 'My cardiologist asked for a 24-hour Holter test. What is the cost and when can I come?',
    status: 'replied',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(seedEnquiries);

  const updateStatus = (id: number, status: Enquiry['status']) =>
    setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contact form submissions from the public website
        </p>
      </div>

      <div className="space-y-3">
        {enquiries.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{e.name}</div>
                    <Badge
                      variant={
                        e.status === 'new'
                          ? 'destructive'
                          : e.status === 'replied'
                            ? 'success'
                            : 'secondary'
                      }
                    >
                      {e.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {e.subject && <div className="mt-1 font-medium">{e.subject}</div>}
                  <p className="mt-1 text-sm text-muted-foreground">{e.message}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {e.email && (
                      <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1 hover:text-primary">
                        <Mail className="h-3 w-3" /> {e.email}
                      </a>
                    )}
                    {e.phone && (
                      <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                        <Phone className="h-3 w-3" /> {e.phone}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {e.status === 'new' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(e.id, 'read')}>
                      Mark read
                    </Button>
                  )}
                  {e.email && (
                    <Button asChild size="sm">
                      <a href={`mailto:${e.email}`}>
                        <ExternalLink className="mr-1 h-3.5 w-3.5" /> Reply
                      </a>
                    </Button>
                  )}
                  {e.status !== 'closed' && (
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(e.id, 'closed')}>
                      Close
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
