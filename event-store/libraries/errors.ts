/**
 * General error thrown when an issue occurs within the event store.
 *
 * This serves as a base error for event store-related failures, providing
 * a descriptive message about what went wrong.
 *
 * @property type - The type of error, always `"EventStoreError"`.
 */
export class EventStoreError extends Error {
  readonly type = "EventStoreError";

  constructor(message: string) {
    super(`EventStore Error: ${message}`);
  }
}

/**
 * Error thrown when an expected event is missing from the event store.
 *
 * This occurs when an event type has not been registered or cannot be found
 * within the event store instance.
 *
 * @property type - The type of error, always `"EventMissingError"`.
 */
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

/**
 * Error thrown when an event fails to parse correctly.
 *
 * This error indicates that an invalid event was provided during the
 * parsing process.
 *
 * @property type - The type of error, always `"EventParserError"`.
 * @property data - The invalid event data that caused the error.
 */
export class EventParserError extends Error {
  readonly type = "EventParserError";

  constructor(readonly data: unknown) {
    super("Invalid event provided");
  }
}

/**
 * Error thrown when an event fails validation.
 *
 * This error indicates that an event does not meet the required validation
 * criteria before being processed or stored.
 *
 * @property type - The type of error, always `"EventValidationError"`.
 */
export class EventValidationError extends Error {
  readonly type = "EventValidationError";
}

/**
 * Error thrown when an event fails to be inserted into the event store.
 *
 * This error occurs when an issue arises during the insertion of an
 * event into storage, such as a constraint violation or storage failure.
 *
 * @property type - The type of error, always `"EventInsertionError"`.
 */
export class EventInsertionError extends Error {
  readonly type = "EventInsertionError";
}

/*
 |--------------------------------------------------------------------------------
 | Hybrid Logical Clock Errors
 |--------------------------------------------------------------------------------
 */

/**
 * Error thrown when a forward time jump exceeds the allowed tolerance in a Hybrid Logical Clock (HLC).
 *
 * This error occurs when the system detects a time jump beyond the configured tolerance,
 * which may indicate clock synchronization issues in a distributed system.
 *
 * @property type      - The type of error, always `"ForwardJumpError"`.
 * @property timejump  - The detected forward time jump in milliseconds.
 * @property tolerance - The allowed maximum time jump tolerance in milliseconds.
 */
export class HLCForwardJumpError extends Error {
  readonly type = "ForwardJumpError";

  constructor(readonly timejump: number, readonly tolerance: number) {
    super(
      `HLC Violation: Detected a forward time jump of ${timejump}ms, which exceed the allowed tolerance of ${tolerance}ms.`,
    );
  }
}

/**
 * Error thrown when the received HLC timestamp is ahead of the system's wall time beyond the allowed offset.
 *
 * This error ensures that timestamps do not drift too far ahead of real time,
 * preventing inconsistencies in distributed event ordering.
 *
 * @property type      - The type of error, always `"ClockOffsetError"`.
 * @property offset    - The difference between the received time and the system's wall time in milliseconds.
 * @property maxOffset - The maximum allowed clock offset in milliseconds.
 */
export class HLCClockOffsetError extends Error {
  readonly type = "ClockOffsetError";

  constructor(readonly offset: number, readonly maxOffset: number) {
    super(
      `HLC Violation: Received time is ${offset}ms ahead of the wall time, exceeding the 'maxOffset' limit of ${maxOffset}ms.`,
    );
  }
}

/**
 * Error thrown when the Hybrid Logical Clock (HLC) wall time exceeds the defined maximum limit.
 *
 * This error prevents time overflow issues that could lead to incorrect event ordering
 * in a distributed system.
 *
 * @property type    - The type of error, always `"WallTimeOverflowError"`.
 * @property time    - The current HLC wall time in milliseconds.
 * @property maxTime - The maximum allowed HLC wall time in milliseconds.
 */
export class HLCWallTimeOverflowError extends Error {
  readonly type = "WallTimeOverflowError";

  constructor(readonly time: number, readonly maxTime: number) {
    super(`HLC Violation: Wall time ${time}ms exceeds the max time of ${maxTime}ms.`);
  }
}
