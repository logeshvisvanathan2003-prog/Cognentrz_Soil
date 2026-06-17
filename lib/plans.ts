// Subscription plans (INR, amount in paise for Razorpay)
export const PLANS: Record<string, { amount: number; label: string; tier: string }> = {
  starter:     { amount: 9900,   label: 'Cognentrz Starter — 1 farm',        tier: 'starter' },   // ₹99
  grower:      { amount: 49900,  label: 'Cognentrz Grower — up to 5 farms',  tier: 'grower' },    // ₹499
  pro_monthly: { amount: 99900,  label: 'Cognentrz Pro — Monthly',           tier: 'pro' },       // ₹999
  pro_yearly:  { amount: 199900, label: 'Cognentrz Pro — Yearly',            tier: 'pro' },       // ₹1999
};

export const ADMIN_EMAIL = 'logesh.visvanathan2003@gmail.com';
