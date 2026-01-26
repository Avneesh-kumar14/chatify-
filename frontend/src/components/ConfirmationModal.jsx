import { AlertCircle, CheckCircle, Trash2, LogOut } from "lucide-react";

function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning", // 'warning', 'danger', 'success'
  isLoading = false,
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "danger":
        return <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-4" />;
      case "logout":
        return <LogOut className="w-12 h-12 text-amber-400 mx-auto mb-4" />;
      case "success":
        return <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />;
      default:
        return <AlertCircle className="w-12 h-12 text-cyan-400 mx-auto mb-4" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case "danger":
        return "btn-error";
      case "logout":
        return "btn-warning";
      default:
        return "btn-primary";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{animation: "fadeIn 0.2s ease-out"}}>
      <div className="card bg-slate-800 shadow-2xl border border-slate-700 max-w-sm w-full" style={{animation: "zoomIn 0.2s ease-out"}}>
        <div className="card-body items-center text-center">
          {getIcon()}

          <h2 className="card-title text-xl text-white mb-2">{title}</h2>

          <p className="text-slate-300 mb-6">{message}</p>

          <div className="card-actions gap-3 w-full">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="btn btn-ghost btn-sm flex-1"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`btn btn-sm flex-1 gap-2 ${getButtonColor()}`}
            >
              {isLoading && <span className="loading loading-spinner loading-xs"></span>}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
