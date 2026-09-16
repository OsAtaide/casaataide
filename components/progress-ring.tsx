export function ProgressRing({ value, label }: { value: number; label: string }) {
  const radius = 31;
  const circumference = 2 * Math.PI * radius;
  return <div className="relative size-20"><svg className="size-full -rotate-90" viewBox="0 0 80 80"><circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" /><circle cx="40" cy="40" r={radius} fill="none" stroke="url(#ring-gradient)" strokeLinecap="round" strokeWidth="7" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} /><defs><linearGradient id="ring-gradient"><stop stopColor="#9b5cff" /><stop offset="1" stopColor="#18d6ed" /></linearGradient></defs></svg><div className="absolute inset-0 grid place-items-center text-center"><strong className="text-lg leading-none">{value}%</strong><span className="mt-0.5 text-[8px] uppercase tracking-wider text-slate-500">{label}</span></div></div>;
}
