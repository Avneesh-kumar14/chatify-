import { useChatStore } from "../store/useChatStore";
import { MessageSquare, Users } from "lucide-react";

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = useChatStore();

  return (
    <div className="flex gap-2 p-3 m-2 bg-slate-700/20 rounded-lg backdrop-blur-sm">
      <button
        onClick={() => setActiveTab("chats")}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
          activeTab === "chats"
            ? "bg-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/20"
            : "text-slate-400 hover:text-slate-300 hover:bg-slate-600/20"
        }`}
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">Chats</span>
      </button>

      <button
        onClick={() => setActiveTab("contacts")}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
          activeTab === "contacts"
            ? "bg-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/20"
            : "text-slate-400 hover:text-slate-300 hover:bg-slate-600/20"
        }`}
      >
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">Contacts</span>
      </button>
    </div>
  );
}
export default ActiveTabSwitch;
