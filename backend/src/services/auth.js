import {
  randomBytes,
  createHash,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { AuthSession } from "../models/index.js";
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password, hash = "") {
  if (typeof hash !== "string" || !/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(hash))
    return false;
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  const a = Buffer.from(key, "hex"),
    b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function issueSession(user, res) {
  const token = randomBytes(32).toString("hex");
  await AuthSession.create({
    tokenHash: digest(token),
    userId: user._id,
    expiresAt: new Date(Date.now() + 12 * 3600000),
  });
  res.cookie("aarohan_session", token, {
    ...cookieOptions(),
    maxAge: 12 * 3600000,
  });
}
export const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  rollNo: u.rollNo,
  phoneNo: u.phoneNo,
  email: u.email,
  role: u.role,
  status: u.status,
  teamId: u.teamId,
});
