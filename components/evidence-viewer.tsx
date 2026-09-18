"use client";

import { useEffect, useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";
import Image from "next/image";

type LegacyEvidenceResponse = { evidence?: { dataUrl?: string | null } | null; error?: string };

export function EvidenceViewer({ assignmentId }: { assignmentId: string }) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function load() {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/missions/${assignmentId}/evidence/view`, { cache: "no-store" });
      if (response.ok) {
        setImage(URL.createObjectURL(await response.blob()));
        return;
      }
      const legacyResponse = await fetch(`/api/missions/${assignmentId}/evidence`, { cache: "no-store" });
      const legacyBody = (await legacyResponse.json()) as LegacyEvidenceResponse;
      if (!legacyResponse.ok || !legacyBody.evidence?.dataUrl) throw new Error(legacyBody.error ?? "Nenhuma foto disponível.");
      setImage(legacyBody.evidence.dataUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar a evidência."); }
    finally { setLoading(false); }
  }
  useEffect(() => () => { if (image?.startsWith("blob:")) URL.revokeObjectURL(image); }, [image]);
  return <div className="mt-2">{image ? <Image src={image} alt="Evidência da missão" width={320} height={192} unoptimized className="max-h-48 rounded-xl border border-white/10 object-cover" /> : <button type="button" onClick={load} disabled={loading} className="flex items-center gap-1 rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-2 py-1.5 text-[10px] font-bold text-cyan-100">{loading ? <LoaderCircle className="animate-spin" size={12} /> : <Camera size={12} />} {loading ? "Carregando" : "Ver foto"}</button>}{error && <p role="status" className="mt-1 text-[10px] text-amber-200">{error}</p>}</div>;
}
