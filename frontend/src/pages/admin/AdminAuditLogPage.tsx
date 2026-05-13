import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { format } from 'date-fns';

interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

const auditEntries: AuditEntry[] = [
  {
    id: 1,
    actor: 'Arogya Admin',
    action: 'booking.update_status',
    entity_type: 'booking',
    entity_id: 'AROGYA-TEST-202605-000003',
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 2,
    actor: 'Arogya Admin',
    action: 'report.upload',
    entity_type: 'report',
    entity_id: 'CBC_Report_v1.pdf',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 3,
    actor: 'Demo Patient',
    action: 'booking.cancel',
    entity_type: 'booking',
    entity_id: 'AROGYA-DOC-202605-000007',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 4,
    actor: 'Arogya Admin',
    action: 'refund.initiate',
    entity_type: 'payment',
    entity_id: 'pay_KX2yqYZ123',
    created_at: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 5,
    actor: 'Arogya Admin',
    action: 'doctor.create',
    entity_type: 'doctor',
    entity_id: 'doc-006',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export default function AdminAuditLogPage() {
  const columns: Column<AuditEntry>[] = [
    {
      key: 'actor',
      header: 'Actor',
      render: (e) => <span className="font-medium">{e.actor}</span>,
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
          <span className="ml-2 font-mono text-xs text-muted-foreground">{e.entity_id}</span>
        </div>
      ),
    },
    {
      key: 'when',
      header: 'When',
      render: (e) => format(new Date(e.created_at), 'd MMM yyyy, h:mm a'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Immutable record of admin actions and patient state changes
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={auditEntries} />
        </CardContent>
      </Card>
    </div>
  );
}
