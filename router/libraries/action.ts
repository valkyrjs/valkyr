export type Action = (context: { params: Record<string, unknown>; query: Record<string, unknown> }) => Promise<void>;
