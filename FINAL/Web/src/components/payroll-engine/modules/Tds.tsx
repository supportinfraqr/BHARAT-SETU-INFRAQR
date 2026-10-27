"use client";

import type { ModuleProps } from '@/lib/payroll-engine/types';
import { Empty, Section } from '../ui';

/** TDS / Income Tax — TODO: implemented by the frontend port. */
export default function Tds(_props: ModuleProps) {
  return <Section title="TDS / Income Tax"><Empty title="Not implemented yet" /></Section>;
}
