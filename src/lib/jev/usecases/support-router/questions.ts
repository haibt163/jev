import {
  ACTION_CRITERIA,
  ACTIONS,
  INTENT_CATEGORIES,
  INTENT_CRITERIA,
  URGENCY_LEVELS,
} from "./catalog.ts";

export type RouterState = {
  user_message: string;
  available_categories: string[];
  available_actions: string[];
};

export const JEV_QUESTIONS = {
  intent_category: {
    type: "choice" as const,
    instructions:
      "Which known category best describes the user's request in `user_message`? Choose the single category that most directly represents the user's primary intent. Use `available_categories` as the known set.",
    criteria: INTENT_CRITERIA,
  },
  recommended_action: {
    type: "choice" as const,
    instructions:
      "Which known application action or handler in `available_actions` should receive this request based on the meaning of `user_message`?",
    criteria: ACTION_CRITERIA,
  },
  urgency: {
    type: "score" as const,
    instructions:
      "How urgent is the situation described in `user_message`? Judge the actual semantic situation described. Do not infer urgency from emotion alone.",
    criteria: URGENCY_LEVELS,
  },
  human_escalation: {
    type: "noul" as const,
    instructions:
      "Does this request contain a meaningful reason to route the case to a human rather than relying only on an automated handler?",
    criteria: {
      true: "A meaningful reason for human handling is present.",
      false:
        "No meaningful reason for human handling is apparent from the supplied request.",
    },
  },
  ambiguity: {
    type: "noul" as const,
    instructions:
      "Is the user's request materially ambiguous such that the application would benefit from obtaining clarification before taking the intended action?",
    criteria: {
      true: "Important information is missing or multiple interpretations would lead to materially different actions.",
      false:
        "The intended request is sufficiently clear for the available handlers.",
    },
  },
};

export function buildState(user_message: string): RouterState {
  return {
    user_message,
    available_categories: [...INTENT_CATEGORIES],
    available_actions: [...ACTIONS],
  };
}
