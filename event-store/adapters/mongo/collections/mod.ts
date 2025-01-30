import { CollectionRegistrar } from "../types.ts";
import { registrar as events } from "./events.ts";
import { registrar as relations } from "./relations.ts";
import { registrar as snapshots } from "./snapshots.ts";

export const registrars: CollectionRegistrar[] = [
  events,
  relations,
  snapshots,
];
