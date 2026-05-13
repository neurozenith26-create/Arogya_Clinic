export const PHASE_2_ENABLED = import.meta.env.VITE_PHASE_2_ENABLED === 'true';

export const CLINIC_NAME = 'Arogya Diagnostics';
export const CLINIC_FULL_NAME = 'Arogya Diagnostics & Multispeciality Clinic';
export const CLINIC_TAGLINE_EN = 'All Specialist Doctors Are Available here By Appointment.';
export const CLINIC_TAGLINE_BN =
  'সব রকমের বিশেষজ্ঞ ডাক্তার এখানে উপলব্ধ। নির্দিষ্ট দিনে, নির্দিষ্ট সময়ে সাক্ষাৎ-এর জন্য যোগাযোগ করুন।';
export const CLINIC_SHORT_TAGLINE = 'Trusted diagnostics & multi-speciality care in Kolkata';

export const CLINIC_PHONE = '+91 98319 90734';
export const CLINIC_PHONE_DIGITS = '+919831990734';
export const CLINIC_WHATSAPP = '+919831990734';

export const CLINIC_EMAIL = 'arogyaclinic2025@gmail.com';
export const CLINIC_ADDRESS = 'Kolkata, West Bengal';

export interface ClinicService {
  key: string;
  name_en: string;
  name_bn: string;
  comingSoon?: boolean;
}

export const CLINIC_SERVICES: ClinicService[] = [
  { key: 'digital_xray', name_en: 'Digital X-Ray', name_bn: 'ডিজিটাল এক্স-রে' },
  { key: 'ultrasonography', name_en: '3D / 4D Ultrasonography', name_bn: 'আল্ট্রাসোনোগ্রাফি' },
  { key: 'pathology', name_en: 'Pathology', name_bn: 'প্যাথোলজি' },
  { key: 'ecg_halter', name_en: 'ECG & Halter Monitoring', name_bn: 'ই.সি.জি ও হল্টার মনিটরিং' },
  {
    key: 'medical_examination',
    name_en: 'Medical Examination Report',
    name_bn: 'মেডিকেল পরীক্ষার রিপোর্ট',
    comingSoon: true,
  },
];
