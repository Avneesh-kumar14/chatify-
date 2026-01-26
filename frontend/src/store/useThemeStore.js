import { create } from "zustand";

const THEME_COLORS = {
  slate: {
    name: "Slate (Dark)",
    primary: "bg-slate-900",
    secondary: "bg-slate-800",
    accent: "text-slate-200",
    border: "border-slate-700",
    button: "btn-primary",
    bgGradient: "from-slate-900 via-slate-900 to-slate-800",
  },
  slate2: {
    name: "Slate Dark",
    primary: "bg-slate-950",
    secondary: "bg-slate-800",
    accent: "text-slate-100",
    border: "border-slate-600",
    button: "btn-primary",
    bgGradient: "from-slate-950 via-slate-900 to-slate-950",
  },
  blue: {
    name: "Ocean Blue",
    primary: "bg-blue-950",
    secondary: "bg-blue-900",
    accent: "text-blue-100",
    border: "border-blue-800",
    button: "btn-info",
    bgGradient: "from-blue-950 via-blue-900 to-blue-950",
  },
  purple: {
    name: "Purple Dream",
    primary: "bg-purple-950",
    secondary: "bg-purple-900",
    accent: "text-purple-100",
    border: "border-purple-800",
    button: "btn-primary",
    bgGradient: "from-purple-950 via-purple-900 to-purple-950",
  },
  indigo: {
    name: "Indigo Night",
    primary: "bg-indigo-950",
    secondary: "bg-indigo-900",
    accent: "text-indigo-100",
    border: "border-indigo-800",
    button: "btn-primary",
    bgGradient: "from-indigo-950 via-indigo-900 to-indigo-950",
  },
  gray: {
    name: "Minimalist Gray",
    primary: "bg-gray-900",
    secondary: "bg-gray-800",
    accent: "text-gray-200",
    border: "border-gray-700",
    button: "btn-accent",
    bgGradient: "from-gray-900 via-gray-800 to-gray-900",
  },
  neutral: {
    name: "Neutral",
    primary: "bg-neutral-900",
    secondary: "bg-neutral-800",
    accent: "text-neutral-200",
    border: "border-neutral-700",
    button: "btn-neutral",
    bgGradient: "from-neutral-900 via-neutral-800 to-neutral-900",
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
