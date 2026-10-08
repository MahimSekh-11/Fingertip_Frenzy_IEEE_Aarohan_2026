import { z } from "zod";
const integer = (min, max) => z.number().int().min(min).max(max);
const stage = z
  .object({
    numbersCount: integer(1, 9),
    displayIntervalSeconds: z.number().min(0.5).max(15),
    responseIntervalSeconds: z.number().min(1).max(30),
  })
  .strict();
const common = {
  enabled: z.boolean(),
  weight: z.number().min(0).max(100),
  maxAttempts: integer(1, 10),
  startAt: z.string().datetime().nullable(),
  endAt: z.string().datetime().nullable(),
};
export const schemas = {
  calculator: z
    .object({
      ...common,
      sequence: z.array(integer(1, 3)).min(1).max(60),
      time: z
        .object({ 1: integer(5, 300), 2: integer(5, 300), 3: integer(5, 300) })
        .strict(),
      base: z
        .object({
          1: integer(0, 1000),
          2: integer(0, 1000),
          3: integer(0, 1000),
        })
        .strict(),
      speed: z.number().min(0).max(20),
      countdown: integer(1, 10),
      minConf: z.number().min(0).max(1),
      lockSeconds: z.number().min(0.1).max(5),
    })
    .strict(),
  memory: z
    .object({
      ...common,
      stages: z
        .object({ stage1: stage, stage2: stage, stage3: stage })
        .strict(),
    })
    .strict(),
  puzzle: z.object({ ...common, durationSeconds: integer(60, 7200) }).strict(),
  detective: z
    .object({ ...common, durationSeconds: integer(60, 7200) })
    .strict(),
};
const base = {
  enabled: true,
  weight: 25,
  maxAttempts: 1,
  startAt: null,
  endAt: null,
};
export const defaults = {
  calculator: {
    ...base,
    sequence: [...Array(6).fill(1), ...Array(6).fill(2), ...Array(8).fill(3)],
    time: { 1: 40, 2: 60, 3: 80 },
    base: { 1: 100, 2: 100, 3: 100 },
    speed: 2,
    countdown: 3,
    minConf: 0.75,
    lockSeconds: 1,
  },
  memory: {
    ...base,
    stages: {
      stage1: {
        numbersCount: 5,
        displayIntervalSeconds: 3,
        responseIntervalSeconds: 5,
      },
      stage2: {
        numbersCount: 8,
        displayIntervalSeconds: 2,
        responseIntervalSeconds: 4,
      },
      stage3: {
        numbersCount: 9,
        displayIntervalSeconds: 1.5,
        responseIntervalSeconds: 3,
      },
    },
  },
  puzzle: { ...base, durationSeconds: 1800 },
  detective: { ...base, durationSeconds: 1800 },
};
export const names = {
  calculator: "AI Calculator",
  memory: "Number Memory",
  puzzle: "Image Formation",
  detective: "Detective Case",
};
