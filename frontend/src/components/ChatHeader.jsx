import { XIcon, Info } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router";

function ChatHeader() {
  const navigate = useNavigate();
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
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
      className="flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 max-h-[84px] px-6 flex-1 backdrop-blur-sm transition-all duration-300 hover:bg-slate-800/70"
    >
      <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowInfo(!showInfo)}>
        <div className={`avatar ${isOnline ? "online" : "offline"} ring-2 ring-cyan-500/30`}>
          <div className="w-12 rounded-full">
            <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
          </div>
        </div>

        <div>
          <h3 className="text-slate-200 font-medium hover:text-white transition-colors">{selectedUser.fullName}</h3>
          <p className={`text-sm transition-colors ${isOnline ? "text-green-400 font-medium" : "text-slate-400"}`}>
            {isOnline ? "● Online" : "● Offline"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/profile")}
          className="btn btn-ghost btn-sm btn-circle hover:bg-slate-700/50 transition-all duration-200"
          title="View profile"
        >
          <Info className="w-5 h-5 text-slate-400 hover:text-slate-200 transition-colors" />
        </button>
        <button 
          onClick={() => setSelectedUser(null)}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
          title="Close chat (ESC)"
        >
          <XIcon className="w-5 h-5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" />
        </button>
      </div>
    </div>
  );
}
export default ChatHeader;
