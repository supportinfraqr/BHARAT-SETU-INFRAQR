import { EmployerProvider } from '@/contexts/EmployerContext';
import { COMPANY } from '@/data/employer';

/** PREVIEW HARNESS employer shell: mock EmployerProvider + a minimal BSS header bar. */
export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <EmployerProvider>
      <div className="min-h-screen bg-[#F5F7FB]" style={{ ['--bss-header-height' as string]: '3.5rem' }}>
        <header className="sticky top-0 z-50 h-14 bg-[#01183A] text-white shadow-[0_6px_18px_-10px_rgba(1,24,58,0.7)]">
          <div className="mx-auto max-w-[1400px] h-full px-4 sm:px-6 flex items-center justify-between gap-3">
            <a href="/employer/dashboard" className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-full bg-white grid place-items-center text-[11px] font-extrabold text-[#01183A] shrink-0">BSS</span>
              <span className="text-sm sm:text-base font-extrabold tracking-tight truncate">
                <span className="text-white">Bharat</span> <span className="text-[#E45D24]">Shram</span> <span className="text-[#4CC37A]">Setu</span>
              </span>
            </a>
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden md:inline text-xs text-white/70 truncate">{COMPANY}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#E45D24] px-2.5 py-1 shrink-0">Preview · mock data</span>
            </div>
          </div>
          <div className="flex h-1" aria-hidden><span className="flex-1 bg-[#E45D24]" /><span className="flex-1 bg-white/80" /><span className="flex-1 bg-[#14843C]" /></div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6">{children}</main>
      </div>
    </EmployerProvider>
  );
}
