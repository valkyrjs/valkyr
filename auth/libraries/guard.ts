import z, { ZodDiscriminatedUnion, ZodObject, ZodUnion } from "zod";

/**
 * Access guards perform deterministic logical operations on provided
 * input and return a true/false based on its validity in the guards context.
 *
 * These guards are usually used in conjunction with access control checks
 * and are useful for very specific granular access requirements based on
 * given input.
 */
export class Guard<TName extends string, TInput extends ZodObject | ZodUnion | ZodDiscriminatedUnion> {
  /**
   * Represents the external, dynamic, and unknown input from third-party
   * sources (e.g., user actions, API requests).
   */
  readonly input: TInput;

  /**
   * Access guard handler used to check if the external and internal
   * input meets the guard logic requirements.
   */
  readonly #checkHandler: GuardHandler<TInput>;

  /**
   * Instantiates a new guard which can be used to verify untrusted inputs.
   *
   * @param name     - Name of the guard.
   * @param settings - Guard settings.
   */
  constructor(readonly name: TName, settings: {
    input: TInput;
    check: GuardHandler<TInput>;
  }) {
    this.input = settings.input;
    this.#checkHandler = settings.check;
  }

  /**
   * Validates the provided input using the defined schema. If validation passes,
   * forwards the parsed input to the guard handler for additional checks.
   *
   * @param input - External input to verify.
   */
  async check(input: unknown): Promise<boolean> {
    const parsed = await this.input.spa(input);
    if (parsed.success === false) {
      return false;
    }
    return this.#checkHandler(parsed.data);
  }
}

export type GuardHandler<TInput extends ZodObject | ZodUnion | ZodDiscriminatedUnion> = (input: z.infer<TInput>) => Promise<boolean>;
