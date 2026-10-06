"use client";

import { createContext, useContext } from 'react';
import type { GovernmentPortalData } from '@/types/portal';

const GovernmentContext = createContext<GovernmentPortalData | null>(null);

export function GovernmentProvider({ children, initialData }: { children: React.ReactNode; initialData: GovernmentPortalData }) {
  return <GovernmentContext.Provider value={initialData}>{children}</GovernmentContext.Provider>;
}

export function useGovernment() {
  const context = useContext(GovernmentContext);
  if (!context) throw new Error('useGovernment must be used within GovernmentProvider');
  return context;
}
