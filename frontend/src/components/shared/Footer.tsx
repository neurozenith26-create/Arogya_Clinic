import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, MessageCircle } from 'lucide-react';
import {
  CLINIC_FULL_NAME,
  CLINIC_PHONE,
  CLINIC_PHONE_DIGITS,
  CLINIC_WHATSAPP,
  CLINIC_EMAIL,
  CLINIC_ADDRESS,
  CLINIC_TAGLINE_EN,
  CLINIC_SERVICES,
} from '../../config/featureFlags';
import { Logo } from './Logo';

export function Footer() {
  const year = new Date().getFullYear();
  const whatsappUrl = `https://wa.me/${CLINIC_WHATSAPP.replace('+', '')}`;

  return (
    <footer className="border-t bg-secondary/5">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-start gap-3">
            <Logo size={48} />
            <div>
              <div className="text-base font-bold uppercase tracking-tight text-primary">
                Arogya Diagnostics
              </div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                & Multispeciality Clinic
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{CLINIC_TAGLINE_EN}</p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Services</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {CLINIC_SERVICES.map((service) => (
              <li key={service.key}>
                {service.name_en}
                {service.comingSoon && (
                  <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                    SOON
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Quick Links</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/about" className="hover:text-primary">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/services" className="hover:text-primary">
                All Services
              </Link>
            </li>
            <li>
              <Link to="/doctors" className="hover:text-primary">
                Our Doctors
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-primary">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/feedback" className="hover:text-primary">
                Give Feedback
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Contact</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{CLINIC_ADDRESS}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              <a href={`tel:${CLINIC_PHONE_DIGITS}`} className="hover:text-primary">
                {CLINIC_PHONE}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                Chat on WhatsApp
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <a href={`mailto:${CLINIC_EMAIL}`} className="hover:text-primary">
                {CLINIC_EMAIL}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container py-4 text-center text-xs text-muted-foreground">
          © {year} {CLINIC_FULL_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
