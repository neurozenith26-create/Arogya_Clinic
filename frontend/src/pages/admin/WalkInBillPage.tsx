import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertCircle, ArrowLeft, CheckCircle2, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { useServices, useCreateWalkInBill, type WalkInBillPayload } from '../../hooks/queries';
import { formatCurrencyINR } from '../../lib/utils';
import { getApiErrorMessage } from '../../lib/apiClient';
import { useAuthStore } from '../../stores/authStore';

type PaymentMethod = 'cash' | 'upi_qr_offline' | 'card_swipe' | 'cheque';

interface DraftItem {
  service_id?: number;
  item_name: string;
  unit_price: number;
  quantity: number;
  item_type: 'test' | 'package' | 'custom';
}

export default function WalkInBillPage() {
  const navigate = useNavigate();
  const admin = useAuthStore((s) => s.user);
  const createMutation = useCreateWalkInBill();
  const { data: catalog = [] } = useServices();

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [patient, setPatient] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
    age: '',
    gender: 'M' as 'M' | 'F' | 'O',
    email: '',
  });
  const [items, setItems] = useState<DraftItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const balance = Math.max(0, subtotal - paymentAmount);

  const matches = !search
    ? []
    : catalog.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5);

  const addCatalogItem = (serviceId: number) => {
    const s = catalog.find((x) => x.id === serviceId);
    if (!s) return;
    setItems([
      ...items,
      {
        service_id: s.id,
        item_name: s.name,
        unit_price: Number(s.price),
        quantity: 1,
        item_type: s.is_package ? 'package' : 'test',
      },
    ]);
    setSearch('');
    setShowSearch(false);
  };

  const addCustomItem = () =>
    setItems([...items, { item_name: '', unit_price: 0, quantity: 1, item_type: 'custom' }]);

  const updateItem = (i: number, patch: Partial<DraftItem>) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const submit = async () => {
    setFormError(null);
    if (!patient.first_name.trim()) return setFormError('Patient first name is required');
    if (!/^[0-9]{10,15}$/.test(patient.mobile)) {
      return setFormError('Enter a valid 10–15 digit mobile number');
    }
    if (items.length === 0) return setFormError('Add at least one item');

    const payload: WalkInBillPayload = {
      patient: {
        first_name: patient.first_name.trim(),
        last_name: patient.last_name.trim() || undefined,
        mobile: patient.mobile.trim(),
        age: patient.age ? Number(patient.age) : undefined,
        gender: patient.gender,
        email: patient.email.trim() || undefined,
      },
      items: items.map((i) =>
        i.item_type === 'custom'
          ? {
              item_name: i.item_name.trim(),
              unit_price: i.unit_price,
              quantity: i.quantity,
              item_type: 'custom' as const,
            }
          : { service_id: i.service_id!, quantity: i.quantity },
      ),
      payment:
        paymentAmount > 0
          ? {
              method: paymentMethod,
              amount: paymentAmount,
              notes: notes.trim() || undefined,
            }
          : undefined,
    };

    try {
      const created = await createMutation.mutateAsync(payload);
      navigate(`/admin/bookings/${created.id}`);
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not create bill'));
    }
  };

  if (createMutation.isSuccess && createMutation.data) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-lg border-2 border-green-500 bg-green-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <h2 className="mt-3 text-xl font-bold text-green-900">Bill created</h2>
          <p className="mt-1 font-mono text-sm">{createMutation.data.booking_code}</p>
          <Button
            className="mt-5"
            onClick={() => navigate(`/admin/bookings/${createMutation.data!.id}`)}
          >
            View bill
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/bookings">
          <ArrowLeft className="mr-1 h-4 w-4" /> Bookings
        </Link>
      </Button>

      <h1 className="text-3xl font-bold tracking-tight">New Walk-in Bill</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patient</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>First name *</Label>
                <Input
                  value={patient.first_name}
                  onChange={(e) => setPatient({ ...patient, first_name: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Last name</Label>
                <Input
                  value={patient.last_name}
                  onChange={(e) => setPatient({ ...patient, last_name: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Mobile *</Label>
                <Input
                  value={patient.mobile}
                  onChange={(e) =>
                    setPatient({ ...patient, mobile: e.target.value.replace(/\D/g, '') })
                  }
                  inputMode="numeric"
                  maxLength={15}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Age</Label>
                <Input
                  value={patient.age}
                  onChange={(e) =>
                    setPatient({ ...patient, age: e.target.value.replace(/\D/g, '') })
                  }
                  inputMode="numeric"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Gender</Label>
                <select
                  value={patient.gender}
                  onChange={(e) =>
                    setPatient({ ...patient, gender: e.target.value as never })
                  }
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
              <div>
                <Label>Email (optional)</Label>
                <Input
                  type="email"
                  value={patient.email}
                  onChange={(e) => setPatient({ ...patient, email: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Items</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowSearch((v) => !v)}>
                  <Search className="mr-1 h-3.5 w-3.5" /> From catalog
                </Button>
                <Button size="sm" variant="outline" onClick={addCustomItem}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Custom item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showSearch && (
                <div className="rounded-md border p-3">
                  <Input
                    placeholder="Search catalog..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                  {matches.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {matches.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => addCatalogItem(s.id)}
                            className="flex w-full items-center justify-between rounded px-2 py-1 hover:bg-accent"
                          >
                            <span>{s.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrencyINR(Number(s.price))}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {items.length === 0 ? (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No items yet. Add from catalog or create a custom line.
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((it, idx) => (
                    <li
                      key={idx}
                      className="grid items-center gap-2 rounded-md border p-2 sm:grid-cols-[1fr,80px,90px,90px,32px]"
                    >
                      <Input
                        value={it.item_name}
                        onChange={(e) => updateItem(idx, { item_name: e.target.value })}
                        placeholder="Item name"
                        readOnly={it.item_type !== 'custom'}
                      />
                      <Input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(idx, { quantity: Number(e.target.value) || 1 })
                        }
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.unit_price}
                        onChange={(e) =>
                          updateItem(idx, { unit_price: Number(e.target.value) || 0 })
                        }
                        readOnly={it.item_type !== 'custom'}
                      />
                      <div className="text-right text-sm font-semibold">
                        {formatCurrencyINR(it.unit_price * it.quantity)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        aria-label="Remove"
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {it.item_type === 'custom' && (
                        <Badge variant="outline" className="col-span-full w-fit text-[10px]">
                          Custom
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment received</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Record any amount received now. If the patient pays later, use the
                <strong> Record payment</strong> button on the booking detail page.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Method</Label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi_qr_offline">UPI QR</option>
                    <option value="card_swipe">Card swipe</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label>Notes (cheque # / reference)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="sticky top-6 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items</span>
              <span>{items.length}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>{formatCurrencyINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Paid</span>
              <span>{formatCurrencyINR(paymentAmount)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Balance</span>
              <span>{formatCurrencyINR(balance)}</span>
            </div>
            <div className="pt-2 text-xs text-muted-foreground">
              Created by {admin?.first_name ?? 'Admin'} · {format(new Date(), 'd MMM, h:mm a')}
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <Button
              className="mt-3 w-full"
              size="lg"
              onClick={submit}
              disabled={
                createMutation.isPending ||
                items.length === 0 ||
                !patient.first_name ||
                !patient.mobile
              }
            >
              {createMutation.isPending ? 'Creating…' : 'Create Bill & Print Invoice'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
