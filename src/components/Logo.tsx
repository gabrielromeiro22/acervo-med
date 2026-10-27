export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-bold tracking-tight ${className}`}>
      <svg viewBox="0 0 64 64" className="size-7">
        <rect width="64" height="64" rx="16" fill="#2dea96" />
        <path d="M18 46 32 16l14 30" fill="none" stroke="#050706" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 36h16" stroke="#050706" strokeWidth="6" strokeLinecap="round" />
      </svg>
      Acervo<span className="text-accent">Med</span>
    </span>
  )
}
