/* Same-origin session adapter. No credentials or tokens are passed to the game. */
window.platformApi = async (path, body) => {
  const res = await fetch("/api" + path, {
    credentials: "same-origin",
    signal: AbortSignal.timeout(15000),
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  if (res.status === 401) {
    window.visionEngine?.stopCamera();
    parent.dispatchEvent(new parent.Event("session-expired"));
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not save your game.");
  return data;
};
window.app = {
  switchView: () => {
    parent.location.href = "/dashboard";
  },
  openModal: (id) => document.getElementById(id)?.classList.add("active"),
  closeModal: (id) => document.getElementById(id)?.classList.remove("active"),
  showToast(message, type = "info") {
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = message;
    document.getElementById("toast-container").appendChild(el);
    setTimeout(() => el.remove(), 6000);
  },
  leaveTeam: () => {
    parent.location.href = "/dashboard";
  },
};
addEventListener("DOMContentLoaded", async () => {
  const camera = document.querySelector(
    ".gesture-center-panel .camera-feed-card",
  );
  if (camera) document.querySelector(".gesture-right-panel").prepend(camera);
  try {
    const { user } = await window.platformApi("/auth/me");
    const team =
      user.role === "ADMIN"
        ? { name: "Administrator test arena", code: "TEST ONLY" }
        : (await window.platformApi("/teams/me")).team;
    if (!team)
      throw new Error(
        "Create or join a team from your dashboard before playing.",
      );
    document
      .querySelectorAll(".view-section")
      .forEach((el) => el.classList.remove("active"));
    document.getElementById("view-game-arena").classList.add("active");
    await window.gameEngine.loadConfig();
    window.gameEngine.setParticipantData(
      {
        name: user.name,
        rollNumber: user.rollNo || "ADMIN TEST",
        teamCode: team.code,
      },
      team,
    );
    const state = await window.platformApi("/games/memory/state");
    state.stages.forEach(
      (s) => (window.gameEngine.stageScores[s.stage] = s.score),
    );
    window.gameEngine.totalScore = state.score;
    if (state.status === "COMPLETED") {
      state.stages.forEach(
        (s) => (window.gameEngine.stageScores[s.stage] = s.score),
      );
      window.gameEngine.totalScore = state.score;
      window.gameEngine.showFinalResults();
      return;
    }
    if (state.active?.started)
      throw new Error(
        "This stage was interrupted. Ask the event organizer to reset your attempt.",
      );
    if (state.status === "NOT_STARTED")
      await window.platformApi("/games/memory/start", {});
    await window.gameEngine.startStage(state.stage + 1);
  } catch (error) {
    window.visionEngine?.stopCamera();
    document
      .querySelectorAll(".view-section")
      .forEach((view) => view.classList.remove("active"));
    window.app.showToast(error.message, "error");
    const el = document.createElement("div");
    el.style.cssText =
      "margin:16px;padding:20px;background:#142238;color:white;border-radius:12px";
    const text = document.createElement("p");
    text.textContent = error.message;
    const link = document.createElement("a");
    link.href = "/dashboard";
    link.target = "_parent";
    link.textContent = "Return to dashboard";
    el.append(text, link);
    document.body.prepend(el);
  } finally {
    document.body.classList.remove("platform-loading");
    document.getElementById("platform-loading-message")?.remove();
  }
});
addEventListener("pagehide", () => window.visionEngine?.stopCamera());
