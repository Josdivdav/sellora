"use client";

import styles from "./orders.module.css";
import type { Order } from "@/types/order";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

interface OrderCardProps {
  order: Order;
  onTrack: (order: Order) => void;
  onViewDetails: (order: Order) => void;
  onCancel: (order: Order) => void;
  onBuyAgain: (order: Order) => void;
  onHelp: (order: Order) => void;
}

export default function OrderCard({
  order,
  onTrack,
  onViewDetails,
  onCancel,
  onBuyAgain,
  onHelp,
}: OrderCardProps) {
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusClass = () => {
    switch (order.status) {
      case "IN_TRANSIT":
        return styles.statusInTransit;
      case "PROCESSING":
        return styles.statusProcessing;
      case "DELIVERED":
        return styles.statusDelivered;
      case "CANCELLED":
        return styles.statusCancelled;
      default:
        return "";
    }
  };

  const getStatusLabel = () => {
    switch (order.status) {
      case "IN_TRANSIT":
        return "In Transit";
      case "PROCESSING":
        return "Processing";
      case "DELIVERED":
        return "Delivered";
      case "CANCELLED":
        return "Cancelled";
      default:
        return order.status;
    }
  };

  const getEtaText = () => {
    if (order.status === "DELIVERED") {
      return `Delivered on ${formatDate(order.deliveredAt || order.estimatedDelivery)}`;
    }
    if (order.status === "CANCELLED") {
      return `Cancelled on ${formatDate(order.cancelledAt || order.createdAt)}`;
    }
    if (order.status === "IN_TRANSIT") {
      return `Estimated: ${order.estimatedDelivery}`;
    }
    return `Expected dispatch: ${order.estimatedDelivery}`;
  };

  return (
    <article className={styles.orderCard}>
      {/* Top Header */}
      <div className={styles.cardTopHeader}>
        <div className={styles.metaGroup}>
          <div className={styles.orderNumberWrap}>
            <span className={styles.orderNumber}>
              <span className="material-icons-round" style={{ fontSize: "18px", color: "#2b6dff" }}>
                receipt
              </span>
              {order.orderNumber}
            </span>
            <span className={styles.orderDate}>
              Ordered on {formatDate(order.createdAt)}
            </span>
          </div>

          <span className={`${styles.orderStatusPill} ${getStatusClass()}`}>
            <span className={styles.statusDot} />
            {getStatusLabel()}
          </span>
        </div>

        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "11.5px", color: "#6b7280", display: "block" }}>
            Total Paid ({order.items.reduce((acc, i) => acc + i.quantity, 0)} items)
          </span>
          <strong style={{ fontSize: "16px", color: "#0b1230" }}>
            {currency.format(order.pricing.total)}
          </strong>
        </div>
      </div>

      {/* Store Banner Bar */}
      <div className={styles.storeBar}>
        <div className={styles.storeInfo}>
          {order.store.avatar ? (
            <img
              src={order.store.avatar}
              alt={order.store.name}
              className={styles.storeAvatar}
            />
          ) : (
            <div
              className={styles.storeAvatar}
              style={{
                background: "#eef1ff",
                color: "#2b6dff",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: "12px",
              }}
            >
              {order.store.name.charAt(0)}
            </div>
          )}
          <span className={styles.storeName}>
            {order.store.name}
            {order.store.isVerified && (
              <span className={`material-icons-round ${styles.verifiedCheck}`}>
                verified
              </span>
            )}
          </span>
        </div>

        <div className={styles.carrierBadge}>
          <span className="material-icons-round" style={{ fontSize: "15px" }}>
            local_shipping
          </span>
          <span>{order.carrier}</span>
        </div>
      </div>

      {/* Items List */}
      <div className={styles.itemsContainer}>
        {order.items.map((item, index) => (
          <div key={index} className={styles.itemRow}>
            <div className={styles.itemMain}>
              <img
                src={item.image}
                alt={item.name}
                className={styles.itemThumb}
              />
              <div className={styles.itemDetails}>
                <span className={styles.itemName}>{item.name}</span>
                {item.variant && (
                  <span className={styles.itemVariant}>{item.variant}</span>
                )}
                <span className={styles.itemQuantityPrice}>
                  Qty: <strong>{item.quantity}</strong> × {currency.format(item.price)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className={styles.secondaryActionBtn}
              onClick={() => onBuyAgain(order)}
              title="Add this item back to your cart"
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                shopping_cart
              </span>
              Buy Again
            </button>
          </div>
        ))}
      </div>

      {/* Card Footer with ETA and Actions */}
      <div className={styles.cardFooter}>
        <div className={styles.deliveryEta}>
          <span className="material-icons-round">
            {order.status === "DELIVERED"
              ? "check_circle"
              : order.status === "CANCELLED"
              ? "cancel"
              : "schedule"}
          </span>
          <span>{getEtaText()}</span>
        </div>

        <div className={styles.actionsGroup}>
          <button
            type="button"
            className={styles.primaryActionBtn}
            onClick={() => onTrack(order)}
          >
            <span className="material-icons-round" style={{ fontSize: "16px" }}>
              navigation
            </span>
            Track Package
          </button>

          <button
            type="button"
            className={styles.secondaryActionBtn}
            onClick={() => onViewDetails(order)}
          >
            <span className="material-icons-round" style={{ fontSize: "16px" }}>
              description
            </span>
            Invoice & Details
          </button>

          {order.status === "PROCESSING" && (
            <button
              type="button"
              className={styles.dangerActionBtn}
              onClick={() => onCancel(order)}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                cancel
              </span>
              Cancel
            </button>
          )}

          <button
            type="button"
            className={styles.secondaryActionBtn}
            onClick={() => onHelp(order)}
            title="Help with this order"
          >
            <span className="material-icons-round" style={{ fontSize: "16px" }}>
              help_outline
            </span>
            Help
          </button>
        </div>
      </div>
    </article>
  );
}
