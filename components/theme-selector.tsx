"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { baseThemeLabels, baseThemes, isBaseTheme, type BaseTheme } from "@/lib/domain/themes";

const STORAGE_KEY = "casaquest-theme";

function applyTheme(theme: BaseTheme) {
  document.documentElement.dataset.theme = theme;
}

function getInitialTheme(): BaseTheme {
  if (typeof window === "undefined") return "galaxy";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored && isBaseTheme(stored) ? stored : "galaxy";
}

export function ThemeSelector() {
  const [theme, setTheme] = useState<BaseTheme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function changeTheme(value: string) {
    if (!isBaseTheme(value)) return;
    setTheme(value);
    applyTheme(value);
    window.localStorage.setItem(STORAGE_KEY, value);
  }

  return <label className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-semibold text-slate-400"><Palette size={14} className="text-cyan-300" /><span>Tema da base</span><select aria-label="Tema da base" value={theme} onChange={(event) => changeTheme(event.target.value)} className="bg-transparent text-xs font-bold text-white outline-none"><option className="bg-[#101631]" value="galaxy">{baseThemeLabels.galaxy}</option>{baseThemes.filter((item) => item !== "galaxy").map((item) => <option className="bg-[#101631]" key={item} value={item}>{baseThemeLabels[item]}</option>)}</select></label>;
}
