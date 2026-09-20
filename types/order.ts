export type OrderStatus = "PROCESSING" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

export interface TrackingEvent {
  status: OrderStatus | "ORDER_PLACED" | "CONFIRMED" | "SHIPPED" | "OUT_FOR_DELIVERY";
  title: string;
  description: string;
  location: string;
  timestamp: string;
  completed: boolean;
  current?: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  slug?: string;
  image: string;
  price: number;
  originalPrice?: number | null;
  quantity: number;
  variant?: string;
  storeName: string;
  storeId?: string;
  category?: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PaymentDetails {
  method: string;
  status: "PAID" | "REFUNDED" | "PENDING";
  transactionId: string;
  cardLast4?: string;
}

export interface OrderPricing {
  subtotal: number;
  shippingFee: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  estimatedDelivery: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  store: {
    id: string;
    name: string;
    slug?: string;
    avatar?: string;
    isVerified?: boolean;
  };
  items: OrderItem[];
  pricing: OrderPricing;
  shippingAddress: ShippingAddress;
  shippingMethod: string;
  trackingNumber: string;
  carrier: string;
  carrierPhone?: string;
  payment: PaymentDetails;
  trackingEvents: TrackingEvent[];
  notes?: string;
}
