import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
  /** Set to true on dark backgrounds so the figure stays visible */
  onDark?: boolean;
}

/**
 * Arogya Diagnostics logo — figure with raised arms standing on a DNA double helix.
 * Adapted to the blue + mint gradient brand palette:
 *   - DNA helix: medical blue (primary)
 *   - Figure: mint teal (secondary/accent)
 */
export function Logo({ className, size = 40, onDark = false }: LogoProps) {
  const helix = onDark ? '#7DD3F8' : '#0066D9';
  const figure = '#2FD8A8';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 80"
      width={size}
      height={size * (80 / 64)}
      className={cn('shrink-0', className)}
      role="img"
      aria-label="Arogya Diagnostics logo"
    >
      <defs>
        <linearGradient id="arogya-helix-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={helix} />
          <stop offset="100%" stopColor="#2FD8A8" />
        </linearGradient>
      </defs>

      {/* DNA double helix */}
      <g stroke="url(#arogya-helix-gradient)" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M20 36 Q32 44 44 52 Q32 60 20 68" />
        <path d="M44 36 Q32 44 20 52 Q32 60 44 68" />
        <line x1="22" y1="40" x2="42" y2="40" />
        <line x1="26" y1="46" x2="38" y2="46" />
        <line x1="22" y1="52" x2="42" y2="52" />
        <line x1="26" y1="58" x2="38" y2="58" />
        <line x1="22" y1="64" x2="42" y2="64" />
      </g>

      {/* Figure with raised arms */}
      <g fill={figure}>
        <circle cx="32" cy="10" r="5" />
        <path
          d="
          M 32 16
          Q 30 16 29 18
          L 18 8
          Q 16 8 16 10
          Q 16 12 18 12
          L 28 22
          L 28 32
          Q 28 34 30 34
          L 30 36
          L 34 36
          L 34 34
          Q 36 34 36 32
          L 36 22
          L 46 12
          Q 48 12 48 10
          Q 48 8 46 8
          L 35 18
          Q 34 16 32 16 Z"
        />
      </g>
    </svg>
  );
}
