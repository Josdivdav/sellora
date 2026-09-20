"use client";

import styles from "./orders.module.css";
import type { OrderStatus } from "@/types/order";

export type TabFilter = "ALL" | OrderStatus;

interface OrderFilterBarProps {
  currentTab: TabFilter;
  onSelectTab: (tab: TabFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  timeFilter: string;
  onTimeFilterChange: (time: string) => void;
  counts: Record<TabFilter, number>;
}

export default function OrderFilterBar({
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  timeFilter,
  onTimeFilterChange,
  counts,
}: OrderFilterBarProps) {
  const tabs: { id: TabFilter; label: string }[] = [
    { id: "ALL", label: "All Orders" },
    { id: "IN_TRANSIT", label: "In Transit" },
    { id: "PROCESSING", label: "Processing" },
    { id: "DELIVERED", label: "Delivered" },
    { id: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <div className={styles.filterBarContainer}>
      <div className={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const count = counts[tab.id] || 0;
          return (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tabButton} ${
                isActive ? styles.tabButtonActive : ""
              }`}
              onClick={() => onSelectTab(tab.id)}
            >
              <span>{tab.label}</span>
              <span
                className={`${styles.tabBadge} ${
                  isActive ? styles.tabBadgeActive : ""
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.searchFilterRow}>
        <div className={styles.searchBox}>
          <span className="material-icons-round">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by order ID, item name, or store..."
            aria-label="Search orders"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              style={{
                background: "transparent",
                border: 0,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                color: "#9ca3af",
                padding: "2px",
              }}
              aria-label="Clear search"
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                close
              </span>
            </button>
          )}
        </div>

        <select
          className={styles.timeSelect}
          value={timeFilter}
          onChange={(e) => onTimeFilterChange(e.target.value)}
          aria-label="Filter by time range"
        >
          <option value="ALL">All Time</option>
          <option value="30_DAYS">Last 30 Days</option>
          <option value="3_MONTHS">Last 3 Months</option>
          <option value="2026">Year 2026</option>
        </select>
      </div>
    </div>
  );
}
