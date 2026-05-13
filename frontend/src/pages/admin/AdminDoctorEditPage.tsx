import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { mockDoctors } from '../../lib/mockData';
import { mockDepartments } from '../../lib/mockData';

export default function AdminDoctorEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new' || !id;
  const doctor = !isNew ? mockDoctors.find((d) => d.id === id) : undefined;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/doctors">
          <ArrowLeft className="mr-1 h-4 w-4" /> All doctors
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {isNew ? 'Add Doctor' : `Edit ${doctor?.display_name ?? ''}`}
        </h1>
        <Button onClick={() => navigate('/admin/doctors')}>
          <Save className="mr-1 h-4 w-4" /> Save
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first">First name</Label>
                  <Input id="first" defaultValue={doctor?.first_name ?? ''} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="last">Last name</Label>
                  <Input id="last" defaultValue={doctor?.last_name ?? ''} className="mt-1.5" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="speciality">Speciality</Label>
                  <Input
                    id="speciality"
                    defaultValue={doctor?.speciality ?? ''}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    defaultValue={doctor?.department_id}
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {mockDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="quals">Qualifications (comma-separated)</Label>
                <Input
                  id="quals"
                  defaultValue={doctor?.qualifications.join(', ') ?? ''}
                  placeholder="MBBS, MD"
                  className="mt-1.5"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="fee">Consultation fee (₹)</Label>
                  <Input
                    id="fee"
                    type="number"
                    defaultValue={doctor?.consultation_fee ?? 0}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <input id="verified" type="checkbox" defaultChecked={doctor?.is_verified} />
                  <Label htmlFor="verified">Verified badge</Label>
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <input id="home" type="checkbox" defaultChecked={doctor?.offers_home_visit} />
                  <Label htmlFor="home">Offers home visit</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="about">About</Label>
                <Textarea
                  id="about"
                  rows={3}
                  defaultValue={doctor?.about ?? ''}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edu">Education &amp; training</Label>
                <Textarea
                  id="edu"
                  rows={3}
                  defaultValue={doctor?.education_training ?? ''}
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Consulting centers</CardTitle>
              <Button variant="outline" size="sm">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add center
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(doctor?.centers ?? [
                { id: 0, center_name: '', address: '', phone: '', city: '' },
              ]).map((c, i) => (
                <div key={i} className="rounded-md border p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input defaultValue={c.center_name} placeholder="Center name" />
                    <Input defaultValue={c.phone} placeholder="Phone" />
                  </div>
                  <Input defaultValue={c.address} placeholder="Full address" className="mt-3" />
                  <div className="mt-3 flex justify-end">
                    <Button variant="ghost" size="sm">
                      <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Day-by-day working hours + slot duration. Editor coming in M2.
              </p>
              <div className="mt-3 grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="rounded border p-2 text-center text-xs">
                    <div className="font-semibold">{d}</div>
                    <div className="text-muted-foreground">
                      {d === 'Sun' ? 'Off' : '09:00–13:00'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">15 min slots</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile photo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                Upload photo
              </div>
              <Button variant="outline" className="mt-3 w-full">
                Choose file
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">JPG / PNG, square, ≥400×400px</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
