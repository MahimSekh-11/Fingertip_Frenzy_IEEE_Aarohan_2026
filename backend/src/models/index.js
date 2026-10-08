import mongoose from "mongoose";
const { Schema } = mongoose;
const id = { type: Schema.Types.ObjectId };
function model(name, fields, indexes = []) {
  const schema = new Schema(fields, {
    timestamps: true,
    autoCreate: false,
    autoIndex: false,
    minimize: false,
  });
  for (const [keys, options] of indexes) schema.index(keys, options);
  return mongoose.model(name, schema);
}
export const User = model(
  "PlatformUser",
  {
    name: { type: String, required: true },
    rollNo: { type: String, uppercase: true, trim: true },
    phoneNo: String,
    email: String,
    passwordHash: { type: String, select: false },
    role: {
      type: String,
      enum: ["STUDENT", "TEAM_LEADER", "ADMIN"],
      default: "STUDENT",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "DELETED"],
      default: "ACTIVE",
    },
    teamId: { ...id, default: null },
  },
  [
    [
      { rollNo: 1 },
      {
        unique: true,
        partialFilterExpression: { rollNo: { $type: "string" } },
      },
    ],
    [
      { phoneNo: 1 },
      {
        unique: true,
        partialFilterExpression: { phoneNo: { $type: "string" } },
      },
    ],
    [
      { email: 1 },
      { unique: true, partialFilterExpression: { role: "ADMIN" } },
    ],
    [{ teamId: 1 }, {}],
  ],
);
export const Team = model(
  "PlatformTeam",
  {
    name: { type: String, required: true, immutable: true },
    code: { type: String, required: true, unique: true },
    leaderId: id,
    memberIds: [Schema.Types.ObjectId],
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "DELETED"],
      default: "ACTIVE",
    },
  },
  [
    [{ createdAt: -1 }, {}],
    [{ status: 1 }, {}],
  ],
);
export const AuthSession = model(
  "PlatformAuthSession",
  { tokenHash: { type: String, unique: true }, userId: id, expiresAt: Date },
  [
    [{ expiresAt: 1 }, { expireAfterSeconds: 0 }],
    [{ userId: 1 }, {}],
  ],
);
export const Setting = model("PlatformSetting", {
  key: { type: String, unique: true },
  value: Schema.Types.Mixed,
});
export const GameSetting = model("PlatformGameSetting", {
  gameId: { type: String, unique: true },
  config: Schema.Types.Mixed,
});
export const GameSession = model(
  "PlatformGameSession",
  {
    userId: id,
    teamId: id,
    gameId: String,
    scope: String,
    attempt: Number,
    retryGranted: { type: Boolean, default: false },
    testMode: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ABANDONED"],
      default: "IN_PROGRESS",
    },
    startedAt: Date,
    completedAt: Date,
    score: { type: Number, default: 0 },
    maximum: Number,
    state: Schema.Types.Mixed,
    config: Schema.Types.Mixed,
    revision: { type: Number, default: 0 },
  },
  [
    [{ scope: 1, gameId: 1, attempt: 1 }, { unique: true }],
    [{ teamId: 1, gameId: 1 }, {}],
    [{ status: 1, createdAt: -1 }, {}],
    [{ score: -1 }, {}],
  ],
);
// Heartbeats never contend with teammates' game/score transactions.
export const CalculatorPresence = model(
  "PlatformCalculatorPresence",
  { sessionId: id, userId: id, expiresAt: Date },
  [
    [{ sessionId: 1, userId: 1 }, { unique: true }],
    [{ expiresAt: 1 }, { expireAfterSeconds: 3600 }],
  ],
);
export const Result = model(
  "PlatformGameResult",
  {
    sessionId: { ...id, unique: true },
    teamId: id,
    userId: id,
    gameId: String,
    score: Number,
    maximum: Number,
    completionTime: Number,
    attempt: Number,
    valid: { type: Boolean, default: true },
    completedAt: Date,
  },
  [
    [{ teamId: 1, gameId: 1 }, {}],
    [{ gameId: 1, score: -1 }, {}],
    [{ completedAt: -1 }, {}],
  ],
);
export const Content = model(
  "PlatformGameContent",
  {
    gameId: String,
    title: String,
    published: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    data: Schema.Types.Mixed,
  },
  [[{ gameId: 1, published: 1, order: 1 }, {}]],
);
export const Audit = model(
  "PlatformAuditLog",
  {
    adminId: id,
    action: String,
    entityType: String,
    entityId: String,
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
  },
  [[{ timestamp: -1 }, {}]],
);
export const RateBucket = model(
  "PlatformRateBucket",
  { key: { type: String, unique: true }, count: Number, expiresAt: Date },
  [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }]],
);
export const ImageAsset = model("PlatformImageAsset", {
  data: { type: Buffer, required: true, select: false },
  mime: String,
});
