/**
 * Original Intervia mark: two overlapping hex-nut facets (an industrial
 * fastener motif) cut by a diagonal service stroke. Not derived from, or
 * intended to resemble, any competitor's logo.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path
        d="M16 2 27 8.5v15L16 30 5 23.5v-15L16 2Z"
        className="fill-primary"
      />
      <path
        d="M16 2 27 8.5v15L16 30V2Z"
        className="fill-primary/70"
      />
      <path d="M10.5 20.5 21.5 11.5" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
