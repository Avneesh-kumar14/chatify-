import { useRef, useState } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon } from "lucide-react";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
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
    <div className="p-4 border-t border-slate-700/30 bg-gradient-to-r from-slate-900/40 via-slate-900/30 to-slate-900/40 backdrop-blur-md">
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-3 flex items-center" style={{animation: "slideIn 0.3s ease-out"}}>
          <div className="relative group">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-xl border-2 border-cyan-500/60 group-hover:border-cyan-400 transition-all shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40"
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
          className="flex-1 bg-slate-800/60 border border-slate-700/40 rounded-xl py-3 px-4 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 hover:border-slate-600 hover:bg-slate-800/80 shadow-lg shadow-slate-900/20"
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
            imagePreview ? "text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25" : "text-slate-400 hover:text-cyan-400 hover:bg-slate-700/40 border border-transparent hover:border-slate-600"
          }`}
          title="Attach image"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <button
          type="submit"
          disabled={!text.trim() && !imagePreview}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl px-4 py-3 font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/60 hover:scale-105 active:scale-95 border border-cyan-400/30 hover:border-cyan-300"
          title="Send message (Enter)"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
export default MessageInput;
