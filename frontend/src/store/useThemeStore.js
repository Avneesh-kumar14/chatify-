import { create } from "zustand";

const THEME_COLORS = {
  slate: {
    name: "Soft Slate",
    primary: "bg-slate-900",
    secondary: "bg-slate-800",
    accent: "text-slate-200",
    border: "cyan",
    accentColor: "from-cyan-500 to-blue-500",
    bgGradient: "from-cyan-500 to-blue-500",
    shadowColor: "shadow-cyan-500/20",
  },
  ocean: {
    name: "Calm Ocean",
    primary: "bg-slate-900",
    secondary: "bg-slate-800",
    accent: "text-blue-100",
    border: "blue",
    accentColor: "from-blue-400 to-cyan-400",
    bgGradient: "from-blue-400 to-cyan-400",
    shadowColor: "shadow-blue-400/20",
  },
  purple: {
    name: "Lavender Mist",
    primary: "bg-slate-900",
    secondary: "bg-slate-800",
    accent: "text-purple-100",
    border: "purple",
    accentColor: "from-purple-400 to-violet-400",
    bgGradient: "from-purple-400 to-violet-400",
    shadowColor: "shadow-purple-400/20",
  },
  emerald: {
    name: "Sage Green",
    primary: "bg-slate-900",
    secondary: "bg-slate-800",
    accent: "text-emerald-100",
    border: "emerald",
    accentColor: "from-emerald-400 to-green-400",
    bgGradient: "from-emerald-400 to-green-400",
    shadowColor: "shadow-emerald-400/20",
  },
  rose: {
    name: "Soft Rose",
    primary: "bg-slate-900",
    secondary: "bg-slate-800",
    accent: "text-rose-100",
    border: "rose",
    accentColor: "from-rose-400 to-pink-400",
    bgGradient: "from-rose-400 to-pink-400",
    shadowColor: "shadow-rose-400/20",
  },
  violet: {
    name: "Gentle Violet",
    primary: "bg-slate-900",
    secondary: "bg-slate-800",
    accent: "text-violet-100",
    border: "violet",
    accentColor: "from-indigo-400 to-purple-400",
    bgGradient: "from-indigo-400 to-purple-400",
    shadowColor: "shadow-indigo-400/20",
  },
  amber: {
    name: "Warm Gold",
    primary: "bg-slate-900",
    secondary: "bg-slate-800",
    accent: "text-amber-100",
    border: "amber",
    accentColor: "from-amber-400 to-orange-400",
    bgGradient: "from-amber-400 to-orange-400",
    shadowColor: "shadow-amber-400/20",
  },
};

export const useThemeStore = create((set, get) => ({
  theme: localStorage.getItem("theme") || "slate",
  
  setTheme: (themeName) => {
    if (THEME_COLORS[themeName]) {
      localStorage.setItem("theme", themeName);
      set({ theme: themeName });
    }
  },
  
  getThemeConfig: () => {
    return THEME_COLORS[get().theme] || THEME_COLORS.slate;
  },
  
  getAvailableThemes: () => {
    return Object.entries(THEME_COLORS).map(([key, value]) => ({
      id: key,
      name: value.name,
    }));
  },
}));
