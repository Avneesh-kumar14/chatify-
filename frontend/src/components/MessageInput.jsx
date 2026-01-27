import { useRef, useState } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useThemeStore } from "../store/useThemeStore";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon } from "lucide-react";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const theme = useThemeStore((state) => state.theme);
  const getThemeConfig = useThemeStore((state) => state.getThemeConfig);
  const themeConfig = getThemeConfig();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  const fileInputRef = useRef(null);

  const { sendMessage, isSoundEnabled } = useChatStore();

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    sendMessage({
      text: text.trim(),
      image: imagePreview,
    });
    setText("");
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={`p-4 border-t border-${themeConfig.border}/20 bg-gradient-to-r from-slate-900/50 via-slate-900/40 to-slate-900/50 backdrop-blur-lg`}>
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-3 flex items-center" style={{animation: "slideIn 0.3s ease-out"}}>
          <div className="relative group">
            <img
              src={imagePreview}
              alt="Preview"
              className={`w-20 h-20 object-cover rounded-xl border-2 border-${themeConfig.border}/60 group-hover:border-${themeConfig.border} 
                transition-all shadow-lg shadow-${themeConfig.border}/30 group-hover:shadow-${themeConfig.border}/50`}
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-all shadow-lg opacity-0 group-hover:opacity-100 duration-200"
              type="button"
              title="Remove image"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex space-x-3 items-end">
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            isSoundEnabled && playRandomKeyStrokeSound();
          }}
          className={`flex-1 bg-slate-800/60 border border-slate-700/40 rounded-xl py-3 px-4 text-slate-100 placeholder-slate-400 
            focus:ring-2 focus:ring-${themeConfig.border} focus:border-transparent transition-all duration-200 
            hover:border-${themeConfig.border}/50 hover:bg-slate-800/80 shadow-lg shadow-slate-900/20`}
          placeholder="Type a message... (Shift+Enter for new line)"
        />

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`btn btn-ghost btn-sm rounded-xl px-4 py-3 transition-all duration-200 ${
            imagePreview 
              ? `text-${themeConfig.border} bg-${themeConfig.border}/15 border border-${themeConfig.border}/30 hover:bg-${themeConfig.border}/25` 
              : `text-slate-400 hover:text-${themeConfig.border} hover:bg-slate-700/40 border border-transparent hover:border-slate-600`
          }`}
          title="Attach image"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <button
          type="submit"
          disabled={!text.trim() && !imagePreview}
          className={`bg-gradient-to-r ${themeConfig.bgGradient} text-white rounded-xl px-4 py-3 font-semibold 
            hover:shadow-lg hover:shadow-${themeConfig.border}/60 hover:scale-105 active:scale-95 
            transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
            border border-${themeConfig.border}/30 hover:border-${themeConfig.border}`}
          title="Send message (Enter)"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
export default MessageInput;
