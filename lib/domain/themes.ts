export const baseThemes = ["galaxy", "cyber", "kingdom", "arena", "heroes", "explorers"] as const;

export type BaseTheme = (typeof baseThemes)[number];

export const baseThemeLabels: Record<BaseTheme, string> = {
  galaxy: "Galaxy",
  cyber: "Cyber",
  kingdom: "Kingdom",
  arena: "Arena",
  heroes: "Heroes",
  explorers: "Explorers",
};

export function isBaseTheme(value: string): value is BaseTheme {
  return baseThemes.includes(value as BaseTheme);
}
