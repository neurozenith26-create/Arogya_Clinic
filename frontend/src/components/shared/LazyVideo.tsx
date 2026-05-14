import { useEffect, useRef, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Lazy-loading <video> wrapper. The MP4 source is only attached once the
 * element is within ~200 px of the viewport (IntersectionObserver) — perfect
 * for heavy clips that shouldn't impact the initial page load.
 *
 * If `autoPlay` is on, the video also plays muted + loop the moment it
 * appears. Otherwise we show a poster image with a centered play button and
 * load + play on click.
 */
interface LazyVideoProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function LazyVideo({
  src,
  poster,
  autoPlay = false,
  className,
  ariaLabel,
}: LazyVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [userPlayed, setUserPlayed] = useState(false);
  const shouldLoad = autoPlay ? inView : userPlayed;

  useEffect(() => {
    if (!autoPlay || !containerRef.current) return;
    const el = containerRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoPlay]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {shouldLoad ? (
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          aria-label={ariaLabel}
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        <button
          type="button"
          onClick={() => setUserPlayed(true)}
          className="group relative block h-full w-full cursor-pointer"
          aria-label={ariaLabel ? `Play ${ariaLabel}` : 'Play video'}
        >
          {poster && (
            <img
              src={poster}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
            <PlayCircle className="h-16 w-16 text-white drop-shadow-lg transition-transform group-hover:scale-110" />
          </div>
        </button>
      )}
    </div>
  );
}
