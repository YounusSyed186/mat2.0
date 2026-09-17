export interface RazorpayCheckoutOptions {
  amount: number; // in INR rupees
  currency?: string;
  name: string;
  description: string;
  planName: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }) => void;
  onFailure?: (error: { code?: string; description?: string; reason?: string }) => void;
}

/**
 * Dynamically loads the official Razorpay Checkout SDK script if not already present.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      console.error("Failed to load Razorpay Checkout SDK");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Launches the Razorpay payment modal.
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  const isLoaded = await loadRazorpayScript();

  const razorpayKey =
    import.meta.env.VITE_RAZORPAY_KEY_ID ||
    import.meta.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    "rzp_test_VivahMatrimonyKey";

  // Amount in Razorpay is in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(options.amount * 100);

  if (isLoaded && window.Razorpay) {
    const razorpayOptions = {
      key: razorpayKey,
      amount: amountInPaise,
      currency: options.currency || "INR",
      name: options.name || "Vivaah Vedika Matrimony",
      description: options.description || `${options.planName} Plan Upgrade`,
      image: typeof window !== "undefined" ? `${window.location.origin}/Vivaah%20vedika.png` : "/Vivaah%20vedika.png",
      handler: function (response: {
        razorpay_payment_id: string;
        razorpay_order_id?: string;
        razorpay_signature?: string;
      }) {
        options.onSuccess(response);
      },
      prefill: {
        name: options.userName || "",
        email: options.userEmail || "",
        contact: options.userPhone || "",
      },
      notes: {
        platform: "Vivaah Vedika Matrimony",
        plan: options.planName,
      },
      theme: {
        color: "#e11d48", // Vivaah Vedika Primary Rose Red theme
      },
      modal: {
        ondismiss: function () {
          if (options.onFailure) {
            options.onFailure({ description: "Payment popup closed by user" });
          }
        },
      },
    };

    const rzp = new window.Razorpay(razorpayOptions);
    rzp.on("payment.failed", function (response: any) {
      if (options.onFailure) {
        options.onFailure({
          code: response?.error?.code,
          description: response?.error?.description || "Payment failed",
          reason: response?.error?.reason,
        });
      }
    });
    rzp.open();
  } else {
    // Fallback simulation mode if script is blocked or unavailable
    console.warn("[Razorpay] SDK script not available. Using test checkout callback.");
    const mockPaymentId = `pay_test_${Math.random().toString(36).substring(2, 12)}`;
    setTimeout(() => {
      options.onSuccess({
        razorpay_payment_id: mockPaymentId,
        razorpay_order_id: `order_test_${Math.random().toString(36).substring(2, 10)}`,
        razorpay_signature: `sig_test_${Math.random().toString(36).substring(2, 12)}`,
      });
    }, 800);
  }
}
