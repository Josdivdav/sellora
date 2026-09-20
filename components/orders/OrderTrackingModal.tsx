"use client";

import { useState } from "react";
import styles from "./orders.module.css";
import type { Order } from "@/types/order";

interface OrderTrackingModalProps {
  order: Order;
  onClose: () => void;
}

export default function OrderTrackingModal({
  order,
  onClose,
}: OrderTrackingModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(order.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="tracking-modal-title"
      >
        <div className={styles.modalHeader}>
          <h3 id="tracking-modal-title" className={styles.modalTitle}>
            <span className="material-icons-round">local_shipping</span>
            Track Shipment
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
          <div className={styles.trackingHero}>
            <div className={styles.trackingHeroInfo}>
              <h4>{order.carrier}</h4>
              <p>
                Tracking #{order.trackingNumber} • {order.shippingMethod}
              </p>
            </div>
            <button
              className={styles.copyCodeBtn}
              onClick={handleCopyTracking}
              type="button"
            >
              <span className="material-icons-round">
                {copied ? "check" : "content_copy"}
              </span>
              {copied ? "Copied!" : "Copy #"}
            </button>
          </div>

          <div>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: 700,
                marginBottom: "14px",
                color: "#111827",
              }}
            >
              Estimated Delivery:{" "}
              <span style={{ color: "#2b6dff" }}>{order.estimatedDelivery}</span>
            </h4>

            <div className={styles.timeline}>
              {order.trackingEvents.map((event, idx) => {
                const isLast = idx === order.trackingEvents.length - 1;
                return (
                  <div key={idx} className={styles.timelineItem}>
                    {!isLast && (
                      <div
                        className={`${styles.timelineLine} ${
                          event.completed ? styles.timelineLineDone : ""
                        }`}
                      />
                    )}

                    <div
                      className={`${styles.timelineMarker} ${
                        event.completed
                          ? styles.timelineMarkerDone
                          : event.current
                          ? styles.timelineMarkerCurrent
                          : ""
                      }`}
                    >
                      <span
                        className="material-icons-round"
                        style={{ fontSize: "16px" }}
                      >
                        {event.completed
                          ? "check"
                          : event.current
                          ? "schedule"
                          : "radio_button_unchecked"}
                      </span>
                    </div>

                    <div className={styles.timelineContent}>
                      <span className={styles.timelineTitle}>{event.title}</span>
                      <p className={styles.timelineDesc}>{event.description}</p>
                      <div className={styles.timelineMeta}>
                        <span>{formatDate(event.timestamp)}</span>
                        <span>•</span>
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {order.notes && (
            <div className={styles.addressBox}>
              <strong style={{ display: "block", marginBottom: "4px" }}>
                Delivery Instructions:
              </strong>
              {order.notes}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              background: "#f9fafb",
              borderRadius: "12px",
              fontSize: "12.5px",
              color: "#4b5563",
            }}
          >
            <span>Questions about delivery?</span>
            {order.carrierPhone && (
              <a
                href={`tel:${order.carrierPhone}`}
                style={{
                  color: "#2b6dff",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span className="material-icons-round" style={{ fontSize: "16px" }}>
                  call
                </span>
                {order.carrierPhone}
              </a>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.primaryActionBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
