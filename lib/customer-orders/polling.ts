export const CUSTOMER_ORDER_POLL_INTERVAL_MS = 30_000;
export const CUSTOMER_ORDER_POLL_MAX_INTERVAL_MS = 120_000;

export function customerOrderPollDelay(consecutiveFailures: number) {
  const exponent = Math.max(0, Math.min(2, consecutiveFailures));
  return Math.min(
    CUSTOMER_ORDER_POLL_INTERVAL_MS * (2 ** exponent),
    CUSTOMER_ORDER_POLL_MAX_INTERVAL_MS
  );
}

export function shouldPollCustomerOrder(input: {
  terminal: boolean;
  visible: boolean;
  online: boolean;
}) {
  return !input.terminal && input.visible && input.online;
}

