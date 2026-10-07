import React, { useEffect, useRef, useState } from "react";
import { FileText, X } from "lucide-react";

export function DetectiveEvidence({ clues, currentClue, onSelect, onClose }) {
  const dialog = useRef(null);
  const exhibit = useRef(null);
  const [failedImage, setFailedImage] = useState(null);
  useEffect(() => {
    if (onClose) {
      const node = dialog.current;
      node.showModal();
      return () => node.close();
    }
  }, [Boolean(onClose)]);
  useEffect(() => {
    if (exhibit.current) exhibit.current.scrollTop = 0;
  }, [currentClue]);
  const content = (
    <>
      <header className="detective-evidence-heading">
        <strong>
          <FileText size={16} /> Case clues
        </strong>
        {onClose && (
          <button
            type="button"
            aria-label="Close clue reader"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        )}
      </header>
      <nav className="detective-clue-tabs" aria-label="Case clues">
        {clues.map((clue, index) => (
          <button
            key={clue.id || clue._id || index}
            type="button"
            aria-pressed={currentClue === clue}
            onClick={() => onSelect(clue)}
            aria-label={`Clue ${index + 1}: ${clue.title || "Evidence"}`}
          >
            {index + 1}. {clue.title || "Evidence"}
          </button>
        ))}
      </nav>
      {currentClue ? (
        <section className="detective-evidence-card">
          <div className="detective-evidence-meta">
            Evidence {clues.indexOf(currentClue) + 1} ·{" "}
            {currentClue.evidenceType || "text"}
          </div>
          <h2>{currentClue.title || "Case evidence"}</h2>
          <div
            className="detective-exhibit"
            ref={exhibit}
            role="region"
            aria-label="Clue evidence"
            tabIndex={0}
          >
            {currentClue.evidenceType === "image" && currentClue.evidence ? (
              <>
                <img
                  key={currentClue.evidence}
                  src={currentClue.evidence}
                  alt={currentClue.title || "Evidence image"}
                  onError={() => setFailedImage(currentClue.evidence)}
                />
                {failedImage === currentClue.evidence && (
                  <p role="status">
                    The evidence image could not load. Ask the organizer to
                    check its image URL.
                  </p>
                )}
                <a
                  href={currentClue.evidence}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open full-size evidence
                </a>
              </>
            ) : currentClue.evidence ? (
              <pre>{currentClue.evidence}</pre>
            ) : !currentClue.description ? (
              <p>
                No evidence was attached to this clue. Ask the organizer to add
                it.
              </p>
            ) : null}
            {currentClue.description && (
              <p className="detective-evidence-description">
                {currentClue.description}
              </p>
            )}
          </div>
        </section>
      ) : (
        <p className="detective-no-clues" role="status">
          No clues were included in this attempt. Ask the organizer to add
          evidence and reset the attempt if this case was updated after it
          started.
        </p>
      )}
    </>
  );
  return onClose ? (
    <dialog
      ref={dialog}
      className="detective-evidence-dialog"
      aria-label="Case clue reader"
      onCancel={onClose}
    >
      {content}
    </dialog>
  ) : (
    <div className="detective-evidence-column">{content}</div>
  );
}
