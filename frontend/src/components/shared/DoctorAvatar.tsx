import { useState } from 'react';
import { resolveDoctorPhotoUrl } from '../../hooks/queries';
import { cn } from '../../lib/utils';

interface DoctorAvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  /** Relative API path saved on users.profile_photo_url, e.g. /doctors/<id>/photo. */
  profilePhotoUrl?: string | null;
  /** Used for cache-busting after a re-upload. */
  cacheBust?: string | number;
  size?: number;
  className?: string;
  /** Show a square card (used inside DoctorEditPage). */
  square?: boolean;
}

function initials(first?: string | null, last?: string | null): string {
  return `${(first ?? '').charAt(0)}${(last ?? '').charAt(0)}`.toUpperCase() || '?';
}

export function DoctorAvatar({
  firstName,
  lastName,
  profilePhotoUrl,
  cacheBust,
  size = 96,
  className,
  square = false,
}: DoctorAvatarProps) {
  const [errored, setErrored] = useState(false);
  const src = errored ? null : resolveDoctorPhotoUrl(profilePhotoUrl, cacheBust);
  const baseStyle = { width: size, height: size };
  const shape = square ? 'rounded-md' : 'rounded-full';

  if (src) {
    return (
      <img
        src={src}
        alt={[firstName, lastName].filter(Boolean).join(' ') || 'Doctor photo'}
        onError={() => setErrored(true)}
        className={cn('object-cover', shape, className)}
        style={baseStyle}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-primary font-bold text-primary-foreground',
        shape,
        className,
      )}
      style={{ ...baseStyle, fontSize: size * 0.32 }}
      aria-label={`${initials(firstName, lastName)} avatar`}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
