"use client";

import { useState } from "react";
import styles from "./orders.module.css";
import type { Order } from "@/types/order";

interface CancelOrderModalProps {
  order: Order;
  onClose: () => void;
  onConfirmCancel: (orderId: string, reason: string) => void;
}

const CANCEL_REASONS = [
  "Changed my mind / no longer needed",
  "Ordered the wrong size, color, or variant",
  "Found a cheaper price elsewhere",
  "Need to modify shipping address",
  "Delivery time is too long",
  "Created duplicate order by mistake",
];

export default function CancelOrderModal({
  order,
  onClose,
  onConfirmCancel,
}: CancelOrderModalProps) {
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      onConfirmCancel(order.id, selectedReason);
      setSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="cancel-order-title"
      >
        <div className={styles.modalHeader}>
          <h3 id="cancel-order-title" className={styles.modalTitle} style={{ color: "#dc2626" }}>
            <span className="material-icons-round">cancel</span>
            Cancel Order {order.orderNumber}
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
          <p style={{ margin: 0, fontSize: "13.5px", color: "#4b5563" }}>
            Are you sure you want to cancel this order? Once cancelled, the items
            will be released and a full refund will be processed back to your
            original payment method (<strong>{order.payment.method}</strong>).
          </p>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 700,
                color: "#111827",
                marginBottom: "8px",
              }}
            >
              Please select a reason for cancellation:
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {CANCEL_REASONS.map((reason) => (
                <label
                  key={reason}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: `1px solid ${
                      selectedReason === reason ? "#2b6dff" : "#e5e7eb"
                    }`,
                    background: selectedReason === reason ? "#eff6ff" : "#ffffff",
                    fontSize: "13px",
                    color: selectedReason === reason ? "#1d4ed8" : "#374151",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    style={{ accentColor: "#2b6dff" }}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.secondaryActionBtn} onClick={onClose}>
            Keep Order
          </button>
          <button
            className={styles.dangerActionBtn}
            onClick={handleSubmit}
            disabled={submitting}
          >
            <span className="material-icons-round">close</span>
            {submitting ? "Cancelling..." : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}
