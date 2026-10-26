/** The Umanah mark: an outlined geometric rosette (design/reference). */
export function Rosette({ className = "h-9 w-9" }: { className?: string }) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      {petals.map((a) => (
        <ellipse key={a} cx="24" cy="13" rx="4.4" ry="9" transform={`rotate(${a} 24 24)`} />
      ))}
      <circle cx="24" cy="24" r="4.2" />
    </svg>
  );
}
