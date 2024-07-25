/*
 |--------------------------------------------------------------------------------
 | Event Errors
 |--------------------------------------------------------------------------------
 */

export class EventDataValidationFailure extends Error {
  readonly step = "validate";

  constructor(readonly data: unknown) {
    super("Invalid event provided.");
  }
}

export class EventValidationFailure extends Error {
  readonly step = "validate";
}

export class EventInsertionFailure extends Error {
  readonly step = "insert";
}

export class EventContextFailure extends Error {
  readonly step = "context";
}

export class EventProjectionFailure extends Error {
  readonly step = "project";
}

/*
 |--------------------------------------------------------------------------------
 | Hybrid Logical Clock Errors
 |--------------------------------------------------------------------------------
 */

export class HLCForwardJumpError extends Error {
  readonly type = "ForwardJumpError";

  constructor(readonly timejump: number, readonly tolerance: number) {
    super(
      `HLC Violation: Detected a forward time jump of ${timejump}ms, which exceed the allowed tolerance of ${tolerance}ms.`,
    );
  }
}

export class HLCClockOffsetError extends Error {
  readonly type = "ClockOffsetError";

  constructor(readonly offset: number, readonly maxOffset: number) {
    super(
      `HLC Violation: Received time is ${offset}ms ahead of the wall time, exceeding the 'maxOffset' limit of ${maxOffset}ms.`,
    );
  }
}

export class HLCWallTimeOverflowError extends Error {
  readonly type = "WallTimeOverflowError";

  constructor(readonly time: number, readonly maxTime: number) {
    super(`HLC Violation: Wall time ${time}ms exceeds the max time of ${maxTime}ms.`);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type PreEventInsertError =
  | EventDataValidationFailure
  | EventValidationFailure
  | EventInsertionFailure;

export type PostEventInsertError =
  | EventContextFailure
  | EventProjectionFailure;
