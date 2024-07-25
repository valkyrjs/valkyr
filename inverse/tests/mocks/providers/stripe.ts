import { type Currency, type Payment, Payments } from "../services/payments.ts";

export class Stripe extends Payments {
  public async create(customerId: string, currency: Currency, amount: number): Promise<Payment> {
    return {
      paymentId: "xyz",
      customerId,
      provider: "stripe",
      status: "created",
      currency,
      amount,
    };
  }
}
