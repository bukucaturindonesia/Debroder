import {
  resolveOrderActiveStage,
  type OrderActiveStageInput,
  type OrderActiveStageResolution
} from "@/lib/order-active-stage";

/**
 * Canonical browser/admin resolver for B4-O1.
 *
 * Terminal order or fulfillment evidence is monotonic and always wins. Any
 * contradictory child-domain state remains an integrity warning; it must not
 * silently reopen customer tracking to an earlier stage.
 */
export function resolveCanonicalOrderActiveStage(
  input: OrderActiveStageInput
): OrderActiveStageResolution {
  return resolveOrderActiveStage(input);
}
