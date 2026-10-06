import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Button, Notice } from "../components/ui";
import { catalog } from "./Home";
export function EmbeddedGame() {
  const { gameId } = useParams(),
    [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();
  if (!["memory", "calculator"].includes(gameId))
    return (
      <Shell title="Challenge unavailable">
        <Notice error>This challenge does not exist.</Notice>
        <Button onClick={() => navigate("/games")}>Return to games</Button>
      </Shell>
    );
  return (
    <Shell
      title={catalog.find((g) => g.id === gameId).name}
      subtitle="Original game experience · Shared platform account"
    >
      <Notice>{!loaded ? "Loading the arena…" : ""}</Notice>
      <iframe
        key={gameId}
        className="game-frame"
        title={catalog.find((g) => g.id === gameId).name}
        src={`/games/${gameId}/index.html`}
        allow="camera 'self'"
        sandbox="allow-scripts allow-same-origin allow-top-navigation-by-user-activation"
        onLoad={() => setLoaded(true)}
      />
      <Button className="secondary" onClick={() => navigate("/dashboard")}>
        Return to dashboard
      </Button>
    </Shell>
  );
}
