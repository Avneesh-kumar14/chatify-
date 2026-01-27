import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance } from "../lib/axios.js";
import { useThemeStore } from "../store/useThemeStore.js";
import toast from "react-hot-toast";
import ConfirmationModal from "../components/ConfirmationModal";
import ThemeToggle from "../components/ThemeToggle";

function ProfilePage() {
  const navigate = useNavigate();
  const { authUser, logout, setAuthUser } = useAuthStore();
  const { getMessagesByUserId } = useChatStore();
  const { getThemeConfig } = useThemeStore();
  const themeConfig = getThemeConfig();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    profilePic: authUser?.profilePic || "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const fileInputRef = useRef(null);
  const borderColorMap = {
    cyan: "border-cyan-500",
    blue: "border-blue-500",
    purple: "border-purple-500",
    emerald: "border-emerald-500",
    rose: "border-rose-500",
    violet: "border-violet-500",
    amber: "border-amber-500",
  };

  const shadowColorMap = {
    cyan: "shadow-cyan-500/40",
    blue: "shadow-blue-500/40",
    purple: "shadow-purple-500/40",
    emerald: "shadow-emerald-500/40",
    rose: "shadow-rose-500/40",
    violet: "shadow-violet-500/40",
    amber: "shadow-amber-500/40",
  };

  const buttonGradientMap = {
    cyan: "from-cyan-500 to-blue-500",
    blue: "from-blue-500 to-cyan-500",
    purple: "from-purple-500 to-violet-500",
    emerald: "from-emerald-500 to-green-500",
    rose: "from-rose-500 to-pink-500",
    violet: "from-violet-500 to-purple-500",
    amber: "from-amber-500 to-orange-500",
  };

  const statusColorMap = {
    cyan: "from-cyan-500 to-blue-500",
    blue: "from-blue-500 to-cyan-500",
    purple: "from-purple-500 to-violet-500",
    emerald: "from-emerald-500 to-green-500",
    rose: "from-rose-500 to-pink-500",
    violet: "from-violet-500 to-purple-500",
    amber: "from-amber-500 to-orange-500",
  };

  const borderClass = borderColorMap[themeConfig.border] || "border-cyan-500";
  const shadowClass = shadowColorMap[themeConfig.border] || "shadow-cyan-500/40";
  const buttonGradientClass = buttonGradientMap[themeConfig.border] || "from-cyan-500 to-blue-500";
  const statusGradientClass = statusColorMap[themeConfig.border] || "from-cyan-500 to-blue-500";

  if (!authUser) {
    return <div>Loading...</div>;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        profilePic: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!formData.fullName.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.put("/auth/update-profile", formData);
      if (response.data.success) {
        toast.success("Profile updated successfully! 🎉", {
          duration: 3000,
          style: {
            background: "#10b981",
            color: "#fff",
            borderRadius: "0.5rem",
            padding: "16px",
            fontWeight: "500",
          },
        });
        // Update the auth store with new user data
        setAuthUser(response.data.data);
        setIsEditing(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile", {
        duration: 3000,
        style: {
          background: "#ef4444",
          color: "#fff",
          borderRadius: "0.5rem",
          padding: "16px",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      toast.success("See you soon! 👋", {
        duration: 2000,
        style: {
          background: "#3b82f6",
          color: "#fff",
          borderRadius: "0.5rem",
          padding: "16px",
          fontWeight: "500",
        },
      });
      setTimeout(() => navigate("/login"), 500);
    } catch (error) {
      toast.error("Error logging out", {
        duration: 3000,
        style: {
          background: "#ef4444",
          color: "#fff",
          borderRadius: "0.5rem",
          padding: "16px",
        },
      });
    } finally {
      setLogoutLoading(false);
      setLogoutConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
      <div className="absolute top-0 -left-4 size-96 bg-pink-500 opacity-20 blur-[100px]" />
      <div className="absolute bottom-0 -right-4 size-96 bg-cyan-500 opacity-20 blur-[100px]" />
      
      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header with Theme Toggle */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/")}
            className={`btn btn-sm btn-ghost gap-2 hover:bg-slate-700/50 transition-all text-cyan-400 hover:text-cyan-300`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Chats
          </button>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <ThemeToggle />
        </div>

        {/* Profile Card */}
        <div className={`bg-gradient-to-br from-slate-800/60 to-slate-800/40 shadow-2xl border ${borderClass}/30 rounded-xl transition-all duration-300 hover:shadow-lg p-8`}>
          <div className="space-y-6">
            {/* Profile Picture */}
            <div className="flex justify-center mb-8">
              <div className="relative group">
                <img
                  src={formData.profilePic || "https://ui-avatars.com/api/?name=" + authUser.fullName}
                  alt={authUser.fullName}
                  className={`w-32 h-32 rounded-full border-4 ${borderClass} object-cover shadow-lg ${shadowClass} group-hover:scale-110 transition-all duration-300`}
                />
                {isEditing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`absolute bottom-0 right-0 btn btn-sm btn-circle btn-${themeConfig.border} transition-all`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePicChange}
                />
              </div>
            </div>

            {/* User Information */}
            {!isEditing ? (
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="text-sm text-slate-400">Full Name</label>
                  <p className="text-lg font-semibold text-white">{authUser.fullName}</p>
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm text-slate-400">Email</label>
                  <p className="text-lg text-slate-200 break-all">{authUser.email}</p>
                </div>

                {/* Bio */}
                <div>
                  <label className="text-sm text-slate-400">Bio</label>
                  <p className="text-lg text-slate-200">
                    {authUser.bio || <span className="text-slate-500">No bio added</span>}
                  </p>
                </div>

                {/* Online Status */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-400">Status</label>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${statusGradientClass}`}></div>
                    <span className="text-emerald-400 font-medium">Online</span>
                  </div>
                </div>

                {/* Member Since */}
                <div>
                  <label className="text-sm text-slate-400">Member Since</label>
                  <p className="text-slate-200">
                    {authUser.createdAt
                      ? new Date(authUser.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Date not available"}
                  </p>
                </div>

                <div className="divider"></div>

                {/* Edit Button */}
                <button
                  onClick={() => setIsEditing(true)}
                  className={`btn btn-sm w-full gap-2 bg-gradient-to-r ${buttonGradientClass} text-white border-0 
                    hover:shadow-lg transition-all duration-200 font-semibold`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
            ) : (
              // Edit Mode
              <div className="space-y-4">
                {/* Full Name Input */}
                <div className="form-control">
                  <label className="label">
                    <span className={`label-text text-${themeConfig.border} font-semibold`}>Full Name</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className={`input input-bordered input-sm bg-slate-700/60 border-slate-600 text-white placeholder-slate-400 
                      focus:border-${themeConfig.border} focus:ring-2 focus:ring-${themeConfig.border}/30 transition-all`}
                  />
                </div>

                {/* Bio Input */}
                <div className="form-control">
                  <label className="label">
                    <span className={`label-text text-${themeConfig.border} font-semibold`}>Bio</span>
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Write a short bio... (optional)"
                    className={`textarea textarea-bordered textarea-sm bg-slate-700/60 border-slate-600 text-white placeholder-slate-400 
                      focus:border-${themeConfig.border} focus:ring-2 focus:ring-${themeConfig.border}/30 transition-all`}
                    rows="4"
                  />
                </div>

                <div className="divider"></div>

                {/* Save & Cancel Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                    className={`btn btn-sm flex-1 gap-2 bg-gradient-to-r ${themeConfig.bgGradient} text-white border-0 
                      disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold 
                      hover:shadow-lg hover:shadow-${themeConfig.border}/50`}
                  >
                    {isLoading ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        fullName: authUser.fullName,
                        bio: authUser.bio || "",
                        profilePic: authUser.profilePic || "",
                      });
                    }}
                    disabled={isLoading}
                    className={`btn btn-sm flex-1 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500 
                      hover:text-${themeConfig.border} disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="mt-8">
          <button
            onClick={() => setLogoutConfirm(true)}
            disabled={logoutLoading}
            className={`btn btn-outline w-full gap-2 text-red-400 border-red-500/50 
              hover:bg-red-500/10 hover:border-red-500 hover:text-red-300 transition-all duration-300 
              font-semibold text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {logoutLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Logging out...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </>
            )}
          </button>
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
        isLoading={logoutLoading}
      />
    </div>
  );
}

export default ProfilePage;
