// This is an auto generated file. Do not modify this file!
// deno-fmt-ignore-file

import { type Empty, type Event as TEvent, type EventToRecord } from "@valkyr/event-store";
import { type AnyZodObject, z, type ZodUnion } from "zod";

export const events = new Set([
  "post:comment:added",
  "post:created",
  "post:module:added",
  "post:removed",
  "user:activated",
  "user:created",
  "user:deactivated",
  "user:email-set",
  "user:meta-added",
  "user:name:family-set",
  "user:name:given-set",
] as const);

export const validators = {
  data: new Map<Event["type"], AnyZodObject | ZodUnion<any>>([
    ["post:comment:added", z.object({ type: z.enum(["origin", "reply"]), body: z.string() }).strict()],
    ["post:created", z.object({ title: z.string(), body: z.string() }).strict()],
    [
      "post:module:added",
      z.union([
        z.object({ type: z.literal("comments"), replies: z.boolean() }).strict(),
        z.object({ type: z.literal("likes"), positive: z.boolean(), negative: z.boolean() }).strict(),
      ]),
    ],
    [
      "user:created",
      z
        .object({
          name: z
            .union([
              z.object({ given: z.string(), family: z.string().optional() }).strict(),
              z.object({ given: z.string().optional(), family: z.string() }).strict(),
            ])
            .optional(),
          email: z.string(),
        })
        .strict(),
    ],
    ["user:email-set", z.object({ email: z.string() }).strict()],
    ["user:meta-added", z.object({ meta: z.object({}).catchall(z.any()) }).strict()],
    ["user:name:family-set", z.object({ family: z.string() }).strict()],
    ["user:name:given-set", z.object({ given: z.string() }).strict()],
  ]),
  meta: new Map<Event["type"], AnyZodObject>([
    ["post:comment:added", z.object({ auditor: z.string() }).strict()],
    ["post:created", z.object({ auditor: z.string() }).strict()],
    ["post:module:added", z.object({ auditor: z.string() }).strict()],
    ["user:activated", z.object({ auditor: z.string() }).strict()],
    ["user:email-set", z.object({ auditor: z.string() }).strict()],
  ]),
};

export type EventRecord = EventToRecord<Event>;

export type Event =
  | PostCommentAdded
  | PostCreated
  | PostModuleAdded
  | PostRemoved
  | UserActivated
  | UserCreated
  | UserDeactivated
  | UserEmailSet
  | UserMetaAdded
  | UserNameFamilySet
  | UserNameGivenSet;

// ### Events
// Event definitions for all available event types.

export type PostCommentAdded = TEvent<"post:comment:added", { type: CommentType; body: string }, { auditor: string }>;

export type PostCreated = TEvent<"post:created", { title: string; body: string }, { auditor: string }>;

export type PostModuleAdded = TEvent<
  "post:module:added",
  { type: "comments"; replies: boolean } | { type: "likes"; positive: boolean; negative: boolean },
  { auditor: string }
>;

export type PostRemoved = TEvent<"post:removed", Empty, Empty>;

export type UserActivated = TEvent<"user:activated", Empty, { auditor: string }>;

export type UserCreated = TEvent<"user:created", { name?: SCIMUserName; email: string }, Empty>;

export type UserDeactivated = TEvent<"user:deactivated", Empty, Empty>;

export type UserEmailSet = TEvent<"user:email-set", { email: string }, { auditor: string }>;

export type UserMetaAdded = TEvent<"user:meta-added", { meta: any }, Empty>;

export type UserNameFamilySet = TEvent<"user:name:family-set", { family: string }, Empty>;

export type UserNameGivenSet = TEvent<"user:name:given-set", { given: string }, Empty>;

// ### Definitions
// List of all shared schema definitions.

export const scimUserName = z.union([
  z.object({ given: z.string(), family: z.string().optional() }).strict(),
  z.object({ given: z.string().optional(), family: z.string() }).strict(),
]);

export const commentType = z.enum(["origin", "reply"]);

export type SCIMUserName = { given: string; family?: string } | { given?: string; family: string };

export type CommentType = "origin" | "reply";
