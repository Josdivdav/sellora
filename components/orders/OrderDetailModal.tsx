"use client";

import styles from "./orders.module.css";
import type { Order } from "@/types/order";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onBuyAgain?: (order: Order) => void;
}

export default function OrderDetailModal({
  order,
  onClose,
  onBuyAgain,
}: OrderDetailModalProps) {
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-NG", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="order-detail-title"
      >
        <div className={styles.modalHeader}>
          <h3 id="order-detail-title" className={styles.modalTitle}>
            <span className="material-icons-round">receipt_long</span>
            Order Details & Invoice
          </h3>
          <button
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <span className="material-icons-round">close</span>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "10px",
              paddingBottom: "14px",
              borderBottom: "1px solid #f0f2f8",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Order Reference
              </span>
              <h4 style={{ margin: "2px 0 0", fontSize: "17px", fontWeight: 800 }}>
                {order.orderNumber}
              </h4>
              <span style={{ fontSize: "12.5px", color: "#6b7280" }}>
                Placed on {formatDate(order.createdAt)}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Payment Status
              </span>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "13.5px",
                  color:
                    order.payment.status === "PAID"
                      ? "#059669"
                      : order.payment.status === "REFUNDED"
                      ? "#dc2626"
                      : "#d97706",
                }}
              >
                {order.payment.status}
              </div>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                {order.payment.method}
              </span>
            </div>
          </div>

          {/* Items Section */}
          <div>
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Items in this Order ({order.items.length})
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    background: "#fbfcfe",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1px solid #edf0f7",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "8px",
                        objectFit: "cover",
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        {item.variant || item.category} • Sold by {item.storeName}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 700 }}>
                      {currency.format(item.price * item.quantity)}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#6b7280" }}>
                      Qty: {item.quantity} × {currency.format(item.price)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address & Method */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div className={styles.addressBox}>
              <strong
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#0b1230",
                  marginBottom: "6px",
                }}
              >
                <span className="material-icons-round" style={{ fontSize: "16px" }}>
                  place
                </span>
                Shipping Address
              </strong>
              <div>{order.shippingAddress.fullName}</div>
              <div>{order.shippingAddress.street}</div>
              <div>
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postalCode}
              </div>
              <div style={{ color: "#6b7280", marginTop: "4px" }}>
                Phone: {order.shippingAddress.phone}
              </div>
            </div>

            <div className={styles.addressBox}>
              <strong
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#0b1230",
                  marginBottom: "6px",
                }}
              >
                <span className="material-icons-round" style={{ fontSize: "16px" }}>
                  local_shipping
                </span>
                Delivery Method
              </strong>
              <div style={{ fontWeight: 600 }}>{order.shippingMethod}</div>
              <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px" }}>
                Carrier: {order.carrier}
              </div>
              <div style={{ color: "#2b6dff", fontSize: "12px", marginTop: "4px" }}>
                Tracking: {order.trackingNumber}
              </div>
            </div>
          </div>

          {/* Bank Transfer / WhatsApp Confirmation Box for Customer */}
          {order.payment?.method?.toLowerCase().includes("transfer") && (
            <div
              style={{
                marginTop: "16px",
                padding: "14px 18px",
                borderRadius: "14px",
                background: order.payment?.status === "PAID" ? "#f0fdf4" : "#fffbeb",
                border: `1.5px solid ${order.payment?.status === "PAID" ? "#bbf7d0" : "#fde68a"}`,
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span
                  className="material-icons-round"
                  style={{
                    fontSize: "20px",
                    color: order.payment?.status === "PAID" ? "#16a34a" : "#d97706",
                  }}
                >
                  {order.payment?.status === "PAID" ? "verified" : "account_balance"}
                </span>
                <strong style={{ fontSize: "14px", color: order.payment?.status === "PAID" ? "#166534" : "#92400e" }}>
                  {order.payment?.status === "PAID"
                    ? "Direct Bank Transfer — Verified"
                    : "Direct Bank Transfer — Awaiting Verification"}
                </strong>
              </div>
              <p style={{ margin: "4px 0 10px", fontSize: "12.5px", color: order.payment?.status === "PAID" ? "#15803d" : "#78350f", lineHeight: "1.4" }}>
                {order.payment?.status === "PAID"
                  ? `Your payment of ${currency.format(order.pricing.total)} has been verified by ${order.store?.name || "the seller"}.`
                  : `Please ensure you transferred ${currency.format(order.pricing.total)} and sent your payment receipt to ${order.store?.name || "the seller"} on WhatsApp.`}
              </p>
              {order.payment?.status !== "PAID" && Boolean((order.store as any)?.phone) && (
                <a
                  href={`https://wa.me/${String((order.store as any).phone).replace(/\D/g, "")}?text=${encodeURIComponent(
                    `🛍️ *SELLORA ORDER PAYMENT CONFIRMATION*\n` +
                    `Store: ${order.store?.name || "Store"}\n` +
                    `Order Ref: #${order.orderNumber}\n` +
                    `Amount: ${currency.format(order.pricing.total)}\n` +
                    `Customer: ${order.shippingAddress?.fullName}\n\n` +
                    `Hello! Here is my bank transfer receipt for Sellora Order #${order.orderNumber}. Kindly confirm payment. Thank you!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#25d366",
                    color: "#ffffff",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: "16px" }}>chat</span>
                  Send Receipt via WhatsApp to {order.store?.name || "Seller"}
                </a>
              )}
            </div>
          )}

          {/* Pricing Breakdown */}
          <div className={styles.invoiceCard}>
            <div className={styles.invoiceRow}>
              <span>Items Subtotal</span>
              <span>{currency.format(order.pricing.subtotal)}</span>
            </div>
            <div className={styles.invoiceRow}>
              <span>Shipping & Handling</span>
              <span>
                {order.pricing.shippingFee === 0
                  ? "FREE"
                  : currency.format(order.pricing.shippingFee)}
              </span>
            </div>
            {order.pricing.discount > 0 && (
              <div className={styles.invoiceRow} style={{ color: "#059669" }}>
                <span>Store Discount / Coupon</span>
                <span>-{currency.format(order.pricing.discount)}</span>
              </div>
            )}
            <div className={styles.invoiceRow}>
              <span>Estimated Tax</span>
              <span>₦0.00</span>
            </div>
            <div className={`${styles.invoiceRow} ${styles.invoiceRowLast}`}>
              <span>Total Paid</span>
              <span style={{ color: "#2b6dff" }}>
                {currency.format(order.pricing.total)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.secondaryActionBtn} onClick={handlePrint}>
            <span className="material-icons-round">print</span>
            Print Invoice
          </button>
          {onBuyAgain && (
            <button
              className={styles.primaryActionBtn}
              onClick={() => {
                onBuyAgain(order);
                onClose();
              }}
            >
              <span className="material-icons-round">shopping_cart</span>
              Buy Items Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
