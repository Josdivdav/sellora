"use client";

import styles from "./favorites.module.css";

interface StoreFilterBarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export default function StoreFilterBar({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}: StoreFilterBarProps) {
  return (
    <div className={styles.filterContainer}>
      <div className={styles.categoryPills}>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              className={`${styles.pillBtn} ${
                isActive ? styles.pillBtnActive : ""
              }`}
              onClick={() => onSelectCategory(cat)}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className={styles.searchSortRow}>
        <div className={styles.searchBox}>
          <span className="material-icons-round">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search favorite stores, specialties, or locations..."
            aria-label="Search favorite stores"
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
          className={styles.sortSelect}
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="Sort stores"
        >
          <option value="POPULAR">Most Followers</option>
          <option value="RATING">Highest Rated</option>
          <option value="NAME">Name (A-Z)</option>
        </select>
      </div>
    </div>
  );
}
