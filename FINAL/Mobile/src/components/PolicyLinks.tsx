import { ChevronRight } from 'lucide-react';

const LINKS = [
  { href: '/policy', key: 'policy', label: 'Privacy Policy', desc: 'How we collect, use and protect your data.' },
  { href: '/data-sharing', key: 'data-sharing', label: 'Data Sharing Policy', desc: 'Who your data is shared with, and why.' },
  { href: '/terms', key: 'terms', label: 'Terms of Service', desc: 'The rules for using the platform.' },
];

/** Cross-links the three public policy pages, omitting the current one. */
export default function PolicyLinks({ current }: { current: 'policy' | 'data-sharing' | 'terms' }) {
  const items = LINKS.filter(link => link.key !== current);
  return (
    <section className="mt-12 border-t border-gray-100 pt-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Related policies</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map(link => (
          <a
            key={link.href}
            href={link.href}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4 transition-colors hover:bg-gray-50"
          >
            <span>
              <span className="block text-sm font-semibold text-gray-900">{link.label}</span>
              <span className="block text-xs text-gray-500 mt-0.5">{link.desc}</span>
            </span>
            <ChevronRight size={16} className="text-[#073B67] flex-shrink-0" />
          </a>
        ))}
      </div>
    </section>
  );
}
