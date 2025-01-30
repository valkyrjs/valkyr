// This is an auto generated file. Do not modify this file!
// deno-fmt-ignore-file

import { type Empty, type Event as TEvent, type EventToRecord } from "@valkyr/event-store";
import { type AnyZodObject, z } from "zod";

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
  data: new Map<Event["type"], AnyZodObject>([
    ["post:comment:added", z.object({ type: z.enum(["origin", "reply"]), body: z.string() }).strict()],
    ["post:created", z.object({ title: z.string(), body: z.string() }).strict()],
    ["post:module:added", z.object({ type: z.enum(["comments", "likes", "count"]) }).strict()],
    [
      "user:created",
      z
        .object({
          name: z.object({ given: z.union([z.string(), z.null()]), family: z.union([z.string(), z.null()]) }).strict(),
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

export type PostModuleAdded = TEvent<"post:module:added", { type: ModuleType }, { auditor: string }>;

export type PostRemoved = TEvent<"post:removed", Empty, Empty>;

export type UserActivated = TEvent<"user:activated", Empty, { auditor: string }>;

export type UserCreated = TEvent<
  "user:created",
  { name: { given: string | null; family: string | null }; email: string },
  Empty
>;

export type UserDeactivated = TEvent<"user:deactivated", Empty, Empty>;

export type UserEmailSet = TEvent<"user:email-set", { email: string }, { auditor: string }>;

export type UserMetaAdded = TEvent<"user:meta-added", { meta: any }, Empty>;

export type UserNameFamilySet = TEvent<"user:name:family-set", { family: string }, Empty>;

export type UserNameGivenSet = TEvent<"user:name:given-set", { given: string }, Empty>;

// ### Definitions
// List of all shared schema definitions for shared event types.

export type CommentType = "origin" | "reply";

export type ModuleType = "comments" | "likes" | "count";
