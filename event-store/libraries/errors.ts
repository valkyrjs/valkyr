export class EventStoreError extends Error {
  readonly type = "EventStoreError";

  constructor(message: string) {
    super(`EventStore Error: ${message}`);
  }
}

export class EventMissingError extends Error {
  readonly type = "EventMissingError";

  constructor(type: string) {
    super(`EventStore Error: Event '${type}' has not been registered with the event store instance.`);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Event Errors
 |--------------------------------------------------------------------------------
 */

export class EventParserError extends Error {
  readonly type = "EventParserError";

  constructor(readonly data: unknown) {
    super("Invalid event provided");
  }
}

export class EventValidationError extends Error {
  readonly type = "EventValidationError";
}

export class EventInsertionError extends Error {
  readonly type = "EventInsertionError";
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
