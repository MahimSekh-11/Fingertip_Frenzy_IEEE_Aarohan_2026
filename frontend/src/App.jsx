import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, Guard } from "./components/Auth";
import { Loading } from "./components/ui";
import { Home, Login, Register } from "./pages/Home";
import { Dashboard, TeamPage, Profile } from "./pages/Student";
import { Leaderboard } from "./pages/Leaderboard";
import { AdminGame } from "./pages/Admin";
import { EmbeddedGame } from "./pages/EmbeddedGame";
const Puzzle = lazy(() =>
  import("./pages/PuzzleGamePage").then((m) => ({ default: m.PuzzleGamePage })),
);
const Detective = lazy(() =>
  import("./pages/DetectiveGamePage").then((m) => ({
    default: m.DetectiveGamePage,
  })),
);
const protectedPage = (el, admin = false) => <Guard admin={admin}>{el}</Guard>;
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<Login admin />} />
            <Route path="/dashboard" element={protectedPage(<Dashboard />)} />
            <Route
              path="/games"
              element={protectedPage(<Dashboard gamesOnly />)}
            />
            <Route path="/team" element={protectedPage(<TeamPage />)} />
            <Route path="/profile" element={protectedPage(<Profile />)} />
            <Route
              path="/leaderboard"
              element={<Navigate to="/admin/leaderboard" replace />}
            />
            <Route path="/games/puzzle" element={protectedPage(<Puzzle />)} />
            <Route
              path="/games/detective"
              element={protectedPage(<Detective />)}
            />
            <Route
              path="/games/:gameId"
              element={protectedPage(<EmbeddedGame />)}
            />
            <Route path="/rounds" element={<Navigate to="/games" replace />} />
            <Route
              path="/admin"
              element={<Navigate to="/admin/leaderboard" replace />}
            />
            <Route
              path="/admin/dashboard"
              element={<Navigate to="/admin/leaderboard" replace />}
            />
            <Route
              path="/admin/leaderboard"
              element={protectedPage(<Leaderboard admin />, true)}
            />
            <Route
              path="/admin/games/:gameId"
              element={protectedPage(<AdminGame />, true)}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
