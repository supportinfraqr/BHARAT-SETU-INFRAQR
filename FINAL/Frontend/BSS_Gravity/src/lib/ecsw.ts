// E-C-S-W binding & consent state machine.
// Hierarchy (strict): Site belongs to exactly one Employer; a Worker is bound to exactly one Site,
// managed by exactly one Contractor at that Site; a Contractor can serve many Employers/Sites.
// Binding yields a constant, unique hierarchy string: E-C-S-W.

export type BindingState = 'unbound' | 'pending' | 'bound' | 'rejected';
export type Party = 'employer' | 'contractor' | 'worker';

export interface EcsEntityId {
  employerId: string; // E
  contractorId: string; // C
  siteId: string; // S
  workerId: string; // W
}

export interface EcsBinding extends EcsEntityId {
  id: string;
  tuple: string; // constant "E-C-S-W"
  state: BindingState;
  consent: Record<Party, boolean>;
  requestedBy: Party;
  requestedAt: string;
  boundAt: string | null;
}

export interface SiteRecord { id: string; employerId: string; }

/** The constant tuple rule: a hierarchy string uniquely identifies a binding. */
export function tupleOf({ employerId, contractorId, siteId, workerId }: EcsEntityId): string {
  return `${employerId}|${contractorId}|${siteId}|${workerId}`;
}

/** Human-readable constant string form: E1-C1-S1-W1. */
export function tupleLabel(binding: EcsEntityId): string {
  return `${binding.employerId}-${binding.contractorId}-${binding.siteId}-${binding.workerId}`;
}

/** Validate the strict E-C-S-W relationships against a candidate binding. */
export function assertEcsRules(candidate: EcsEntityId & { site?: SiteRecord }, existing: readonly EcsBinding[]): string[] {
  const errors: string[] = [];
  const { employerId, contractorId, siteId, workerId, site } = candidate;

  // S → E: a Site belongs exclusively to one Employer.
  if (site && site.employerId !== employerId) errors.push('The selected Site does not belong to this Employer.');

  // W → S: a Worker is bound to exactly one Site (cannot be active on a second site).
  const activeWorkerSites = new Set(
    existing.filter(b => b.workerId === workerId && b.state === 'bound').map(b => b.siteId),
  );
  if (activeWorkerSites.has(siteId)) errors.push('This Worker is already bound to this Site.');
  if (activeWorkerSites.size && !activeWorkerSites.has(siteId)) errors.push('This Worker is active on a different Site and must be released first.');

  // W → C: at the Site a Worker is managed by exactly one Contractor.
  const atSiteContractors = new Set(existing.filter(b => b.siteId === siteId && b.state === 'bound').map(b => b.contractorId));
  if (atSiteContractors.size && !atSiteContractors.has(contractorId) && existing.some(b => b.siteId === siteId && b.workerId === workerId && b.state === 'bound')) errors.push('This Worker is already managed by another Contractor at this Site.');

  // The Constant Tuple Rule: the exact E-C-S-W combination cannot exist twice.
  if (existing.some(b => b.tuple === tupleOf({ employerId, contractorId, siteId, workerId }))) errors.push('This hire hierarchy already exists (duplicate E-C-S-W).');

  return errors;
}

/** Consent handshake — returns the next state for a binding after a party grants/revokes consent. */
export function advanceConsent(binding: EcsBinding, consentTrue: boolean): EcsBinding {
  const others: Party[] = (['employer', 'contractor', 'worker'] as Party[]).filter(p => p !== binding.requestedBy);
  const consent = { ...binding.consent };
  consent[binding.requestedBy] = consentTrue || binding.consent[binding.requestedBy];
  for (const other of others) if (!consent[other]) consent[other] = false;
  const bound = consentTrue && others.every(p => consent[p]);
  return { ...binding, consent, state: consentTrue ? (bound ? 'bound' : 'pending') : 'rejected', boundAt: bound ? binding.boundAt ?? new Date().toISOString().slice(0, 10) : binding.boundAt };
}

/** Binding-aware data visibility: pre-binding only discloses the minimal safe set. */
export function bindingVisibility(binding: EcsBinding | null | undefined): 'pre' | 'post' {
  return binding?.state === 'bound' ? 'post' : 'pre';
}

let seq = 0;
export function createBindingStore(employers?: { id: string; name: string }[], sites?: SiteRecord[], existing: EcsBinding[] = []) {
  const items: EcsBinding[] = [...existing];
  return {
    bindings: items,
    findByTuple: (e: EcsEntityId) => items.find(b => b.tuple === tupleOf(e)),
    consents: (party: Party) => items.filter(b => b.state !== 'rejected'),
    add(candidate: EcsEntityId, site?: SiteRecord, requestedBy: Party = 'contractor'): { binding?: EcsBinding; errors: string[] } {
      const errors = assertEcsRules({ ...candidate, site }, items);
      if (errors.length) return { errors };
      const binding: EcsBinding = {
        ...candidate,
        id: `BC-${++seq}-${cryptoRandom()}`,
        tuple: tupleOf(candidate),
        state: 'unbound',
        consent: { employer: false, contractor: false, worker: false },
        requestedBy,
        requestedAt: new Date().toISOString().slice(0, 10),
        boundAt: null,
      };
      items.push(binding);
      return { binding, errors: [] };
    },
    resolve(next: EcsBinding): EcsBinding | undefined {
      const index = items.findIndex(b => b.id === next.id);
      if (index >= 0) items[index] = next;
      return items[index];
    },
    employerNames: employers ?? [],
    sites,
  };
}

function cryptoRandom(): string { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : String(Math.floor(Math.random() * 1e6)); }
