import * as React from 'react';

import { AuthContext } from '@/features/auth/auth-provider';

export function useAuth() {
  const context = React.use(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
