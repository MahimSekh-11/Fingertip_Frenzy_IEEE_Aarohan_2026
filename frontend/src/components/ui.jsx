import React, { useEffect, useRef, useState } from "react";
export function Notice({ children, error = false }) {
  return children ? (
    <div
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  ) : null;
}
export const Card = ({ children, className = "" }) => (
  <section className={`card ${className}`}>{children}</section>
);
export const Badge = ({ children }) => (
  <span className={"badge " + String(children).toLowerCase()}>
    {String(children).replaceAll("_", " ")}
  </span>
);
export function Field({ label, ...props }) {
  const id = React.useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} {...props} />
    </label>
  );
}
export function Button({ busy, children, ...props }) {
  return (
    <button {...props} disabled={busy || props.disabled} aria-busy={busy}>
      {busy ? "Working…" : children}
    </button>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" /> Loading your workspace…
    </div>
  );
}
export function Empty({ children }) {
  return <div className="empty">{children || "No records yet."}</div>;
}
export function useResource(load, deps = []) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    load()
      .then((d) => {
        if (alive) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [...deps, version]);
  return { data, error, loading, reload: () => setVersion((v) => v + 1) };
}
export function ConfirmDialog({ title, children, onConfirm, onClose, busy }) {
  const ref = useRef();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="confirm-title">
      <h2 id="confirm-title">{title}</h2>
      <p>{children}</p>
      <div className="actions">
        <Button className="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button className="danger" busy={busy} onClick={onConfirm}>
          Confirm
        </Button>
      </div>
    </dialog>
  );
}
export function Pager({ page, total, limit = 25, onPage }) {
  return (
    <div className="pager">
      <Button
        className="secondary"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </Button>
      <span>
        Page {page} · {total} records
      </span>
      <Button
        className="secondary"
        disabled={page * limit >= total}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
