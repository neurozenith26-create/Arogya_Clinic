import type { ReactNode } from 'react';
import { useReadOnlyAdmin } from './ReadOnlyAdminContext';

/**
 * Wraps any create/edit/delete UI element so it disappears for super_admin.
 * Branch admins always see the children unchanged.
 *
 * Usage:
 *   <WriteAction>
 *     <Button onClick={handleCreate}>New booking</Button>
 *   </WriteAction>
 *
 * If you need a visible-but-disabled affordance instead of hiding, pass
 * `mode="disabled"` and the component renders a wrapper that absorbs clicks.
 */

interface WriteActionProps {
  children: ReactNode;
  /** 'hide' (default) removes the element entirely. 'disabled' keeps it visible but inert. */
  mode?: 'hide' | 'disabled';
  /** Optional tooltip shown when mode='disabled'. */
  reason?: string;
}

export function WriteAction({ children, mode = 'hide', reason }: WriteActionProps) {
  const readOnly = useReadOnlyAdmin();
  if (!readOnly) return <>{children}</>;
  if (mode === 'hide') return null;
  return (
    <span
      title={reason ?? 'Super admin is view-only — sign in as the branch admin to make changes.'}
      className="pointer-events-none inline-flex opacity-50"
      aria-disabled="true"
    >
      {children}
    </span>
  );
}
