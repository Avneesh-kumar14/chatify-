import { XIcon, Info } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useThemeStore } from "../store/useThemeStore";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router";

function ChatHeader() {
  const navigate = useNavigate();
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);
  const getThemeConfig = useThemeStore((state) => state.getThemeConfig);
  const themeConfig = getThemeConfig();
  const [showInfo, setShowInfo] = useState(false);
  const isOnline = onlineUsers.includes(selectedUser._id);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };

    window.addEventListener("keydown", handleEscKey);

    // cleanup function
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  return (
    <div
      className={`flex justify-between items-center bg-gradient-to-r from-slate-900/80 to-slate-800/80 
        border-b border-${themeConfig.border}/30 max-h-[84px] px-6 flex-1 backdrop-blur-lg 
        transition-all duration-300 hover:border-${themeConfig.border}/50`}
    >
      <div className="flex items-center space-x-4 cursor-pointer hover:opacity-90 transition-opacity group" 
        onClick={() => setShowInfo(!showInfo)}>
        <div className={`avatar ${isOnline ? "online" : "offline"} relative flex-shrink-0`}>
          <div className={`size-14 rounded-full ring-2 ring-${themeConfig.border} ring-offset-2 ring-offset-slate-900
            overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:ring-offset-4
            shadow-lg shadow-${themeConfig.border}/40 group-hover:shadow-${themeConfig.border}/60`}>
            <img 
              src={selectedUser.profilePic || "/avatar.png"} 
              alt={selectedUser.fullName}
              className="size-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          {isOnline && (
            <div className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-slate-900 
              bg-gradient-to-br ${themeConfig.bgGradient} animate-pulse shadow-lg`}></div>
          )}
        </div>

        <div>
          <h3 className={`text-slate-200 font-semibold group-hover:text-${themeConfig.border} 
            transition-colors duration-300`}>
            {selectedUser.fullName}
          </h3>
          <p className={`text-sm font-medium transition-colors duration-300 ${
            isOnline 
              ? `text-${themeConfig.border}/90` 
              : "text-slate-500"
          }`}>
            {isOnline ? "● Online" : "● Offline"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/profile")}
          className={`btn btn-ghost btn-sm btn-circle hover:bg-${themeConfig.border}/20 
            hover:text-${themeConfig.border} transition-all duration-200`}
          title="View profile"
        >
          <Info className={`w-5 h-5 text-slate-400 group-hover:text-${themeConfig.border} transition-colors`} />
        </button>
        <button 
          onClick={() => setSelectedUser(null)}
          className={`p-2 hover:bg-${themeConfig.border}/20 rounded-lg transition-all duration-200`}
          title="Close chat (ESC)"
        >
          <XIcon className={`w-5 h-5 text-slate-400 hover:text-${themeConfig.border} transition-colors cursor-pointer`} />
        </button>
      </div>
    </div>
  );
}
export default ChatHeader;
