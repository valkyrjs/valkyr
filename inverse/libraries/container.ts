import { MissingChildContainerError, MissingDependencyError } from "./errors.ts";

export class Container<T extends Tokens<T>, C extends JSON = JSON> {
  readonly providers: Map<keyof T, T[keyof T]> = new Map();
  readonly contexts: Map<C, Container<T, C>> = new Map();

  /**
   * A simple dependency injection service using inversion of control principles
   * allowing the developer to program against TypeScript types or interfaces
   * with implementation details injected by service providers.
   *
   * @param id - Container identifier used for easier debugging.
   */
  constructor(readonly id: string) {}

  /*
   |--------------------------------------------------------------------------------
   | Contexts
   |--------------------------------------------------------------------------------
   |
   | A container can have one or more contexts which represents a cloned version of
   | the parent container. A context container is usually useful for when you want
   | different types of the same provider to exist within the same dependency scope
   | under a unique filterable context.
   |
   */

  /**
   * Create a new container with the given context object. A context is an object
   * we provide to the .where method used to query the container assigned to the
   * given context object.
   *
   * @param context - Context object used to filter future .where requests.
   */
  createContext(context: C): Container<T, C> {
    return this.contexts.set(context, new Container<T, C>(this.id)).get(
      context,
    ) as Container<T, C>;
  }

  /**
   * Create or retrieve a container based on a specific context container.
   *
   * @param filter - Method which receives the container context object used to
   *                 filter the specific container we want to operate on.
   */
  where(filter: Filter<C>): Container<T, C> {
    for (const context of Array.from(this.contexts.keys())) {
      if (filter(context)) {
        return this.contexts.get(context) as Container<T, C>;
      }
    }
    throw new MissingChildContainerError(this.id);
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  /**
   * Check if a token has been registered in the singleton or transient map
   * of the container.
   *
   * @param token - Token to verify.
   */
  has<K extends keyof T>(token: K): boolean {
    return this.providers.has(token);
  }

  /**
   * Register a transient or singleton provider against the provided token.
   *
   * @param token    - Token to register.
   * @param provider - Provider to register under the given token.
   */
  set<K extends keyof T>(token: K, provider: T[K]): this {
    this.providers.set(token, provider);
    return this;
  }

  /**
   * Get a transient or singleton provider instance.
   *
   * @param token - Token to retrieve dependency for.
   * @param args  - Arguments to pass to a transient provider.
   */
  get<K extends keyof T>(token: K): T[K] {
    const provider = this.providers.get(token);
    if (!provider) {
      throw new MissingDependencyError(this.id, token);
    }
    return provider as T[K];
  }

  new<K extends keyof T>(
    token: K,
    ...args: ConstructorParameters<T[K]>
  ): InstanceType<T[K]> {
    const provider = this.providers.get(token);
    if (!provider) {
      throw new MissingDependencyError(this.id, token);
    }
    return new (provider as any)(...(args as any));
  }
}

export type Tokens<T> = {
  [K in keyof T]: T[K];
};

export type Filter<T> = (context: T) => boolean;

export type JSON = Record<string, unknown>;
