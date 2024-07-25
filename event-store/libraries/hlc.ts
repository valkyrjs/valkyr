import { HLCClockOffsetError, HLCForwardJumpError, HLCWallTimeOverflowError } from "./errors.ts";
import { Timestamp } from "./timestamp.ts";

export class HLC {
  time: typeof getTime;

  maxTime: number;
  maxOffset: number;

  timeUpperBound: number;
  toleratedForwardClockJump: number;

  last: Timestamp;

  constructor(
    { time = getTime, maxOffset = 0, timeUpperBound = 0, toleratedForwardClockJump = 0, last }: Options = {},
  ) {
    this.time = time;
    this.maxTime = timeUpperBound > 0 ? timeUpperBound : Number.MAX_SAFE_INTEGER;
    this.maxOffset = maxOffset;
    this.timeUpperBound = timeUpperBound;
    this.toleratedForwardClockJump = toleratedForwardClockJump;
    this.last = new Timestamp(this.time());
    if (last) {
      this.last = Timestamp.bigger(new Timestamp(last.time), this.last);
    }
  }

  now(): Timestamp {
    return this.update(this.last);
  }

  update(other: Timestamp): Timestamp {
    this.last = this.#getTimestamp(other);
    return this.last;
  }

  #getTimestamp(other: Timestamp): Timestamp {
    const [time, logical] = this.#getTimeAndLogicalValue(other);
    if (!this.#validUpperBound(time)) {
      throw new HLCWallTimeOverflowError(time, logical);
    }
    return new Timestamp(time, logical);
  }

  #getTimeAndLogicalValue(other: Timestamp): [number, number] {
    const last = Timestamp.bigger(other, this.last);
    const time = this.time();
    if (this.#validOffset(last, time)) {
      return [time, 0];
    }
    return [last.time, last.logical + 1];
  }

  #validOffset(last: Timestamp, time: number): boolean {
    const offset = last.time - time;
    if (!this.#validForwardClockJump(offset)) {
      throw new HLCForwardJumpError(-offset, this.toleratedForwardClockJump);
    }
    if (!this.#validMaxOffset(offset)) {
      throw new HLCClockOffsetError(offset, this.maxOffset);
    }
    if (offset < 0) {
      return true;
    }
    return false;
  }

  #validForwardClockJump(offset: number): boolean {
    if (this.toleratedForwardClockJump > 0 && -offset > this.toleratedForwardClockJump) {
      return false;
    }
    return true;
  }

  #validMaxOffset(offset: number): boolean {
    if (this.maxOffset > 0 && offset > this.maxOffset) {
      return false;
    }
    return true;
  }

  #validUpperBound(time: number): boolean {
    return time < this.maxTime;
  }

  toJSON() {
    return Object.freeze({
      maxOffset: this.maxOffset,
      timeUpperBound: this.timeUpperBound,
      toleratedForwardClockJump: this.toleratedForwardClockJump,
      last: this.last.toJSON(),
    });
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

export function getTime(): number {
  return Date.now();
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type Options = {
  time?: typeof getTime;
  maxOffset?: number;
  timeUpperBound?: number;
  toleratedForwardClockJump?: number;
  last?: {
    time: number;
    logical: number;
  };
};
