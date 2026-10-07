import { z } from "zod";
export const roll = z.preprocess(
  (value) => typeof value === "string" ? value.replace(/\s+/g, "") : value,
  z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9/-]{1,29}$/, "Enter your roll number."));
export const phone = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const compact = value.replace(/[\s()-]/g, "");
  return /^(?:\+91|91)\d{10}$/.test(compact) ? compact.slice(-10) : compact;
}, z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Enter a 10-digit mobile number (optional +91 prefix)."));
export const name = z.string().trim().min(2).max(60).transform((value) => value.replace(/\s+/g, " "));
export const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
export const email = z.string().trim().email().max(254).toLowerCase();
export const code = z.preprocess((value) => typeof value === "string" ? value.replace(/\s+/g, "") : value, z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^(?:FF-[A-F0-9]{12}|AAROHAN-[A-F0-9]{8})$/, "Enter the team code shared by your leader."));
export const identity = z.object({ name, rollNo: roll, phoneNo: phone, email });
export const login = identity.extend({ teamCode: code }).strict();
export const registration = identity.extend({ teamName: name }).strict();
export const student = z
  .object({
    name,
    rollNo: roll,
    phoneNo: phone,
    email: email.optional(),
  })
  .strict();
export const gameId = z.enum(["calculator", "memory", "puzzle", "detective"]);
export const pagination = (q) => ({
  page: z.coerce.number().int().min(1).max(10000).default(1).parse(q.page),
  limit: z.coerce.number().int().min(1).max(100).default(25).parse(q.limit),
});
export const search = (q) =>
  typeof q === "string"
    ? q.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : "";
