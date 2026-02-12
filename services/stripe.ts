
// Stripe service reverted to local-only stub
export const handleStripeCheckout = async (email?: string) => {
  console.log("Stripe checkout disabled in local mode for", email);
};
