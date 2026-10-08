import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Users,
  ScanEye,
  Calculator,
  Puzzle,
  Search,
  Sparkles,
  Copy,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { Brand } from "../components/Shell";
import { Card, Field, Button, Notice } from "../components/ui";
import { useAuth } from "../components/Auth";
import { request } from "../services/api";
export const catalog = [
  {
    id: "puzzle",
    name: "Image Formation",
    label: "SEE THE BIGGER PICTURE",
    description: "One image. Scattered pieces. Bring every tile home.",
    icon: Puzzle,
    color: "amber",
  },
  {
    id: "detective",
    name: "Detective Case",
    label: "FOLLOW THE EVIDENCE",
    description: "Connect the clues. Find the truth hiding in plain sight.",
    icon: Search,
    color: "purple",
  },
  {
    id: "calculator",
    name: "AI Calculator",
    label: "THREE MINDS. ONE SOLUTION.",
    description: "Take X, Y or Z. Solve together using your fingertips.",
    icon: Calculator,
    color: "blue",
  },
  {
    id: "memory",
    name: "Number Memory",
    label: "TRUST YOUR RECALL",
    description: "Watch the sequence. Remember the order. Make your move.",
    icon: ScanEye,
    color: "teal",
  },
];
export function ArenaArt({ active = 0, onSelect }) {
  const g = catalog[active];
  return (
    <div className="arena-art">
      <div className="art-grid" aria-hidden="true" />
      <div className="art-halo" aria-hidden="true" />
      <div className="art-topline">
        <span className="live-dot" /> FOUR ROUNDS / ONE ARENA <span>FF.26</span>
      </div>
      <div className="kinetic-board" aria-hidden="true">
        <div className="kinetic-tile tile-a">
          <Puzzle size={42} />
        </div>
        <div className="kinetic-tile tile-b">01</div>
        <div className="kinetic-tile tile-c">
          <span>F</span>
          <span>F</span>
        </div>
        <div className="kinetic-tile tile-d">
          <Sparkles size={38} />
        </div>
        <div className="board-cross">+</div>
      </div>
      <div className="art-caption">
        <span>YOUR NEXT MOVE</span>
        <h3>{g.name}</h3>
        <p>{g.description}</p>
      </div>
      {onSelect && (
        <div className="art-switcher" aria-label="Preview the four rounds">
          {catalog.map((c, i) => (
            <button
              key={c.id}
              type="button"
              aria-label={"Preview " + c.name}
              aria-pressed={active === i}
              onClick={() => onSelect(i)}
            >
              <c.icon size={18} />
              <span>0{i + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function Home() {
  const [active, setActive] = useState(0);
  return (
    <div className="platform landing frenzy">
      <header>
        <Brand />
        <nav>
          <a href="#rounds">The rounds</a>
          <Link to="/admin/login">Admin portal</Link>
          <Link className="nav-login" to="/login">
            Log in <ArrowUpRight size={15} />
          </Link>
          <Link className="button" to="/register">
            Register team <ArrowRight size={16} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="frenzy-hero">
          <div className="hero-copy">
            <p className="festival-pill">
              <span className="live-dot" /> AAROHAN 2026 <span>×</span> IEEE SB
              NIT DURGAPUR
            </p>
            <h1>
              FINGERTIP
              <br />
              <em>
                FRENZY<span className="title-period">.</span>
              </em>
            </h1>
            <p className="hero-subtitle">
              Small gestures.
              <br />
              <strong>Extraordinary moves.</strong>
            </p>
            <p className="hero-description">
              A four-round collision of vision, instinct and teamwork. Assemble,
              investigate, calculate, remember. Your fingertips take it from
              here.
            </p>
            <div className="actions">
              <Link className="button" to="/register">
                Get your team in <ArrowUpRight size={19} />
              </Link>
              <Link className="text-link" to="/login">
                Already have a code? <ArrowRight size={16} />
              </Link>
            </div>
            <div className="hero-facts">
              <div>
                <strong>04</strong>
                <span>Distinct challenges</span>
              </div>
              <div>
                <strong>03</strong>
                <span>Players. One team.</span>
              </div>
              <div>
                <strong>01</strong>
                <span>Private team scores</span>
              </div>
            </div>
          </div>
          <ArenaArt active={active} onSelect={setActive} />
        </section>
        <div className="event-ribbon">
          <span>
            ORGANIZED BY <strong>IEEE SB NIT Durgapur</strong>
          </span>
          <span className="ribbon-star">✳</span>
          <span>
            AT <strong>Aarohan 2026</strong>
          </span>
          <span className="ribbon-star">✳</span>
          <span>
            BUILT FOR <strong>The next move.</strong>
          </span>
        </div>
        <section id="rounds" className="round-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE GAME PLAN</p>
              <h2>
                Four rounds.
                <br />
                <em>No ordinary moves.</em>
              </h2>
            </div>
            <p>
              Start with the picture.
              <br />
              Finish with your memory.
            </p>
          </div>
          <div className="game-grid">
            {catalog.map((g, i) => (
              <Card key={g.id} className={"game-card " + g.color}>
                <div className="game-top">
                  <span className="game-icon">
                    <g.icon />
                  </span>
                  <span className="game-number">0{i + 1}</span>
                </div>
                <p className="eyebrow">{g.label}</p>
                <h3>{g.name}</h3>
                <p>{g.description}</p>
                <Link to="/login">
                  Enter round <ArrowUpRight size={17} />
                </Link>
              </Card>
            ))}
          </div>
        </section>
        <section className="how-it-works">
          <div>
            <p className="eyebrow">ONE REGISTRATION. EVERY ROUND.</p>
            <h2>
              Bring your people.
              <br />
              We bring the frenzy.
            </h2>
            <Link className="button" to="/register">
              Create your team <ArrowRight size={17} />
            </Link>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <h3>Leader registers</h3>
                <p>
                  Team name and leader details. Your unique code is generated
                  instantly.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Share the invitation</h3>
                <p>
                  Your two teammates log in with the code and their own details
                  before play begins.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Make every move count</h3>
                <p>
                  Four original games. Saved results. One place to follow your
                  team's rise.
                </p>
              </div>
            </li>
          </ol>
        </section>
      </main>
      <footer>
        <Brand />
        <div>
          <strong>IEEE SB NIT Durgapur</strong>
          <span>Aarohan 2026 · Fingertip Frenzy</span>
        </div>
        <Link to="/admin/login">
          Admin portal <ArrowUpRight size={15} />
        </Link>
      </footer>
    </div>
  );
}
function IdentityFields({ leader = false }) {
  return (
    <>
      <Field
        label={leader ? "Team leader name" : "Name"}
        name="name"
        autoComplete="name"
        required
        minLength={2}
        maxLength={60}
        placeholder="Your full name"
      />
      <div className="form-row">
        <Field
          label="Roll number"
          name="rollNo"
          required
          maxLength={30}
          placeholder="24CS1234"
          autoComplete="username"
        />
        <Field
          label="Phone number"
          name="phoneNo"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          pattern="[6-9][0-9]{9}"
          maxLength={10}
          required
          placeholder="10-digit mobile"
        />
      </div>
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        placeholder="you@example.com"
      />
    </>
  );
}
function AuthLayout({ children, mode }) {
  return (
    <div className={"platform login-page frenzy auth-" + mode}>
      <header>
        <Brand />
        <Link className="back-home" to="/">
          Back to event <ArrowUpRight size={15} />
        </Link>
      </header>
      <div className="login-layout">
        <div className="login-story">
          <p className="eyebrow">AAROHAN 2026 / IEEE SB NIT DURGAPUR</p>
          <h1>
            Your next
            <br />
            <em>great move.</em>
          </h1>
          <p>
            Fingertip Frenzy. Four original challenges, one team, and a whole
            lot of possibility.
          </p>
          <ArenaArt />
          <div className="auth-event-credit">
            <ShieldCheck size={17} /> Organized by IEEE SB NIT Durgapur
          </div>
        </div>
        <Card className="login-card">
          {mode !== "admin" && (
            <div className="auth-tabs">
              <Link className={mode === "login" ? "active" : ""} to="/login">
                Log in
              </Link>
              <Link
                className={mode === "register" ? "active" : ""}
                to="/register"
              >
                Register team
              </Link>
            </div>
          )}
          {children}
        </Card>
      </div>
      <footer className="login-footer">
        <span>Fingertip Frenzy · Aarohan 2026</span>
        <span>IEEE SB NIT Durgapur</span>
      </footer>
    </div>
  );
}
export function Register() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [team, setTeam] = useState(null),
    [copied, setCopied] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await request("/auth/register", {
        method: "POST",
        body: Object.fromEntries(new FormData(e.currentTarget).entries()),
      });
      setTeam(data.team);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout mode="register">
      {team ? (
        <div className="registration-success">
          <div className="success-icon">
            <Check size={32} />
          </div>
          <p className="eyebrow">YOUR TEAM IS IN</p>
          <h2>{team.name}</h2>
          <p>
            This is your team invitation. Save it and share it with your two
            teammates.
          </p>
          <div className="invite-code">
            <small>UNIQUE TEAM CODE</small>
            <strong>{team.code}</strong>
            <Button
              className="secondary"
              onClick={() =>
                navigator.clipboard
                  .writeText(team.code)
                  .then(() => setCopied(true))
                  .catch(() =>
                    setError("Please select and copy your team code."),
                  )
              }
            >
              <Copy size={16} />
              {copied ? "Copied" : "Copy code"}
            </Button>
          </div>
          <Notice error>{error}</Notice>
          <Link
            className="button"
            to={"/login?teamCode=" + encodeURIComponent(team.code)}
          >
            Continue to login <ArrowRight size={17} />
          </Link>
          <p className="form-help">
            Use your own registered name, roll number, phone and email to log
            in.
          </p>
        </div>
      ) : (
        <>
          <span className="secure-label">
            <Users size={16} /> TEAM LEADER REGISTRATION
          </span>
          <h2>Start your team.</h2>
          <p>
            Only the leader registers. We generate your invitation code after a
            successful registration.
          </p>
          <Notice error>{error}</Notice>
          <form onSubmit={submit}>
            <Field
              label="Team name"
              name="teamName"
              required
              minLength={2}
              maxLength={60}
              placeholder="Give your team a name"
            />
            <IdentityFields leader />
            <Button busy={busy} type="submit">
              Generate team code <ArrowUpRight size={17} />
            </Button>
          </form>
          <p className="form-help">
            Three players per team. Teammates join through login using your
            code.
          </p>
          <Link className="subtle-link" to="/admin/login">
            Administrator access <ArrowUpRight size={14} />
          </Link>
        </>
      )}
    </AuthLayout>
  );
}
export function Login({ admin = false }) {
  const { login, expired } = useAuth(),
    [params] = useSearchParams(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    nav = useNavigate();
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login(
        Object.fromEntries(new FormData(e.currentTarget).entries()),
        admin,
      );
      nav(user.role === "ADMIN" ? "/admin/leaderboard" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout mode={admin ? "admin" : "login"}>
      <span className="secure-label">
        <ShieldCheck size={16} />
        {admin ? "EVENT CONTROL" : "TEAM ACCESS"}
      </span>
      <h2>{admin ? "Admin portal." : "Back for the frenzy?"}</h2>
      <p>
        {admin
          ? "Leaderboard and controls for all four rounds."
          : "Enter your team code and your own details. First-time teammates join the roster when they log in."}
      </p>
      <Notice error>
        {error ||
          (expired ? "Your session expired. Log in again to continue." : "")}
      </Notice>
      <form onSubmit={submit}>
        {admin ? (
          <>
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </>
        ) : (
          <>
            <Field
              label="Team code"
              name="teamCode"
              defaultValue={params.get("teamCode") || ""}
              placeholder="FF-…"
              required
              maxLength={32}
              autoCapitalize="characters"
            />
            <IdentityFields />
          </>
        )}
        <Button busy={busy} type="submit">
          {admin ? "Open admin portal" : "Enter the arena"}{" "}
          <ArrowRight size={17} />
        </Button>
      </form>
      <p className="form-help">
        {admin
          ? "Administrator accounts are privately provisioned."
          : "Already joined? All five fields must match your saved participant details."}
      </p>
      <Link className="subtle-link" to={admin ? "/login" : "/admin/login"}>
        {admin ? "Participant login" : "Administrator access"}{" "}
        <ArrowUpRight size={14} />
      </Link>
    </AuthLayout>
  );
}
