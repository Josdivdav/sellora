"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "@/app/home.module.css";
import SearchSuggestionsDropdown from "@/components/search/SearchSuggestionsDropdown";

interface HomeHeaderProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  cartCount: number;
  onOpenSidebar: () => void;
  onCartClick: () => void;
  onLogoClick?: () => void;
}

export default function HomeHeader({
  search = "",
  onSearchChange,
  cartCount,
  onOpenSidebar,
  onCartClick,
  onLogoClick,
}: HomeHeaderProps) {
  const router = useRouter();
  const [internalSearch, setInternalSearch] = useState(search);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize internal state when parent search prop changes
  useEffect(() => {
    setInternalSearch(search);
  }, [search]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalSearch(val);
    onSearchChange?.(val);
    setIsDropdownOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    inputRef.current?.blur();
    const trimmed = internalSearch.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/search");
    }
  };

  const handleClear = () => {
    setInternalSearch("");
    onSearchChange?.("");
    inputRef.current?.focus();
  };

  const handleSelectTerm = (term: string) => {
    setInternalSearch(term);
    onSearchChange?.(term);
    setIsDropdownOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.menuButton}
        onClick={onOpenSidebar}
        aria-label="Open menu"
      >
        <span className="material-icons-round">menu</span>
      </button>

      <Link
        href="/"
        onClick={onLogoClick}
        className={styles.logoLink}
        title="Sellora — Home"
      >
        <div className={styles.logo}>
          <img src="/favico.png" width="35" height="35" alt="Sellora icon" />
          <img src="/logo-text.png" width="75" height="26" alt="Sellora logo" />
        </div>
      </Link>

      <div className={styles.searchWrapper}>
        <form
          className={styles.search}
          onSubmit={handleSearchSubmit}
          role="search"
        >
          <span className="material-icons-round" aria-hidden="true">
            search
          </span>
          <input
            ref={inputRef}
            type="search"
            value={internalSearch}
            onChange={handleInputChange}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Search products by name, store, category…"
            aria-label="Search products"
            autoComplete="off"
          />
          {internalSearch.trim().length > 0 && (
            <button
              type="button"
              className={styles.headerSearchClear}
              onClick={handleClear}
              aria-label="Clear search"
              title="Clear search"
            >
              <span className="material-icons-round" style={{ fontSize: "17px" }}>
                close
              </span>
            </button>
          )}
        </form>

        <SearchSuggestionsDropdown
          query={internalSearch}
          isOpen={isDropdownOpen}
          onSelectTerm={handleSelectTerm}
          onClose={() => setIsDropdownOpen(false)}
        />
      </div>

      <button
        type="button"
        className={styles.cart}
        onClick={onCartClick}
        aria-label={`View cart with ${cartCount} items`}
      >
        <span className="material-icons-round">shopping_cart</span>
        {cartCount > 0 && <span>{cartCount}</span>}
      </button>
    </header>
  );
}

