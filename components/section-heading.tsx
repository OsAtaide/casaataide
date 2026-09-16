export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <div className="mb-4 flex items-end justify-between gap-3"><div>{eyebrow && <p className="mb-1 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">{eyebrow}</p>}<h2 className="text-xl font-black tracking-tight text-white">{title}</h2></div>{action}</div>;
}
