/** Original flat illustrations for course cards (drawn for Umanah, offline, no logos or third-party artwork). */
export function CourseIllustration({ kind }: { kind: string }) {
  const common = { viewBox: "0 0 200 96", className: "h-full w-full", role: "img" as const };
  if (kind === "python")
    return (
      <svg {...common} aria-label="A code window with lines of code">
        <rect x="52" y="12" width="96" height="72" rx="9" fill="#fff" stroke="#9db4d6" strokeWidth="2" />
        <rect x="52" y="12" width="96" height="16" rx="9" fill="#dbe6f7" /><rect x="52" y="22" width="96" height="6" fill="#dbe6f7" />
        {[62, 70, 78].map((x, i) => <circle key={x} cx={x} cy="20" r="2.4" fill={["#e88", "#eb6", "#7c9"][i]} />)}
        <path d="M66 42l-8 8 8 8" fill="none" stroke="#2b6cb0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="76" y="45" width="34" height="5" rx="2.5" fill="#2b6cb0" /><rect x="82" y="56" width="46" height="5" rx="2.5" fill="#f2b84b" /><rect x="76" y="67" width="26" height="5" rx="2.5" fill="#6cb48f" />
        <path d="M30 70q8-22 22-10M170 30q-8 20-22 10" fill="none" stroke="#b9cbe6" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  if (kind === "sparkles")
    return (
      <svg {...common} aria-label="A chip connected to a small network">
        <rect x="76" y="28" width="48" height="40" rx="8" fill="#fff" stroke="#6cb48f" strokeWidth="2.5" />
        {[84, 96, 108].map((x) => <g key={x}><path d={`M${x} 28v-9M${x} 68v9`} stroke="#6cb48f" strokeWidth="2.5" strokeLinecap="round" /></g>)}
        <text x="100" y="54" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="17" fill="#2f7a55">AI</text>
        {[[36, 30], [30, 64], [166, 26], [170, 66]].map(([x, y], i) => <g key={i}><path d={`M${x} ${y}L${x < 100 ? 76 : 124} 48`} stroke="#b7d8c6" strokeWidth="2" /><circle cx={x} cy={y} r="6" fill="#e6f3ea" stroke="#6cb48f" strokeWidth="2" /></g>)}
      </svg>
    );
  return (
    <svg {...common} aria-label="An atom with orbiting electrons">
      <g fill="none" stroke="#d1a24a" strokeWidth="2.5">{[0, 60, 120].map((a) => <ellipse key={a} cx="100" cy="48" rx="46" ry="16" transform={`rotate(${a} 100 48)`} />)}</g>
      <circle cx="100" cy="48" r="7" fill="#f2b84b" />
      {[[146, 48], [77, 88], [77, 8]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.5" fill="#8a5a12" />)}
      <path d="M22 78l8-8m-8 0l8 8M172 14l6 6m-6 0l6-6" stroke="#e3c17a" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
