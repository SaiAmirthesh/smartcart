import { generateTransactionId } from '../../../shared/utils/formatters';

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  error?: string;
}

export class PaymentService {
  /**
   * Simulates a payment gateway verification.
   * Resolves after a short delay to mimic webhook/network latency.
   */
  static async simulatePayment(amount: number, shouldSucceed = true): Promise<PaymentResult> {
    console.info(`Processing payment simulation for amount: ₹${amount.toFixed(2)}`);
    await new Promise((resolve) => setTimeout(resolve, 900));

    if (!shouldSucceed) {
      return {
        success: false,
        transactionId: '',
        error: 'Payment failed: User cancelled on UPI app or bank server timeout.',
      };
    }

    return {
      success: true,
      transactionId: generateTransactionId(),
    };
  }

  /**
   * Placeholder for future Razorpay integration.
   * Usage when Razorpay script is added:
   * const options = {
   *   key: import.meta.env.VITE_RAZORPAY_KEY_ID,
   *   amount: amount * 100, // paise
   *   currency: "INR",
   *   name: "SmartCart",
   *   description: `Bill for Cart ${cartId}`,
   *   handler: (response) => { ... }
   * };
   * const rzp = new window.Razorpay(options);
   * rzp.open();
   */
  static async initiateRazorpayCheckout(
    amount: number,
    cartId: string
  ): Promise<PaymentResult> {
    console.info(`Razorpay hook initiated for cart ${cartId} and amount ₹${amount}`);
    // Fallback to simulation until Razorpay API credentials are configured
    return this.simulatePayment(amount);
  }
}
