import { getProperty } from "dot-prop";

/*
 |--------------------------------------------------------------------------------
 | Constants
 |--------------------------------------------------------------------------------
 */

export const PERMISSION_DENIED_MESSAGE = "Permission denied";

/*
 |--------------------------------------------------------------------------------
 | Permission
 |--------------------------------------------------------------------------------
 */

export class Permission {
  readonly granted: boolean;

  readonly message?: string;
  readonly attributes?: string[];

  constructor(response: Response) {
    this.granted = response.granted === true;
    if (response.granted === true && response.filter) {
      this.attributes = response.filter;
    }
    if (response.granted === false && response.message) {
      this.message = response.message;
    }
  }

  filter<Data extends Record<string, unknown>>(data: Data | Data[]): Data | Data[] {
    const attributes = this.attributes;
    if (attributes === undefined) {
      return data;
    }
    if (Array.isArray(data)) {
      return data.map((data) => filterWithAttributes(data, attributes) as Data);
    }
    return filterWithAttributes(data, attributes) as Data;
  }
}

function filterWithAttributes(data: Record<string, unknown>, keys: string[]) {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    result[key] = getProperty(data, key);
  }
  return result;
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Response = Granted | Denied;

type Granted = {
  granted: true;
  filter?: string[];
};

type Denied = {
  granted: false;
  message?: string;
};
