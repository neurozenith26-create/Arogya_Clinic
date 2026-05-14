import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { useAdminAuditLog, type AdminAuditRow } from '../../hooks/queries';
import { format } from 'date-fns';

export default function AdminAuditLogPage() {
  const { data: entries = [], isLoading } = useAdminAuditLog(200);

  const columns: Column<AdminAuditRow>[] = [
    {
      key: 'actor',
      header: 'Actor',
      render: (e) => (
        <div>
          <div className="font-medium">{e.actor_name}</div>
          {e.actor_role && (
            <div className="text-xs text-muted-foreground">{e.actor_role}</div>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (e) => <Badge variant="outline">{e.action}</Badge>,
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (e) => (
        <div>
          <Badge variant="secondary">{e.entity_type}</Badge>
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            {e.entity_id}
          </span>
        </div>
      ),
    },
    {
      key: 'when',
      header: 'When',
      render: (e) => (
        <span className="text-xs">
          {format(new Date(e.created_at), 'd MMM yyyy, h:mm a')}
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'IP',
      render: (e) => (
        <span className="font-mono text-[10px] text-muted-foreground">
          {e.ip_address ?? '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Immutable record of admin actions, sourced from <code>audit_log</code>. The
          backend writes to this table whenever a privileged action happens.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent activity {entries.length > 0 && `(${entries.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
              No audit entries yet. Activity will start appearing here as admins use the
              system.
            </p>
          ) : (
            <DataTable columns={columns} data={entries} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
