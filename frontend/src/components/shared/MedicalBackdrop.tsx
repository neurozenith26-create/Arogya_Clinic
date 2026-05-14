import { cn } from '../../lib/utils';

/**
 * Decorative medical-themed backdrop — a slowly-rotating DNA helix and a few
 * floating "molecule" circles. Pure inline SVG so it costs nothing extra at
 * load time (no image fetch, no extra JS), and the animations respect
 * prefers-reduced-motion via the utility classes from index.css.
 *
 * Drop it inside any hero section as a sibling positioned `absolute inset-0`
 * — already configured below; the outer wrapper is `pointer-events-none`
 * so it never intercepts clicks.
 *
 * `tone="light"` uses navy strokes for use on white backgrounds.
 * `tone="dark"`  uses white strokes for use on the gradient hero.
 */
interface Props {
  tone?: 'light' | 'dark';
  className?: string;
  /** Show only the DNA strand, no molecules — for tighter sections. */
  minimal?: boolean;
}

export function MedicalBackdrop({ tone = 'dark', className, minimal = false }: Props) {
  const stroke = tone === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(10,37,64,0.12)';
  const fill = tone === 'dark' ? 'rgba(47,216,168,0.18)' : 'rgba(0,102,217,0.10)';

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {/* DNA helix — anchored bottom-right, rotates very slowly. */}
      <svg
        viewBox="0 0 200 400"
        className="absolute -right-12 bottom-0 h-[80%] w-auto animate-dna-spin opacity-60"
        style={{ transformOrigin: '50% 50%' }}
      >
        {Array.from({ length: 20 }).map((_, i) => {
          const y = i * 20;
          const phase = (i / 20) * Math.PI * 2;
          const xLeft = 80 + Math.sin(phase) * 50;
          const xRight = 80 + Math.sin(phase + Math.PI) * 50;
          return (
            <g key={i}>
              {/* Rung between the two backbones */}
              <line
                x1={xLeft}
                y1={y}
                x2={xRight}
                y2={y}
                stroke={stroke}
                strokeWidth="1.2"
              />
              {/* Base pair dots */}
              <circle cx={xLeft} cy={y} r="3" fill={fill} />
              <circle cx={xRight} cy={y} r="3" fill={fill} />
            </g>
          );
        })}
      </svg>

      {!minimal && (
        <>
          {/* Floating "molecule" — circle + radiating dots. */}
          <svg
            viewBox="0 0 100 100"
            className="absolute left-8 top-12 h-20 w-20 animate-float-slow opacity-60"
          >
            <circle cx="50" cy="50" r="8" fill={fill} />
            <circle cx="50" cy="20" r="4" fill={fill} />
            <circle cx="80" cy="50" r="4" fill={fill} />
            <circle cx="50" cy="80" r="4" fill={fill} />
            <circle cx="20" cy="50" r="4" fill={fill} />
            <line x1="50" y1="50" x2="50" y2="20" stroke={stroke} strokeWidth="1" />
            <line x1="50" y1="50" x2="80" y2="50" stroke={stroke} strokeWidth="1" />
            <line x1="50" y1="50" x2="50" y2="80" stroke={stroke} strokeWidth="1" />
            <line x1="50" y1="50" x2="20" y2="50" stroke={stroke} strokeWidth="1" />
          </svg>

          {/* Heart-rhythm (EKG) line — animates once on mount. */}
          <svg
            viewBox="0 0 600 100"
            className="absolute inset-x-0 bottom-6 h-12 w-full opacity-40"
            preserveAspectRatio="none"
          >
            <path
              d="M 0 50 L 80 50 L 100 50 L 110 30 L 120 70 L 130 20 L 140 80 L 150 50 L 240 50 L 260 50 L 270 30 L 280 70 L 290 20 L 300 80 L 310 50 L 400 50 L 420 50 L 430 30 L 440 70 L 450 20 L 460 80 L 470 50 L 600 50"
              fill="none"
              stroke={stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-ekg"
            />
          </svg>

          {/* Aurora blob #1 */}
          <div
            className="absolute -left-20 top-1/3 h-72 w-72 rounded-full blur-3xl animate-aurora"
            style={{
              background:
                tone === 'dark'
                  ? 'radial-gradient(circle, rgba(47,216,168,0.35), transparent 70%)'
                  : 'radial-gradient(circle, rgba(47,216,168,0.20), transparent 70%)',
            }}
          />
          {/* Aurora blob #2 (out of phase via inline animation delay) */}
          <div
            className="absolute -right-20 bottom-1/4 h-80 w-80 rounded-full blur-3xl animate-aurora"
            style={{
              animationDelay: '4s',
              background:
                tone === 'dark'
                  ? 'radial-gradient(circle, rgba(0,102,217,0.40), transparent 70%)'
                  : 'radial-gradient(circle, rgba(0,102,217,0.16), transparent 70%)',
            }}
          />
        </>
      )}
    </div>
  );
}
