import { useState } from 'react';
import { CheckCircle2, MessageSquareReply, Star, X } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Skeleton } from '../../components/ui/skeleton';
import {
  useAdminReviews,
  useModerateReview,
  type AdminReviewRow,
} from '../../hooks/queries';
import { format } from 'date-fns';

type Tab = 'pending' | 'approved' | 'rejected';

function ReviewCard({ review }: { review: AdminReviewRow }) {
  const [replyText, setReplyText] = useState(review.clinic_reply ?? '');
  const moderate = useModerateReview();

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">
                {review.patient_first_name ?? 'Anonymous'}
              </div>
              <div className="flex">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={
                      i < review.rating
                        ? 'h-4 w-4 fill-yellow-400 text-yellow-400'
                        : 'h-4 w-4 fill-muted text-muted-foreground/40'
                    }
                  />
                ))}
              </div>
              {review.doctor_name && (
                <Badge variant="outline" className="text-[10px]">
                  for {review.doctor_name}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {format(new Date(review.created_at), 'd MMM yyyy')}
              </span>
            </div>
            <p className="mt-2 text-sm">{review.comment}</p>
            {review.rejection_reason && review.status === 'rejected' && (
              <div className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                Rejected: {review.rejection_reason}
              </div>
            )}
            {review.clinic_reply && (
              <div className="mt-2 rounded-md bg-accent p-3 text-sm">
                <div className="text-xs font-semibold text-primary">Clinic reply</div>
                <p className="mt-1">{review.clinic_reply}</p>
                {review.replied_at && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Replied {format(new Date(review.replied_at), 'd MMM, h:mm a')}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {review.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  disabled={moderate.isPending}
                  onClick={() =>
                    moderate.mutate({ id: review.id, status: 'approved' })
                  }
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={moderate.isPending}
                  onClick={() =>
                    moderate.mutate({
                      id: review.id,
                      status: 'rejected',
                      rejection_reason: 'Inappropriate content',
                    })
                  }
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Reject
                </Button>
              </>
            )}
            {review.status === 'approved' && !review.clinic_reply && (
              <Badge variant="success">Published</Badge>
            )}
            {review.status === 'rejected' && (
              <Button
                size="sm"
                variant="outline"
                disabled={moderate.isPending}
                onClick={() => moderate.mutate({ id: review.id, status: 'approved' })}
              >
                Re-approve
              </Button>
            )}
          </div>
        </div>

        {review.status === 'approved' && !review.clinic_reply && (
          <div className="mt-3 flex gap-2">
            <Textarea
              placeholder="Post a clinic response…"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
            />
            <Button
              size="sm"
              disabled={!replyText.trim() || moderate.isPending}
              onClick={() =>
                moderate.mutate({
                  id: review.id,
                  clinic_reply: replyText.trim(),
                })
              }
            >
              <MessageSquareReply className="mr-1 h-3.5 w-3.5" /> Reply
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminFeedbackPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const { data: reviews = [], isLoading } = useAdminReviews(tab);
  // Tab counts come from separate cached queries so they stay accurate
  // without re-fetching the full list every time.
  const pendingQ = useAdminReviews('pending');
  const approvedQ = useAdminReviews('approved');
  const rejectedQ = useAdminReviews('rejected');
  const counts: Record<Tab, number> = {
    pending: pendingQ.data?.length ?? 0,
    approved: approvedQ.data?.length ?? 0,
    rejected: rejectedQ.data?.length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feedback Moderation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve, reject, and respond to patient reviews.
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
            {t[0].toUpperCase() + t.slice(1)} ({counts[t]})
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No reviews in this queue.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
    </div>
  );
}
