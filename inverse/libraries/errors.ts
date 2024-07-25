export class MissingChildContainerError extends Error {
  public readonly type = "MissingChildContainerError" as const;

  constructor(id: string) {
    super(`Dependency Violation: '${id}' container failed to resolve unregistered sub container`);
  }
}

export class MissingDependencyError extends Error {
  public readonly type = "MissingDependencyError" as const;

  constructor(id: string, token: string | number | symbol) {
    super(
      `Dependency Violation: '${id}' container failed to resolve unregistered dependency token: ${token.toString()}`,
    );
  }
}
