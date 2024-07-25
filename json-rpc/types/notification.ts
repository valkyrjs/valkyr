import type { Params } from "./common.ts";
import type { Request } from "./request.ts";

/**
 * A Notification is a Request object without an "id" member. A Request object that is
 * a Notification signifies the Client's lack of interest in the corresponding Response
 * object, and as such no Response object needs to be returned to the client. The Server
 * MUST NOT reply to a Notification, including those that are within a batch request.
 *
 * Notifications are not confirmable by definition, since they do not have a Response
 * object to be returned. As such, the Client would not be aware of any errors (like
 * e.g. "Invalid params","Internal error").
 */
export type Notification<P extends Params | void = void> = Omit<Request<P>, "id">;
