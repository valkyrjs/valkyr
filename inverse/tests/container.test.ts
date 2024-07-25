import { assertEquals, assertExists, assertInstanceOf, assertObjectMatch, assertThrows } from "@std/assert";
import { beforeAll, beforeEach, describe, it } from "@std/testing/bdd";

import { Container } from "../libraries/container.ts";
import { MissingChildContainerError, MissingDependencyError } from "../libraries/errors.ts";
import { Invoice2Go } from "./mocks/providers/invoice-2-go.ts";
import { PayPal } from "./mocks/providers/paypal.ts";
import { Stripe } from "./mocks/providers/stripe.ts";
import { Invoices } from "./mocks/services/invoices.ts";
import { Logger } from "./mocks/services/logger.ts";
import { Payments } from "./mocks/services/payments.ts";

type Context = {
  provider: string;
};

type Tokens = {
  logger: typeof Logger;
  invoices: typeof Invoices;
  payments: Payments;
};

const CONTAINER_ID = "mock";

const isProvider = (provider: string) => (context: Context) => provider === context.provider;

describe("Inverse Module > Container", () => {
  describe("when .where method is used", () => {
    const paypal: Context = { provider: "paypal" };
    const stripe: Context = { provider: "stripe" };

    let container: Container<Tokens, Context>;

    beforeEach(() => {
      container = new Container<Tokens, Context>(CONTAINER_ID);
      container.createContext(paypal);
      container.createContext(stripe);
    });

    it("should add a sub container when argument is a context object", () => {
      assertExists(container.contexts.get(paypal));
      assertExists(container.contexts.get(stripe));
      assertEquals(container.contexts.get({ provider: "skrill" }), undefined);
    });

    it("should set a sub container dependency when a filter method is provided", async () => {
      container.where(isProvider("paypal")).set("payments", new PayPal());
      container.where(isProvider("stripe")).set("payments", new Stripe());

      assertObjectMatch(
        await container.where(isProvider("paypal")).get("payments").create("xyz", "usd", 100),
        {
          customerId: "xyz",
          provider: "paypal",
          currency: "usd",
          amount: 100,
        },
      );

      assertObjectMatch(
        await container.where(isProvider("stripe")).get("payments").create("xyz", "jpy", 15000),
        {
          customerId: "xyz",
          provider: "stripe",
          currency: "jpy",
          amount: 15000,
        },
      );
    });

    it("should throw error when sub container does not exist", () => {
      assertThrows(() => container.where(isProvider("skrill")), MissingChildContainerError);
    });

    it("should throw error when sub container does not have a registered dependency", () => {
      assertThrows(() => container.where(isProvider("paypal")).get("payments"), MissingDependencyError);
    });
  });

  describe("when .has() method is used", () => {
    const container = new Container<Tokens>(CONTAINER_ID);

    beforeAll(() => {
      container.set("payments", new PayPal());
    });

    it("should return true for registered dependencies", () => {
      assertEquals(container.has("payments"), true);
    });

    it("should return false for unregistered dependencies", () => {
      assertEquals(container.has("invoices"), false);
    });
  });

  describe("when .set() method is used", () => {
    const container = new Container<Tokens>(CONTAINER_ID);

    it("should set new dependency", () => {
      assertEquals(container.set("payments", new PayPal()).has("payments"), true);
    });
  });

  describe("when .get() method is used", () => {
    const container = new Container<Tokens>(CONTAINER_ID);

    beforeAll(() => {
      container.set("logger", Logger);
      container.set("payments", new Stripe());
      container.set("invoices", Invoice2Go);
    });

    it("should resolve correct instances", () => {
      assertInstanceOf(container.new("logger"), Logger);
      assertInstanceOf(container.get("payments"), Stripe);
      assertInstanceOf(container.new("invoices", "xyz"), Invoice2Go);
    });

    it("should resolve correct results", async () => {
      assertObjectMatch(await container.get("payments").create("xyz", "usd", 100), {
        provider: "stripe",
        currency: "usd",
        amount: 100,
      });
    });

    it("should resolve a transient provider with correct arguments", () => {
      assertEquals(container.new("invoices", "xyz").provider, "Invoice2Go");
    });
  });
});
