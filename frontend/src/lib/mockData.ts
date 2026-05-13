// Demo / mock data used while VITE_USE_MOCK_DATA=true.
// Once Supabase + backend are wired, set VITE_USE_MOCK_DATA=false and these
// hooks switch to live API calls.

export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

// ─── Departments ─────────────────────────────────────────────────────────────

export interface MockDepartment {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export const mockDepartments: MockDepartment[] = [
  {
    id: 1,
    name: 'General Physician',
    slug: 'general-physician',
    description: 'Primary care and general health consultations for the entire family.',
    icon: 'Stethoscope',
  },
  {
    id: 2,
    name: 'Cardiology',
    slug: 'cardiology',
    description: 'Heart and cardiovascular care including ECG and Halter monitoring.',
    icon: 'Heart',
  },
  {
    id: 3,
    name: 'Diabetology',
    slug: 'diabetology',
    description: 'Diabetes management and endocrine disorder care.',
    icon: 'Activity',
  },
  {
    id: 4,
    name: 'Gynaecology',
    slug: 'gynaecology',
    description: 'Women\'s health, pregnancy care, and 3D/4D obstetric ultrasonography.',
    icon: 'HeartPulse',
  },
  {
    id: 5,
    name: 'Paediatrics',
    slug: 'paediatrics',
    description: 'Comprehensive care for infants, children, and adolescents.',
    icon: 'Baby',
  },
  {
    id: 6,
    name: 'Orthopaedics',
    slug: 'orthopaedics',
    description: 'Bone, joint, and musculoskeletal care including digital X-Ray.',
    icon: 'Bone',
  },
  {
    id: 7,
    name: 'ENT',
    slug: 'ent',
    description: 'Ear, nose, and throat specialty consultations.',
    icon: 'Ear',
  },
  {
    id: 8,
    name: 'Dermatology',
    slug: 'dermatology',
    description: 'Skin, hair, and nail conditions.',
    icon: 'Sparkles',
  },
];

// ─── Doctors ─────────────────────────────────────────────────────────────────

export interface MockDoctor {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  speciality: string;
  qualifications: string[];
  consultation_fee: number;
  about: string;
  education_training: string;
  is_verified: boolean;
  offers_home_visit: boolean;
  rating_avg: number;
  rating_count: number;
  department_id: number;
  department_name: string;
  department_slug: string;
  profile_photo_url: string | null;
  centers: Array<{
    id: number;
    center_name: string;
    address: string;
    phone: string;
    city: string;
  }>;
}

export const mockDoctors: MockDoctor[] = [
  {
    id: 'doc-001',
    first_name: 'A K',
    last_name: 'Jain',
    display_name: 'Dr. A K Jain',
    speciality: 'Diabetologist & General Physician',
    qualifications: ['BAMS', 'MD Physician'],
    consultation_fee: 700,
    about:
      '20+ years of experience treating diabetes and lifestyle disorders. Focuses on holistic care with diet, exercise, and medication when needed.',
    education_training:
      'BAMS — Bengal Ayurvedic College, Kolkata. MD Physician — Bharati Vidyapeeth, Pune. Registered with West Bengal State Medical Council.',
    is_verified: true,
    offers_home_visit: true,
    rating_avg: 4.7,
    rating_count: 128,
    department_id: 3,
    department_name: 'Diabetology',
    department_slug: 'diabetology',
    profile_photo_url: null,
    centers: [
      {
        id: 1,
        center_name: 'Salt Lake',
        address: 'CD-85 Sector I, Salt Lake City, Kolkata - 700064',
        phone: '+91 98319 90734',
        city: 'Kolkata',
      },
    ],
  },
  {
    id: 'doc-002',
    first_name: 'Sushmita',
    last_name: 'Banerjee',
    display_name: 'Dr. Sushmita Banerjee',
    speciality: 'Gynaecologist & Obstetrician',
    qualifications: ['MBBS', 'MS (Obs & Gyn)'],
    consultation_fee: 800,
    about:
      'Specialises in high-risk pregnancies, 3D/4D obstetric ultrasonography, and women\'s wellness check-ups.',
    education_training:
      'MBBS — Calcutta Medical College. MS (Obs & Gyn) — IPGMER Kolkata. Fellow in fetal medicine.',
    is_verified: true,
    offers_home_visit: false,
    rating_avg: 4.8,
    rating_count: 96,
    department_id: 4,
    department_name: 'Gynaecology',
    department_slug: 'gynaecology',
    profile_photo_url: null,
    centers: [
      {
        id: 2,
        center_name: 'Salt Lake',
        address: 'CD-85 Sector I, Salt Lake City, Kolkata - 700064',
        phone: '+91 98319 90734',
        city: 'Kolkata',
      },
    ],
  },
  {
    id: 'doc-003',
    first_name: 'Rohit',
    last_name: 'Sengupta',
    display_name: 'Dr. Rohit Sengupta',
    speciality: 'Cardiologist',
    qualifications: ['MBBS', 'MD (Medicine)', 'DM (Cardiology)'],
    consultation_fee: 1200,
    about:
      'Interventional cardiologist with experience across leading Kolkata hospitals. Specialises in coronary angioplasty and heart failure management.',
    education_training:
      'MBBS — IPGMER Kolkata. MD (Medicine) — AIIMS Delhi. DM (Cardiology) — SCTIMST Trivandrum.',
    is_verified: true,
    offers_home_visit: false,
    rating_avg: 4.9,
    rating_count: 214,
    department_id: 2,
    department_name: 'Cardiology',
    department_slug: 'cardiology',
    profile_photo_url: null,
    centers: [
      {
        id: 3,
        center_name: 'Salt Lake',
        address: 'CD-85 Sector I, Salt Lake City, Kolkata - 700064',
        phone: '+91 98319 90734',
        city: 'Kolkata',
      },
    ],
  },
  {
    id: 'doc-004',
    first_name: 'Priya',
    last_name: 'Mukherjee',
    display_name: 'Dr. Priya Mukherjee',
    speciality: 'Paediatrician',
    qualifications: ['MBBS', 'MD (Paediatrics)'],
    consultation_fee: 600,
    about:
      'Caring paediatrician with a special interest in childhood nutrition, immunisation, and developmental milestones.',
    education_training:
      'MBBS — NRS Medical College. MD (Paediatrics) — IPGMER Kolkata.',
    is_verified: true,
    offers_home_visit: true,
    rating_avg: 4.9,
    rating_count: 172,
    department_id: 5,
    department_name: 'Paediatrics',
    department_slug: 'paediatrics',
    profile_photo_url: null,
    centers: [
      {
        id: 4,
        center_name: 'Salt Lake',
        address: 'CD-85 Sector I, Salt Lake City, Kolkata - 700064',
        phone: '+91 98319 90734',
        city: 'Kolkata',
      },
    ],
  },
  {
    id: 'doc-005',
    first_name: 'Arijit',
    last_name: 'Das',
    display_name: 'Dr. Arijit Das',
    speciality: 'Orthopaedic Surgeon',
    qualifications: ['MBBS', 'MS (Orthopaedics)'],
    consultation_fee: 800,
    about:
      'Treats sports injuries, joint pain, fractures, and degenerative bone conditions. Trained in minimally-invasive arthroscopy.',
    education_training:
      'MBBS — Burdwan Medical College. MS (Ortho) — RG Kar Medical College Kolkata.',
    is_verified: true,
    offers_home_visit: false,
    rating_avg: 4.6,
    rating_count: 89,
    department_id: 6,
    department_name: 'Orthopaedics',
    department_slug: 'orthopaedics',
    profile_photo_url: null,
    centers: [
      {
        id: 5,
        center_name: 'Salt Lake',
        address: 'CD-85 Sector I, Salt Lake City, Kolkata - 700064',
        phone: '+91 98319 90734',
        city: 'Kolkata',
      },
    ],
  },
  {
    id: 'doc-006',
    first_name: 'Megha',
    last_name: 'Chatterjee',
    display_name: 'Dr. Megha Chatterjee',
    speciality: 'Dermatologist',
    qualifications: ['MBBS', 'MD (Dermatology)'],
    consultation_fee: 700,
    about:
      'Clinical and cosmetic dermatology. Treats acne, pigmentation, hair loss, and provides chemical peels and laser treatments.',
    education_training:
      'MBBS — Medical College Kolkata. MD (Dermatology) — KEM Mumbai.',
    is_verified: true,
    offers_home_visit: false,
    rating_avg: 4.7,
    rating_count: 134,
    department_id: 8,
    department_name: 'Dermatology',
    department_slug: 'dermatology',
    profile_photo_url: null,
    centers: [
      {
        id: 6,
        center_name: 'Salt Lake',
        address: 'CD-85 Sector I, Salt Lake City, Kolkata - 700064',
        phone: '+91 98319 90734',
        city: 'Kolkata',
      },
    ],
  },
];

// ─── Service categories + services ───────────────────────────────────────────

export interface MockServiceCategory {
  id: number;
  name: string;
  slug: string;
  display_order: number;
}

export const mockServiceCategories: MockServiceCategory[] = [
  { id: 1, name: 'Pathology', slug: 'pathology', display_order: 1 },
  { id: 2, name: 'Radiology', slug: 'radiology', display_order: 2 },
  { id: 3, name: 'Ultrasonography', slug: 'ultrasonography', display_order: 3 },
  { id: 4, name: 'Cardiac Diagnostics', slug: 'cardiac-diagnostics', display_order: 4 },
  { id: 5, name: 'Health Packages', slug: 'health-packages', display_order: 5 },
  { id: 6, name: 'Doctor Consultation', slug: 'doctor-consultation', display_order: 6 },
];

export interface MockService {
  id: number;
  name: string;
  slug: string;
  short_description: string;
  full_details: string;
  prep_instructions: string | null;
  sample_type: string | null;
  report_turnaround_hours: number;
  price: number;
  is_package: boolean;
  category_id: number;
  category_slug: string;
  category_name: string;
}

export const mockServices: MockService[] = [
  // Pathology
  {
    id: 101,
    name: 'Complete Blood Count (CBC)',
    slug: 'cbc',
    short_description: 'Evaluates overall health and screens for a wide range of disorders.',
    full_details:
      'A CBC measures several components of your blood: red cells, white cells, haemoglobin, haematocrit, and platelets. Used to detect anaemia, infections, and clotting issues.',
    prep_instructions: 'No fasting required. Stay hydrated before sample collection.',
    sample_type: 'Blood',
    report_turnaround_hours: 24,
    price: 350,
    is_package: false,
    category_id: 1,
    category_slug: 'pathology',
    category_name: 'Pathology',
  },
  {
    id: 102,
    name: 'Glucose Fasting (Plasma)',
    slug: 'glucose-fasting',
    short_description: 'Measures blood sugar after fasting — used to screen for diabetes.',
    full_details:
      'Fasting plasma glucose is the standard screening test for diabetes. Levels above 126 mg/dL on two occasions confirm diabetes.',
    prep_instructions: '8–12 hours of fasting required. Only water is permitted.',
    sample_type: 'Blood',
    report_turnaround_hours: 12,
    price: 120,
    is_package: false,
    category_id: 1,
    category_slug: 'pathology',
    category_name: 'Pathology',
  },
  {
    id: 103,
    name: 'Creatinine (Serum)',
    slug: 'creatinine',
    short_description: 'Evaluates kidney function.',
    full_details:
      'Serum creatinine measures kidney filtration. Elevated levels can indicate kidney disease or dehydration.',
    prep_instructions: 'No special preparation.',
    sample_type: 'Blood',
    report_turnaround_hours: 24,
    price: 210,
    is_package: false,
    category_id: 1,
    category_slug: 'pathology',
    category_name: 'Pathology',
  },
  {
    id: 104,
    name: 'Urea (Serum)',
    slug: 'urea',
    short_description: 'Assesses kidney function and protein metabolism.',
    full_details:
      'Blood urea nitrogen (BUN) helps assess kidney function alongside creatinine.',
    prep_instructions: 'No special preparation.',
    sample_type: 'Blood',
    report_turnaround_hours: 24,
    price: 210,
    is_package: false,
    category_id: 1,
    category_slug: 'pathology',
    category_name: 'Pathology',
  },
  {
    id: 105,
    name: 'Lipid Profile',
    slug: 'lipid-profile',
    short_description: 'Cholesterol panel — cardiovascular risk assessment.',
    full_details:
      'Total cholesterol, HDL, LDL, VLDL, and triglycerides. Standard screen for heart-disease risk.',
    prep_instructions: '12 hours of fasting recommended.',
    sample_type: 'Blood',
    report_turnaround_hours: 24,
    price: 750,
    is_package: false,
    category_id: 1,
    category_slug: 'pathology',
    category_name: 'Pathology',
  },
  // Radiology
  {
    id: 201,
    name: 'Digital X-Ray',
    slug: 'digital-x-ray',
    short_description: 'High-resolution digital X-ray imaging for diagnostic accuracy.',
    full_details:
      'Digital X-ray produces images with finer detail than traditional film, with lower radiation exposure. Used for chest, bone, abdomen, and dental imaging.',
    prep_instructions: 'Wear loose clothing without metal. Inform staff if you may be pregnant.',
    sample_type: null,
    report_turnaround_hours: 1,
    price: 400,
    is_package: false,
    category_id: 2,
    category_slug: 'radiology',
    category_name: 'Radiology',
  },
  // Ultrasonography
  {
    id: 301,
    name: '3D / 4D Ultrasonography',
    slug: '3d-4d-ultrasonography',
    short_description: 'Advanced 3D and 4D ultrasound for diagnostic and obstetric scans.',
    full_details:
      '3D ultrasound creates static three-dimensional images; 4D adds motion. Especially useful for foetal imaging and detailed organ assessment.',
    prep_instructions: 'Drink water 1 hour before pelvic scans to fill the bladder.',
    sample_type: null,
    report_turnaround_hours: 2,
    price: 2500,
    is_package: false,
    category_id: 3,
    category_slug: 'ultrasonography',
    category_name: 'Ultrasonography',
  },
  // Cardiac
  {
    id: 401,
    name: 'ECG',
    slug: 'ecg',
    short_description: 'Records the electrical activity of the heart.',
    full_details:
      'A 12-lead electrocardiogram detects arrhythmias, heart attacks, and other cardiac conditions in under 5 minutes.',
    prep_instructions: 'No preparation needed.',
    sample_type: null,
    report_turnaround_hours: 1,
    price: 300,
    is_package: false,
    category_id: 4,
    category_slug: 'cardiac-diagnostics',
    category_name: 'Cardiac Diagnostics',
  },
  {
    id: 402,
    name: 'Halter Monitoring (24 hr)',
    slug: 'halter-monitoring',
    short_description: '24-hour Holter monitoring to track heart rhythm during daily activity.',
    full_details:
      'A portable monitor records your heart rhythm continuously for 24 hours, helping diagnose intermittent arrhythmias.',
    prep_instructions: 'Avoid showering during the recording. Keep a log of any symptoms.',
    sample_type: null,
    report_turnaround_hours: 48,
    price: 1800,
    is_package: false,
    category_id: 4,
    category_slug: 'cardiac-diagnostics',
    category_name: 'Cardiac Diagnostics',
  },
  // Health packages
  {
    id: 501,
    name: 'Basic Wellness Package',
    slug: 'basic-wellness-package',
    short_description: 'CBC, Fasting Glucose, Lipid Profile, Creatinine, Urea.',
    full_details:
      'A foundational annual check-up bundle that screens for the most common lifestyle conditions. Ideal for adults 30+.',
    prep_instructions: '12 hours fasting required (water permitted).',
    sample_type: 'Blood',
    report_turnaround_hours: 24,
    price: 1499,
    is_package: true,
    category_id: 5,
    category_slug: 'health-packages',
    category_name: 'Health Packages',
  },
  {
    id: 502,
    name: 'Comprehensive Heart Check',
    slug: 'comprehensive-heart-check',
    short_description: 'Lipid Profile + ECG + Cardiologist consultation.',
    full_details:
      'Designed for individuals with a family history of heart disease or those over 40. Includes a one-on-one review with a cardiologist.',
    prep_instructions: '12 hours fasting before blood draw.',
    sample_type: 'Blood',
    report_turnaround_hours: 24,
    price: 2799,
    is_package: true,
    category_id: 5,
    category_slug: 'health-packages',
    category_name: 'Health Packages',
  },
];

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface MockReview {
  id: number;
  patient_first_name: string;
  rating: number;
  comment: string;
  created_at: string;
  doctor_user_id?: string;
}

export const mockReviews: MockReview[] = [
  {
    id: 1,
    patient_first_name: 'Anjali',
    rating: 5,
    comment:
      'Very professional staff. Doctor explained everything clearly and the report was ready the next day.',
    created_at: '2024-12-15T10:00:00Z',
  },
  {
    id: 2,
    patient_first_name: 'Rakesh',
    rating: 5,
    comment:
      'Booked an ECG and got results the same day. Highly recommend.',
    created_at: '2024-12-10T14:30:00Z',
  },
  {
    id: 3,
    patient_first_name: 'Sumita',
    rating: 4,
    comment:
      'Home sample collection was on time. Pricing is fair and reports are accurate.',
    created_at: '2024-11-28T08:15:00Z',
  },
];
