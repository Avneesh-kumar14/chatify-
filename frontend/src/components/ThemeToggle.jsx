import { Palette } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";
import { useState, useRef, useEffect } from "react";

function ThemeToggle() {
  const { theme, setTheme, getAvailableThemes } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const availableThemes = getAvailableThemes();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-sm btn-ghost gap-2 hover:bg-slate-700/50 transition-colors"
        title="Toggle theme"
      >
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Theme</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-max p-2" style={{animation: "zoomIn 0.2s ease-out"}}>
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Choose Theme
          </div>
          <div className="divider divider-horizontal my-1"></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
            {availableThemes.map((themeOption) => (
              <button
                key={themeOption.id}
                onClick={() => {
                  setTheme(themeOption.id);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  theme === themeOption.id
                    ? "bg-cyan-500 text-white font-medium"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      theme === themeOption.id ? "ring-2 ring-white" : ""
                    }`}
                    style={{
                      backgroundColor:
                        themeOption.id === "slate"
                          ? "#1e293b"
                          : themeOption.id === "blue"
                          ? "#172554"
                          : themeOption.id === "purple"
                          ? "#3f0f5c"
                          : themeOption.id === "indigo"
                          ? "#312e81"
                          : themeOption.id === "gray"
                          ? "#111827"
                          : themeOption.id === "neutral"
                          ? "#171717"
                          : "#0f172a",
                    }}
                  />
                  {themeOption.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;
