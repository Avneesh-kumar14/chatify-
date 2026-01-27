import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useThemeStore } from "../store/useThemeStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import { useAuthStore } from "../store/useAuthStore";

function ContactList() {
  const { getAllContacts, allContacts, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);
  const getThemeConfig = useThemeStore((state) => state.getThemeConfig);
  const themeConfig = getThemeConfig();

  useEffect(() => {
    getAllContacts();
  }, []);

  if (isUsersLoading) return <UsersLoadingSkeleton />;
  if (!Array.isArray(allContacts) || allContacts.length === 0) return <div className="text-slate-500 text-center py-8">No contacts found</div>;

  return (
    <>
      {allContacts.map((contact) => {
        const isOnline = onlineUsers.includes(contact._id);
        return (
          <div
            key={contact._id}
            className={`bg-gradient-to-r ${themeConfig.bgGradient}/5 p-4 rounded-xl cursor-pointer 
              hover:${themeConfig.bgGradient}/20 transition-all duration-300 group
              border border-${themeConfig.border}/20 hover:border-${themeConfig.border}/50`}
            onClick={() => setSelectedUser(contact)}
          >
            <div className="flex items-center gap-4">
              <div className={`avatar ${isOnline ? "online" : "offline"} relative flex-shrink-0 group/avatar`}>
                <div className={`size-14 rounded-full ring-2 ring-${themeConfig.border} ring-offset-2 ring-offset-slate-900
                  overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:ring-offset-4
                  shadow-lg shadow-${themeConfig.border}/30 group-hover:shadow-${themeConfig.border}/50
                  relative before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:opacity-0
                  group-hover:before:opacity-10 before:transition-opacity before:duration-300`}>
                  <img 
                    src={contact.profilePic || "/avatar.png"} 
                    alt={contact.fullName}
                    className="size-full object-cover group-hover/avatar:scale-110 transition-transform duration-300"
                  />
                </div>
                {isOnline && (
                  <div className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-slate-900 
                    bg-gradient-to-br ${themeConfig.bgGradient}/80 animate-pulse`}></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-slate-100 font-semibold truncate group-hover:text-${themeConfig.border} 
                  transition-colors duration-300`}>
                  {contact.fullName}
                </h4>
                <p className={`text-xs transition-colors duration-300 ${
                  isOnline 
                    ? `text-${themeConfig.border}/80 font-medium` 
                    : "text-slate-500"
                }`}>
                  {isOnline ? "● Active now" : "● Offline"}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
export default ContactList;
