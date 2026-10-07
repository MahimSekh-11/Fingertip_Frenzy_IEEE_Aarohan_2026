import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Notice } from "./ui";
import { request } from "../services/api";

export function AdminTestControls({ game }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState(null);
  useEffect(() => {
    if (game !== "calculator") return;
    let alive = true;
    const refresh = () =>
      request("/games/calculator/state")
        .then((data) => {
          if (alive) {
            setState(data);
            setError("");
          }
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    refresh();
    const timer = setInterval(refresh, 1500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [game]);
  const act = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const event = (body) =>
    act(async () => {
      setState(
        await request("/games/calculator/event", { method: "POST", body }),
      );
    });
  return (
    <section className="admin-test-panel" aria-label="Administrator game test">
      <div className="table-toolbar">
        <div>
          <strong>Admin test mode</strong>
          <p>
            Private practice attempts. Scores do not enter the leaderboard or
            team results.
          </p>
        </div>
        <div className="actions">
          <Link className="button secondary" to={`/admin/games/${game}`}>
            Back to game settings
          </Link>
          <Button
            busy={busy}
            onClick={() =>
              act(async () => {
                await request(`/admin/games/${game}/test/reset`, {
                  method: "POST",
                });
                await request(`/games/${game}/start`, { method: "POST" });
                window.location.reload();
              })
            }
          >
            New test attempt
          </Button>
        </div>
      </div>
      <Notice error>{error}</Notice>
      {game === "calculator" && state && (
        <div className="test-calculator-controls">
          <p>
            Test all three players here, or use the camera below. Current role:{" "}
            <b>{state.you.role}</b> · {state.phase} · {state.score} points
          </p>
          <div className="actions">
            {["X", "Y", "Z"].map((role) => (
              <Button
                key={role}
                busy={busy}
                className={state.you.role === role ? "" : "secondary"}
                aria-pressed={state.you.role === role}
                onClick={() => event({ type: "role", role })}
              >
                Player {role}
              </Button>
            ))}
            <Button
              busy={busy}
              disabled={state.phase !== "ASSIGN"}
              onClick={() => event({ type: "start" })}
            >
              Start countdown
            </Button>
          </div>
          <div className="test-digit-controls">
            {Array.from({ length: 10 }, (_, digit) => (
              <Button
                key={digit}
                busy={busy}
                disabled={state.phase !== "PLAYING"}
                onClick={() => event({ type: "digit", digit, conf: 1 })}
              >
                {digit}
              </Button>
            ))}
            <Button
              className="secondary"
              busy={busy}
              disabled={state.phase !== "PLAYING"}
              onClick={() => event({ type: "digit", digit: null, conf: 1 })}
            >
              Clear digit
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
