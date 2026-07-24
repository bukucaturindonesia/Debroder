import type { OrderActiveStageResolution } from "@/lib/order-active-stage";

export type AdminOrderPricingStatus = "final" | "estimated" | "quotation_required";
export type AdminOrderItemPricingStatus = AdminOrderPricingStatus | "confirmed";

export type AdminOrderListItem = {
  id: string;
  order_number: string;
  customer_name: string;
  company_name: string | null;
  status: string;
  pricing_status: AdminOrderPricingStatus;
  payment_status: string;
  fulfillment_status: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
};

export type AdminOrderListReadModel = {
  orders: AdminOrderListItem[];
  projected_at: string;
};

export type AdminOrderReadModelOrder = {
  id: string;
  order_number: string;
  quotation_id: string | null;
  customer_name: string;
  company_name: string | null;
  customer_phone: string;
  customer_email: string | null;
  shipping_address: string;
  delivery_method: string;
  customer_notes: string;
  admin_notes: string;
  status: string;
  pricing_status: AdminOrderPricingStatus;
  custom_quote_status: string | null;
  custom_project_snapshot: unknown;
  source_snapshot: unknown;
  subtotal_amount: number;
  total_amount: number;
  payment_required_amount: number | null;
  payment_effective_total: number;
  payment_production_eligible: boolean;
  payment_requirement_met: boolean;
  payment_balance: number;
  payment_method: string | null;
  payment_status: string;
  currency: string;
  converted_at: string | null;
  archived_at: string | null;
  checkout_source: string | null;
  whatsapp_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminOrderReadModelItem = {
  id: string;
  product_name: string;
  variant_name: string | null;
  color: string;
  size: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string;
  config_snapshot: unknown;
  required_services: unknown;
  estimated_total: number | null;
  pricing_status: AdminOrderItemPricingStatus;
  custom_project_id: string | null;
  custom_project_item_id: string | null;
  pricing_snapshot: unknown;
  created_at: string;
};

export type AdminOrderDomainSummary = {
  id: string;
  status: string;
  updated_at: string | null;
};

export type AdminOrderQualityControlSummary = AdminOrderDomainSummary & {
  result: string | null;
};

export type AdminOrderFulfillmentSummary = AdminOrderDomainSummary & {
  method: string;
  courier: string | null;
  tracking_number: string | null;
  final_verified_at: string | null;
};

export type AdminOrderPaymentSummary = {
  id: string;
  payment_number: string;
  amount: number;
  verified_amount: number | null;
  status: string;
  review_outcome: string | null;
  updated_at: string | null;
};

export type AdminOrderDetailReadModel = {
  order: AdminOrderReadModelOrder;
  items: AdminOrderReadModelItem[];
  job_order: AdminOrderDomainSummary | null;
  quality_control: AdminOrderQualityControlSummary | null;
  fulfillment: AdminOrderFulfillmentSummary | null;
  latest_payment: AdminOrderPaymentSummary | null;
  active_stage: OrderActiveStageResolution;
  revision: string;
  projected_at: string;
};

export type AdminOrderCommand =
  | {
    action: "update_delivery";
    deliveryMethod: string;
    shippingAddress: string;
    customerNotes: string;
    adminNotes: string;
  }
  | {
    action: "cancel";
    reason: string;
  }
  | {
    action: "archive";
    reason: string | null;
  };
