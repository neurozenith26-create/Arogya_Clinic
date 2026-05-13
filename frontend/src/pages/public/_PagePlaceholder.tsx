import { Helmet } from 'react-helmet-async';
import { CLINIC_NAME } from '../../config/featureFlags';

export interface PagePlaceholderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PagePlaceholder({ title, description, children }: PagePlaceholderProps) {
  return (
    <>
      <Helmet>
        <title>
          {title} — {CLINIC_NAME}
        </title>
        {description && <meta name="description" content={description} />}
      </Helmet>
      <section className="container py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          {description && <p className="mt-3 text-muted-foreground">{description}</p>}
          <div className="mt-8">
            {children ?? (
              <p className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
                This page is being built. Full content arrives in the next milestone.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
