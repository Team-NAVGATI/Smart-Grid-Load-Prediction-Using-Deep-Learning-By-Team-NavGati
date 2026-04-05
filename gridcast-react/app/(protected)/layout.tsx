import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // All /dashboard routes will use this layout
  // The middleware.ts protects access to these routes
  return <>{children}</>;
}
