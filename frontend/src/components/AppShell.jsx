import React from "react";
import { Shell } from "./Shell";
import { useLocation } from "react-router-dom";
import { useAuth } from "./Auth";
import { AdminTestControls } from "./AdminTestControls";
export function AppShell({ children }) {
  const { user } = useAuth();
  const game = useLocation().pathname.split("/").at(-1);
  return (
    <Shell>
      {user?.role === "ADMIN" && <AdminTestControls game={game} />}
      <div className="vortex-game">{children}</div>
    </Shell>
  );
}
