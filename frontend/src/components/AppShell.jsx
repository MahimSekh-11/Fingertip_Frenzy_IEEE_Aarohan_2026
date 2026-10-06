import React from "react";
import { Shell } from "./Shell";
export function AppShell({ children }) {
  return (
    <Shell>
      <div className="vortex-game">{children}</div>
    </Shell>
  );
}
