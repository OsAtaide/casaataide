"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import type { Profile } from "@/types/domain";
import { Button } from "@/components/ui/button";

export function ProfileAccess({ profile, demoMode, onCancel, onSuccess }: { profile: Profile; demoMode: boolean; onCancel: () => void; onSuccess: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isParent = profile.role === "parent";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId: profile.id, role: profile.role, identifier, secret: demoMode ? "demo" : secret }) });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Não foi possível validar o acesso.");
        return;
      }
      onSuccess();
    } catch {
      setError("Não foi possível conectar ao servidor local.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="fixed inset-0 z-30 grid place-items-center bg-[#050816]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="profile-access-title"><div className="glass w-full max-w-md rounded-[30px] p-6 shadow-2xl sm:p-8"><button type="button" onClick={onCancel} className="mb-8 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft size={15} /> Voltar para os perfis</button><div className="mb-7 flex items-center gap-3"><div className={`grid size-14 place-items-center rounded-2xl text-3xl ${profile.accent === "purple" ? "bg-purple-400/15" : profile.accent === "cyan" ? "bg-cyan-300/15" : "bg-yellow-300/15"}`}>{profile.avatar}</div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Acesso protegido</p><h2 id="profile-access-title" className="text-xl font-black text-white">Entrar como {profile.displayName}</h2></div></div>{demoMode ? <div className="mb-6 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.06] p-4"><p className="flex items-center gap-2 text-sm font-bold text-cyan-100"><ShieldCheck size={17} /> Modo demonstração local</p><p className="mt-1 text-xs leading-5 text-slate-400">O Neon ainda não está configurado neste computador. Você pode explorar este perfil sem cadastrar uma senha real.</p></div> : <p className="mb-6 text-sm leading-6 text-slate-400">{isParent ? "Use o e-mail e a senha cadastrados para a família." : "Digite o PIN de 4 dígitos do seu perfil."}</p>}<form onSubmit={submit} className="space-y-4">{!demoMode && isParent && <label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">E-mail</span><input required type="email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="h-12 w-full rounded-2xl border border-white/10 bg-white/[.06] px-4 text-sm text-white outline-none transition focus:border-cyan-300/60" placeholder="guardiao@familia.com" /></label>}{!demoMode && !isParent && <label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">PIN</span><div className="relative"><KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} type="password" value={secret} onChange={(event) => setSecret(event.target.value.replace(/\D/g, ""))} className="h-12 w-full rounded-2xl border border-white/10 bg-white/[.06] pl-11 pr-4 text-sm tracking-[.4em] text-white outline-none transition focus:border-cyan-300/60" placeholder="••••" /></div></label>}{!demoMode && isParent && <label className="block"><span className="mb-2 block text-xs font-bold text-slate-300">Senha</span><div className="relative"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input required minLength={8} type="password" value={secret} onChange={(event) => setSecret(event.target.value)} className="h-12 w-full rounded-2xl border border-white/10 bg-white/[.06] pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-300/60" placeholder="Sua senha" /></div></label>}{error && <p role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-300/[.08] p-3 text-xs font-semibold text-rose-200">{error}</p>}<Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={18} /> : isParent ? <LockKeyhole size={17} /> : <KeyRound size={17} />}{loading ? "Validando..." : demoMode ? "Continuar na demonstração" : "Entrar na Base"}</Button></form></div></div>;
}
