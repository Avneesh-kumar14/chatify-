import { useState, useRef } from "react";
import { LogOutIcon, VolumeOffIcon, Volume2Icon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useNavigate } from "react-router";
import ThemeToggle from "./ThemeToggle";
import ConfirmationModal from "./ConfirmationModal";

const mouseClickSound = new Audio("/sounds/mouse-click.mp3");

function ProfileHeader() {
  const { logout, authUser, updateProfile } = useAuthStore();
  const { isSoundEnabled, toggleSound } = useChatStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setTimeout(() => navigate("/login"), 300);
    } finally {
      setIsLoggingOut(false);
      setLogoutConfirm(false);
    }
  };

  return (
    <>
      <div className="p-5 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/40 via-slate-800/30 to-slate-800/40 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* AVATAR */}
            <div className="avatar online">
              <button
                className="size-16 rounded-full overflow-hidden relative group ring-2 ring-cyan-500/50 hover:ring-cyan-400 transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
                onClick={() => fileInputRef.current.click()}
              >
                <img
                  src={selectedImg || authUser.profilePic || "/avatar.png"}
                  alt="User image"
                  className="size-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                  <span className="text-white text-xs font-semibold">Edit</span>
                </div>
              </button>

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* USERNAME & ONLINE TEXT */}
            <div className="cursor-pointer group" onClick={() => navigate("/profile")}>
              <h3 className="text-slate-100 font-semibold text-sm group-hover:text-cyan-300 transition-colors duration-200 max-w-[160px] truncate">
                {authUser.fullName}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-slate-400 text-xs">Active now</p>
              </div>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-1 items-center bg-slate-700/20 px-2 py-1 rounded-lg">
            {/* THEME TOGGLE */}
            <ThemeToggle />

            {/* SOUND TOGGLE BTN */}
            <button
              className="text-slate-400 hover:text-cyan-400 transition-all duration-200 p-2 hover:bg-slate-600/30 rounded-md"
              onClick={() => {
                mouseClickSound.currentTime = 0;
                mouseClickSound.play().catch((error) => console.log("Audio play failed:", error));
                toggleSound();
              }}
              title={isSoundEnabled ? "Disable notifications" : "Enable notifications"}
            >
              {isSoundEnabled ? (
                <Volume2Icon className="size-5" />
              ) : (
                <VolumeOffIcon className="size-5" />
              )}
            </button>

            {/* LOGOUT BTN */}
            <button
              className="text-slate-400 hover:text-red-400 transition-all duration-200 p-2 hover:bg-red-500/10 rounded-md"
              onClick={() => setLogoutConfirm(true)}
              title="Logout"
            >
              <LogOutIcon className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={logoutConfirm}
        title="Logout"
        message="Are you sure you want to logout? You'll need to login again to access your chats."
        onConfirm={handleLogout}
        onCancel={() => setLogoutConfirm(false)}
        confirmText="Logout"
        cancelText="Cancel"
        type="logout"
        isLoading={isLoggingOut}
      />
    </>
  );
}
export default ProfileHeader;
