import { type Currency, type Payment, Payments } from "../services/payments.ts";

export class PayPal extends Payments {
  public async create(customerId: string, currency: Currency, amount: number): Promise<Payment> {
    return {
      paymentId: "xyz",
      customerId,
      provider: "paypal",
      status: "created",
      currency,
      amount,
    };
  }
}
