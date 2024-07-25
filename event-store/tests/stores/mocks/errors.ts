export abstract class ServiceError<TData = unknown> extends Error {
  constructor(message: string, readonly status: number, readonly data?: TData) {
    super(message);
  }

  toJSON() {
    return {
      status: this.status,
      message: this.message,
      data: this.data,
    };
  }
}

export class CustomServiceError<TData = unknown> extends ServiceError<TData> {
  constructor(message = "Custom Error", data?: TData) {
    super(message, 400, data);
  }
}
