export const INTENT_CATEGORIES = [
  "billing",
  "technical_issue",
  "account_access",
  "subscription",
  "shipping_or_order",
  "product_feedback",
  "general_information",
  "other",
] as const;

export type IntentCategory = (typeof INTENT_CATEGORIES)[number];

export const INTENT_LABELS: Record<IntentCategory, string> = {
  billing: "Billing",
  technical_issue: "Technical Issue",
  account_access: "Account Access",
  subscription: "Subscription",
  shipping_or_order: "Shipping or Order",
  product_feedback: "Product Feedback",
  general_information: "General Information",
  other: "Other",
};

export const INTENT_CRITERIA: Record<IntentCategory, string> = {
  billing:
    "Charges, invoices, refunds, duplicate payments, failed payments, or other money-movement problems.",
  technical_issue:
    "Bugs, crashes, blank screens, errors, outages, or broken product behavior.",
  account_access:
    "Login failure, locked account, hijacked account, password reset, or lost access.",
  subscription:
    "Starting, changing, renewing, pausing, or canceling a subscription or plan.",
  shipping_or_order:
    "Orders, packages, delivery, tracking, or whether something has shipped.",
  product_feedback:
    "A suggestion, feature request, or opinion about the product rather than a support incident.",
  general_information:
    "A question seeking information such as pricing, policy, or availability, without an incident to resolve.",
  other:
    "The request does not fit any of the known categories.",
};

export const ACTIONS = [
  "billing_support",
  "technical_support",
  "account_recovery",
  "subscription_support",
  "order_support",
  "collect_more_information",
  "general_answer",
  "human_review",
] as const;

export type ActionId = (typeof ACTIONS)[number];

export const ACTION_LABELS: Record<ActionId, string> = {
  billing_support: "Billing Support",
  technical_support: "Technical Support",
  account_recovery: "Account Recovery",
  subscription_support: "Subscription Support",
  order_support: "Order Support",
  collect_more_information: "Collect More Information",
  general_answer: "General Answer",
  human_review: "Human Review",
};

export const ACTION_CRITERIA: Record<ActionId, string> = {
  billing_support:
    "A billing handler should take the request: charges, invoices, refunds, or payment failures.",
  technical_support:
    "A technical-support handler should take the request: bugs, crashes, or broken product behavior.",
  account_recovery:
    "An account-recovery handler should take the request: login failure, hijack, or lost access.",
  subscription_support:
    "A subscription handler should take the request: cancel, change, or manage a plan.",
  order_support:
    "An order or shipping handler should take the request: delivery, tracking, or package status.",
  collect_more_information:
    "No specific handler should act yet because important information is missing.",
  general_answer:
    "A general informational handler can answer the request without a specialized incident queue.",
  human_review:
    "A person should receive the request rather than an automated handler.",
};

export const URGENCY_LEVELS = [
  "No meaningful urgency; the request can be handled routinely.",
  "Low urgency; no meaningful time pressure is apparent.",
  "Moderate urgency; the user would benefit from reasonably prompt handling.",
  "High urgency; delay could materially worsen the user's situation or experience.",
  "Critical urgency; immediate attention is warranted based on the content provided.",
] as const;

export const MAX_URGENCY_LEVEL = URGENCY_LEVELS.length - 1;

export const NOUL_TRUE_THRESHOLD = 0.5;

export const MAX_MESSAGE_LENGTH = 8000;

export const EXAMPLES = [
  {
    id: "refund",
    label: "Duplicate charge",
    text: "My card was charged twice and I need the extra payment refunded.",
  },
  {
    id: "crash",
    label: "Login crash",
    text: "The login page keeps crashing after I enter my password.",
  },
  {
    id: "cancel",
    label: "Cancel plan",
    text: "I want to cancel my subscription.",
  },
  {
    id: "package",
    label: "Missing package",
    text: "My package hasn't arrived yet and tracking hasn't updated.",
  },
  {
    id: "suggestion",
    label: "App suggestion",
    text: "I have a suggestion for your mobile app.",
  },
  {
    id: "hacked",
    label: "Account takeover",
    text: "I cannot access my account because someone changed my password.",
  },
  {
    id: "discount",
    label: "Student discount",
    text: "Do you offer a student discount?",
  },
] as const;

export function isIntentCategory(value: string): value is IntentCategory {
  return (INTENT_CATEGORIES as readonly string[]).includes(value);
}

export function isActionId(value: string): value is ActionId {
  return (ACTIONS as readonly string[]).includes(value);
}

export function intentLabel(id: string): string {
  return isIntentCategory(id) ? INTENT_LABELS[id] : id;
}

export function actionLabel(id: string): string {
  return isActionId(id) ? ACTION_LABELS[id] : id;
}
