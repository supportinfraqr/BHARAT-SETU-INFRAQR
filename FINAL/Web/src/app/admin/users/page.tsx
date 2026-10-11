import { redirect } from 'next/navigation';

import { requireSession } from '@/server/session';

// User Registration was merged into Users & Accounts (same data, one place).
export default async function AdminUsersPage() {
  await requireSession('BSS Admin');
  redirect('/admin/accounts');
}
