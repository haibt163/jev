import { MAX_CRITERION_LEVEL } from "./types.ts";

export type CandidateInput = {
  request: string;
  name: string;
  description: string;
};

export type CandidateState = {
  user_request: string;
  candidate_name: string;
  candidate_description: string;
};

/**
 * One candidate per TypeSafe call: the state carries the user's request and
 * a single candidate. Five Score questions place the candidate on explicit
 * dimensions; a Noul catches insufficient descriptions. No global "best"
 * score is asked of Jev \u2014 the composite is computed in application code.
 */
export const JEV_QUESTIONS = {
  portability: {
    type: "score" as const,
    instructions:
      "How well does `candidate_description` satisfy portability for the needs stated in `user_request`? Judge the described product only.",
    criteria: [
      "Not portable at all; the description indicates a stationary or bulky product",
      "Portable with effort; heavy or awkward for regular carrying",
      "Comfortably portable for everyday carry",
      "Exceptionally portable; light and compact with no tradeoffs stated",
    ],
  },
  performance: {
    type: "score" as const,
    instructions:
      "How well does `candidate_description` satisfy the performance needs stated in `user_request`? Judge only what the description supports.",
    criteria: [
      "Clearly insufficient for the stated performance needs",
      "Marginal; basic needs are met but demanding use would struggle",
      "Solid; covers the stated needs with some headroom",
      "Strong; exceeds the stated performance needs",
    ],
  },
  battery: {
    type: "score" as const,
    instructions:
      "How well does `candidate_description` satisfy battery or power needs implied by `user_request`? If the description says nothing about battery, judge conservatively from the product type.",
    criteria: [
      "Inadequate for the usage pattern implied by the request",
      "Usable but charging will interrupt the stated usage",
      "Comfortable for the stated usage pattern",
      "Exceptional battery suitability for the stated usage",
    ],
  },
  value: {
    type: "score" as const,
    instructions:
      "How well does the price in `candidate_description` match the value delivered for the needs in `user_request`? Judge value for money, not absolute cost.",
    criteria: [
      "Poor value; clearly overpriced for what it delivers",
      "Fair value; price roughly matches what is delivered",
      "Good value; more is delivered than the price suggests",
      "Excellent value; standout price-to-value for the stated needs",
    ],
  },
  fit: {
    type: "score" as const,
    instructions:
      "Overall, how well does `candidate_description` fit the priorities explicitly stated in `user_request`? Weight the user's own words heavily.",
    criteria: [
      "Poor fit; misses most of the stated priorities",
      "Partial fit; covers some stated priorities",
      "Good fit; covers most stated priorities",
      "Excellent fit; directly serves every stated priority",
    ],
  },
  needs_info: {
    type: "noul" as const,
    instructions:
      "Is `candidate_description` too sparse to judge fit for `user_request` reliably?",
    criteria: {
      true: "The description lacks the facts a judgment would need.",
      false: "The description contains enough to judge.",
    },
  },
};

export { MAX_CRITERION_LEVEL };

export function buildState(input: CandidateInput): CandidateState {
  return {
    user_request: input.request,
    candidate_name: input.name,
    candidate_description: input.description,
  };
}
