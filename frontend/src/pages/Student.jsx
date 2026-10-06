import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Copy, Users, Trophy, CheckCircle2 } from "lucide-react";
import { Shell } from "../components/Shell";
import { useAuth } from "../components/Auth";
import {
  Card,
  Field,
  Button,
  Notice,
  Badge,
  Loading,
  Empty,
  useResource,
} from "../components/ui";
import { request } from "../services/api";
import { catalog } from "./Home";
export function Dashboard({ gamesOnly = false }) {
  const { user } = useAuth(),
    r = useResource(() =>
      Promise.all([request("/games"), request("/teams/me")]).then(([a, b]) => ({
        ...a,
        ...b,
      })),
    );
  return (
    <Shell
      title={
        gamesOnly
          ? "Choose your challenge"
          : `Welcome, ${user.name.split(" ")[0]}`
      }
      subtitle="Your next breakthrough starts here."
    >
      <Notice error>{r.error}</Notice>
      {r.loading ? (
        <Loading />
      ) : (
        <>
          <div className="dashboard-summary">
            <Card>
              <span className="stat-icon">
                <Users />
              </span>
              <small>YOUR TEAM</small>
              <h2>{r.data?.team?.name || "Find your people"}</h2>
              <p>
                {r.data?.team?.code ||
                  "Create a team or join with a team code."}
              </p>
              <Link to="/team">
                {r.data?.team ? "View your team" : "Set up your team"}{" "}
                <ArrowRight size={14} />
              </Link>
            </Card>
            <Card>
              <span className="stat-icon">
                <CheckCircle2 />
              </span>
              <small>YOUR PROGRESS</small>
              <h2>
                {r.data?.games.filter((g) => g.status === "COMPLETED").length ||
                  0}{" "}
                <span>/ 4</span>
              </h2>
              <p>Challenges completed</p>
            </Card>
            <Card>
              <span className="stat-icon">
                <Trophy />
              </span>
              <small>THE COMPETITION</small>
              <h2>One shared goal</h2>
              <p>Every challenge contributes to your team’s rank.</p>
              <Link to="/leaderboard">
                Explore standings <ArrowRight size={14} />
              </Link>
            </Card>
          </div>
          <div className="section-heading">
            <h2>The assessment arena</h2>
            <span>Four original experiences</span>
          </div>
          <div className="game-grid">
            {catalog.map((g, i) => {
              const state = r.data?.games.find((x) => x.id === g.id);
              return (
                <Card key={g.id} className={`game-card ${g.color}`}>
                  <div className="game-top">
                    <span className="game-icon">
                      <g.icon />
                    </span>
                    <span className="game-number">0{i + 1}</span>
                  </div>
                  <Badge>
                    {!state?.enabled
                      ? "DISABLED"
                      : !r.data?.team
                        ? "LOCKED"
                        : state.locked
                          ? "LOCKED"
                          : state.status}
                  </Badge>
                  <h3>{g.name}</h3>
                  <p>{g.description}</p>
                  <div className="game-meta">
                    <span>
                      Raw score <strong>{state?.score || 0}</strong>
                    </span>
                    <span>
                      Weight <strong>{state?.weight}%</strong>
                    </span>
                  </div>
                  {state?.locked && state.status === "NOT_STARTED" ? (
                    <>
                      <p className="round-lock">
                        Complete the previous round to unlock.
                      </p>
                      <Button disabled className="secondary">
                        Round locked
                      </Button>
                    </>
                  ) : (
                    <Link
                      className="button secondary"
                      to={!r.data?.team ? "/team" : `/games/${g.id}`}
                    >
                      {state?.status === "COMPLETED"
                        ? "View result"
                        : state?.status === "IN_PROGRESS"
                          ? "Continue"
                          : "Open challenge"}{" "}
                      <ArrowRight size={16} />
                    </Link>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </Shell>
  );
}
export function TeamPage() {
  const { user, refresh } = useAuth(),
    r = useResource(() => request("/teams/me")),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const action = async (e, mode) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget),
        body =
          mode === "join"
            ? {
                code: f.get("code"),
                rollNo: user.rollNo,
                phoneNo: user.phoneNo,
              }
            : { name: f.get("name") };
      await request(
        mode === "join"
          ? "/teams/join"
          : mode === "rename"
            ? "/teams/me"
            : "/teams",
        { method: mode === "rename" ? "PATCH" : "POST", body },
      );
      await refresh();
      r.reload();
      setMessage("Team updated successfully.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const team = r.data?.team;
  return (
    <Shell title="My team" subtitle="Good ideas get better together.">
      <Notice error>{error || r.error}</Notice>
      <Notice>{message}</Notice>
      {r.loading ? (
        <Loading />
      ) : team ? (
        <>
          <Card className="team-hero">
            <span className="game-icon">
              <Users />
            </span>
            <h2>{team.name}</h2>
            <Badge>{team.status}</Badge>
            <div className="team-code">
              <code>{team.code}</code>
              <Button
                className="icon"
                aria-label="Copy team code"
                onClick={() =>
                  navigator.clipboard
                    .writeText(team.code)
                    .then(() => setMessage("Team code copied."))
                    .catch(() =>
                      setError(
                        "Copy failed. Select and copy the code manually.",
                      ),
                    )
                }
              >
                <Copy size={17} />
              </Button>
            </div>
            <p>
              Share this code with your two teammates. They join through the
              login page using their own name, roll number, phone and email.
              Join before starting a game.
            </p>
          </Card>
          <Card>
            <h2>Team roster</h2>
            <div className="roster">
              {team.members.map((m) => (
                <div key={m._id}>
                  <span className="avatar">{m.name[0]}</span>
                  <div>
                    <strong>{m.name}</strong>
                    <small>{m.rollNo}</small>
                  </div>
                  <Badge>{m.role}</Badge>
                </div>
              ))}
            </div>
          </Card>
          {user.role === "TEAM_LEADER" && (
            <Card>
              <h2>Team settings</h2>
              <form onSubmit={(e) => action(e, "rename")}>
                <Field
                  label="Team name"
                  name="name"
                  defaultValue={team.name}
                  required
                  minLength={2}
                  maxLength={60}
                />
                <Button busy={busy}>Save name</Button>
              </form>
            </Card>
          )}
          <TeamScore team={team} />
        </>
      ) : (
        <Card>
          <h2>Team access unavailable</h2>
          <p>
            Register as a team leader, or log in with your leader's invitation
            code.
          </p>
          <Link className="button" to="/register">
            Leader registration
          </Link>
        </Card>
      )}
    </Shell>
  );
}
function TeamScore({ team }) {
  const r = useResource(() =>
    request("/leaderboard?search=" + encodeURIComponent(team.code)),
  );
  const row = r.data?.rows.find((x) => x._id === team._id);
  return (
    <Card>
      <h2>Your team scores</h2>
      <Notice error>{r.error}</Notice>
      {r.loading ? (
        <Loading />
      ) : row ? (
        <div className="score-strip">
          {catalog.map((g) => (
            <div key={g.id}>
              <small>{g.name}</small>
              <strong>{row.scores[g.id] || 0}</strong>
            </div>
          ))}
          <div>
            <small>Weighted total</small>
            <strong>{row.total}</strong>
          </div>
        </div>
      ) : (
        <Empty>No scores yet. Your first result will appear here.</Empty>
      )}
    </Card>
  );
}
export function Profile() {
  const { user } = useAuth(),
    r = useResource(() => request("/teams/me"));
  return (
    <Shell
      title="Your profile"
      subtitle="Your identity across the assessment arena."
    >
      <Card className="profile-card">
        <span className="avatar large">{user.name[0]}</span>
        <h2>{user.name}</h2>
        <Badge>{user.role}</Badge>
        <dl>
          {Object.entries({
            "Roll number": user.rollNo,
            "Phone number": user.phoneNo,
            Email: user.email || "Not provided",
            Team: r.data?.team?.name || "No team yet",
          }).map(([k, v]) => (
            <React.Fragment key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </React.Fragment>
          ))}
        </dl>
      </Card>
    </Shell>
  );
}
