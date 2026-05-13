import { useState } from 'react';
import { CheckCircle2, X, Star, MessageSquareReply } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { mockReviews, type MockReview } from '../../lib/mockData';

interface Review extends MockReview {
  status: 'pending' | 'approved' | 'rejected';
  clinic_reply?: string;
}

const initial: Review[] = [
  ...mockReviews.map((r) => ({ ...r, status: 'approved' as const })),
  {
    id: 100,
    patient_first_name: 'Mohit',
    rating: 5,
    comment: 'Doctor was very patient and gave a thorough explanation. Highly recommend.',
    created_at: new Date().toISOString(),
    status: 'pending' as const,
  },
  {
    id: 101,
    patient_first_name: 'Anonymous',
    rating: 2,
    comment: 'Waited 30 minutes past my slot. Please respect appointment times.',
    created_at: new Date().toISOString(),
    status: 'pending' as const,
  },
];

export default function AdminFeedbackPage() {
  const [reviews, setReviews] = useState<Review[]>(initial);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [replyText, setReplyText] = useState<Record<number, string>>({});

  const filtered = reviews.filter((r) => r.status === tab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feedback Moderation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve, reject, and respond to patient reviews
        </p>
      </div>

      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected'] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)} ({reviews.filter((r) => r.status === t).length})
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No reviews in this queue.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{r.patient_first_name}</div>
                      <div className="flex">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={
                              i < r.rating
                                ? 'h-4 w-4 fill-yellow-400 text-yellow-400'
                                : 'h-4 w-4 fill-muted text-muted-foreground/40'
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-sm">{r.comment}</p>
                    {r.clinic_reply && (
                      <div className="mt-2 rounded-md bg-accent p-3 text-sm">
                        <div className="text-xs font-semibold text-primary">Clinic reply</div>
                        <p className="mt-1">{r.clinic_reply}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {r.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            setReviews((prev) =>
                              prev.map((x) => (x.id === r.id ? { ...x, status: 'approved' } : x)),
                            )
                          }
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setReviews((prev) =>
                              prev.map((x) => (x.id === r.id ? { ...x, status: 'rejected' } : x)),
                            )
                          }
                        >
                          <X className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {r.status === 'approved' && !r.clinic_reply && (
                      <Badge variant="success">Published</Badge>
                    )}
                  </div>
                </div>

                {r.status === 'approved' && !r.clinic_reply && (
                  <div className="mt-3 flex gap-2">
                    <Textarea
                      placeholder="Post a clinic response..."
                      value={replyText[r.id] ?? ''}
                      onChange={(e) => setReplyText({ ...replyText, [r.id]: e.target.value })}
                      rows={2}
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        setReviews((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, clinic_reply: replyText[r.id] } : x,
                          ),
                        )
                      }
                      disabled={!replyText[r.id]}
                    >
                      <MessageSquareReply className="mr-1 h-3.5 w-3.5" /> Reply
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
