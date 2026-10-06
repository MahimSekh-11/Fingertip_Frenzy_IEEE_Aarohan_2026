/* Same-origin session adapter. No credentials or tokens are passed to the game. */
window.platformApi = async (path, body) => {
  const res = await fetch("/api" + path, {
    credentials: "same-origin",
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
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
  try {
    const [{ user }, { team }] = await Promise.all([
      window.platformApi("/auth/me"),
      window.platformApi("/teams/me"),
    ]);
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
      { name: user.name, rollNumber: user.rollNo, teamCode: team.code },
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
    if (state.active)
      throw new Error(
        "This stage was interrupted. Ask the event organizer to reset your attempt.",
      );
    if (state.status === "NOT_STARTED")
      await window.platformApi("/games/memory/start", {});
    await window.gameEngine.startStage(state.stage + 1);
  } catch (error) {
    window.app.showToast(error.message, "error");
    const el = document.createElement("div");
    el.style.cssText =
      "margin:50px;padding:25px;background:#142238;color:white;border-radius:12px";
    const text = document.createElement("p");
    text.textContent = error.message;
    const link = document.createElement("a");
    link.href = "/dashboard";
    link.target = "_parent";
    link.textContent = "Return to dashboard";
    el.append(text, link);
    document.body.prepend(el);
  }
});
