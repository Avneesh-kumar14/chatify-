import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

function ProfilePage() {
  const navigate = useNavigate();
  const { authUser, logout, setAuthUser } = useAuthStore();
  const { getMessagesByUserId } = useChatStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    profilePic: authUser?.profilePic || "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

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
        toast.success("Profile updated successfully");
        // Update the auth store with new user data
        setAuthUser(response.data.data);
        setIsEditing(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/chat")}
            className="btn btn-sm btn-ghost gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Chats
          </button>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <div className="w-10" />
        </div>

        {/* Profile Card */}
        <div className="card bg-slate-800 shadow-xl border border-slate-700">
          <div className="card-body">
            {/* Profile Picture */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <img
                  src={formData.profilePic || "https://ui-avatars.com/api/?name=" + authUser.fullName}
                  alt={authUser.fullName}
                  className="w-32 h-32 rounded-full border-4 border-cyan-600 object-cover"
                />
                {isEditing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 btn btn-sm btn-circle btn-cyan"
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
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-slate-200">Online</span>
                  </div>
                </div>

                {/* Member Since */}
                <div>
                  <label className="text-sm text-slate-400">Member Since</label>
                  <p className="text-slate-200">
                    {new Date(authUser.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="divider"></div>

                {/* Edit Button */}
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-primary btn-sm w-full gap-2"
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
                    <span className="label-text">Full Name</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="input input-bordered input-sm bg-slate-700 text-white placeholder-slate-400"
                  />
                </div>

                {/* Bio Input */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Bio</span>
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Write a short bio... (optional)"
                    className="textarea textarea-bordered textarea-sm bg-slate-700 text-white placeholder-slate-400"
                    rows="4"
                  />
                </div>

                <div className="divider"></div>

                {/* Save & Cancel Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                    className="btn btn-primary btn-sm flex-1 gap-2"
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
                    className="btn btn-ghost btn-sm flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="mt-6">
          <button
            onClick={handleLogout}
            className="btn btn-error btn-outline w-full gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
