"use client";

interface DeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteModal({ open, onClose, onConfirm }: DeleteModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
          Delete Product
        </h2>
        <p className="muted" style={{ marginBottom: 22 }}>
          This product will be removed from the catalog.
        </p>

        <div className="toolbar" style={{ justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn btn-danger">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
