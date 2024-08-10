/**
 * Base response indicates that something has occured outside of the normal routing
 * pipeline that needs to be addressed in the registered **onError** handler.
 */
export class RouteResponse<TData = unknown> extends Error {
  /**
   * Instantiate a new RouteResponse.
   *
   * @param message - Message to delivery with the response.
   * @param code    - Code that can be used to identify the response.
   * @param data    - Additional data to present with the response. _(Optional)_
   */
  constructor(
    message: string,
    readonly code: number,
    readonly data?: TData,
  ) {
    super(message);
  }
}

/**
 * The **Redirect** response indicates that the redirects don't link to the requested
 * resource itself.
 */
export class RedirectResponse<TData extends { path: string; isExternal?: boolean }> extends RouteResponse<TData> {
  /**
   * Instantiate a new RedirectResponse.
   *
   * @param data - Data containing redirect details. _(Optional)_
   */
  constructor(data: TData) {
    super("Redirect", 307, data);
  }
}

/**
 * The **HTTP 400 Bad Request** response status code indicates that the server
 * cannot or will not process the request due to something that is perceived to
 * be a client response.
 */
export class BadRequestResponse<TData = unknown> extends RouteResponse<TData> {
  /**
   * Instantiate a new BadRequestResponse.
   *
   * @param message - Custom message to deliver with the response. Default: "Bad Request"
   * @param data    - Additional data to present with the response. _(Optional)_
   */
  constructor(message = "Bad Request", data?: TData) {
    super(message, 400, data);
  }
}

/**
 * The **Unauthorized** response indicates that the client route has not been completed
 * because it lacks valid authentication credentials for the requested resource.
 *
 * This status code is similar to the **Forbidden** status, except that in situations
 * resulting in this status code, user authentication can allow access to the resource.
 */
export class UnauthorizedResponse<TData = unknown> extends RouteResponse<TData> {
  /**
   * Instantiate a new UnauthorizedResponse.
   *
   * @param message - Custom message to deliver with the response. Default: "Unauthorized"
   * @param data    - Additional data to present with the response. _(Optional)_
   */
  constructor(message = "Unauthorized", data?: TData) {
    super(message, 401, data);
  }
}

/**
 * The **Forbidden** response indicates that the server understands the request but
 * refuses to authorize it.
 *
 * This status is similar to **Unauthorized**, but for the **Forbidden** status
 * re-authenticating makes no difference. The access is permanently forbidden and
 * tied to the application logic, such as insufficient rights to a route.
 */
export class ForbiddenResponse<TData = unknown> extends RouteResponse<TData> {
  /**
   * Instantiate a new ForbiddenResponse.
   *
   * @param message - Custom message to deliver with the response. Default: "Forbidden"
   * @param data    - Additional data to present with the response. _(Optional)_
   */
  constructor(message = "Forbidden", data?: TData) {
    super(message, 403, data);
  }
}

/**
 * The **Not Found** response indicates that the service cannot find the requested route.
 * Links that lead to a 404 page are often called broken or dead links and can be subject
 * to link rot.
 *
 * A 404 status code only indicates that the resource is missing: not whether the absence
 * is temporary or permanent.
 */
export class NotFoundResponse<TData = unknown> extends RouteResponse<TData> {
  /**
   * Instantiate a new NotFoundResponse.
   *
   * @param message - Custom message to deliver with the response. Default: "Not Found"
   * @param data    - Additional data to present with the response. _(Optional)_
   */
  constructor(message = "Not Found", data?: TData) {
    super(message, 404, data);
  }
}

/**
 * The **Internal Service Error** response indicates that the service encountered an
 * unexpected condition that prevented it from fulfilling the routing request.
 */
export class InternalServiceError<TData = unknown> extends RouteResponse<TData> {
  /**
   * Instantiate a new InternalServiceError.
   *
   * @param message - Custom message to deliver with the error. Default: "Internal Service Error"
   * @param data    - Additional data to present with the error. _(Optional)_
   */
  constructor(message = "Internal Service Error", data?: TData) {
    super(message, 500, data);
  }
}
