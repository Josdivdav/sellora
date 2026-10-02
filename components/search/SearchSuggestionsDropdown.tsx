"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import styles from "./search.module.css";
import { getStoreRelativePath } from "@/lib/storeUrl";

interface StoreSuggestion {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  isVerified?: boolean;
  category?: string;
}

interface ProductSuggestion {
  id: string;
  slug?: string;
  name: string;
  price: number;
  image: string;
  category: string;
  author?: string;
}

interface SearchSuggestionsDropdownProps {
  query: string;
  isOpen: boolean;
  onSelectTerm: (term: string) => void;
  onClose: () => void;
}

export default function SearchSuggestionsDropdown({
  query,
  isOpen,
  onSelectTerm,
  onClose,
}: SearchSuggestionsDropdownProps) {
  const [terms, setTerms] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stores, setStores] = useState<StoreSuggestion[]>([]);
  const [products, setProducts] = useState<ProductSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search query suggestions fetch
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const controller = new AbortController();

    const fetchTimer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const clean = query.trim().toLowerCase();
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(clean)}`, {
          signal: controller.signal,
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          setTerms(json.terms || []);
          setCategories(json.categories || []);
          setStores(json.stores || []);
          setProducts(json.products || []);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("Could not fetch suggestions:", err);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }, 120);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(fetchTimer);
    };
  }, [query, isOpen]);

  // Click outside to dismiss
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.trim().toLowerCase();
  const hasResults =
    terms.length > 0 || categories.length > 0 || stores.length > 0 || products.length > 0;

  // Highlight matched substring
  const highlightMatch = (text: string) => {
    if (!cleanQuery) return text;
    const index = text.toLowerCase().indexOf(cleanQuery);
    if (index === -1) return text;
    const before = text.slice(0, index);
    const match = text.slice(index, index + cleanQuery.length);
    const after = text.slice(index + cleanQuery.length);
    return (
      <>
        {before}
        <span className={styles.suggestionHighlight}>{match}</span>
        {after}
      </>
    );
  };

  return (
    <div ref={containerRef} className={styles.suggestionsDropdown}>
      {/* 1. Keyword search suggestions */}
      {terms.length > 0 && (
        <div className={styles.suggestionsSection}>
          <div className={styles.suggestionsSectionTitle}>
            <span className="material-icons-round" style={{ fontSize: "14px" }}>
              {cleanQuery ? "search" : "trending_up"}
            </span>
            <span>{cleanQuery ? "Related Searches" : "Trending Searches"}</span>
          </div>
          {terms.map((term) => (
            <button
              key={term}
              type="button"
              className={styles.suggestionItem}
              onClick={() => onSelectTerm(term)}
            >
              <div className={styles.suggestionItemLeft}>
                <span className="material-icons-round" style={{ fontSize: "18px", color: "#94a3b8" }}>
                  {cleanQuery ? "search" : "north_east"}
                </span>
                <span>{highlightMatch(term)}</span>
              </div>
              <span className={`material-icons-round ${styles.suggestionArrow}`}>
                arrow_forward
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 2. Category suggestions */}
      {categories.length > 0 && (
        <div className={styles.suggestionsSection}>
          <div className={styles.suggestionsSectionTitle}>
            <span className="material-icons-round" style={{ fontSize: "14px" }}>
              category
            </span>
            <span>Categories</span>
          </div>
          <div className={styles.categoryPillList}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={styles.categoryPillBtn}
                onClick={() => onSelectTerm(cat)}
              >
                <span className="material-icons-round" style={{ fontSize: "14px", color: "#2563eb" }}>
                  sell
                </span>
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Matching Stores */}
      {stores.length > 0 && (
        <div className={styles.suggestionsSection}>
          <div className={styles.suggestionsSectionTitle}>
            <span className="material-icons-round" style={{ fontSize: "14px" }}>
              storefront
            </span>
            <span>Verified Merchants</span>
          </div>
          {stores.map((store) => (
            <Link
              key={store.id}
              href={getStoreRelativePath(store)}
              className={styles.storeSuggestionItem}
              onClick={onClose}
            >
              <div className={styles.storeSuggestionLeft}>
                {store.logo ? (
                  <img src={store.logo} alt={store.name} className={styles.storeSuggestionLogo} />
                ) : (
                  <div className={styles.storeSuggestionMonogram}>
                    {(store.name || "S")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className={styles.storeSuggestionName}>
                    <span>{highlightMatch(store.name)}</span>
                    {store.isVerified && (
                      <span
                        className="material-icons-round"
                        style={{ fontSize: "15px", color: "#10b981" }}
                      >
                        verified
                      </span>
                    )}
                  </div>
                  <span className={styles.storeSuggestionBadge}>
                    {store.category || "Verified Store"}
                  </span>
                </div>
              </div>
              <span className={styles.storeVisitPill}>Visit Store</span>
            </Link>
          ))}
        </div>
      )}

      {/* 4. Top product previews */}
      {products.length > 0 && (
        <div className={styles.suggestionsSection}>
          <div className={styles.suggestionsSectionTitle}>
            <span className="material-icons-round" style={{ fontSize: "14px" }}>
              shopping_bag
            </span>
            <span>Products</span>
          </div>
          {products.map((prod) => (
            <Link
              key={prod.id}
              href={`/products/${prod.slug || prod.id}`}
              className={styles.productSuggestionItem}
              onClick={onClose}
            >
              <img src={prod.image} alt={prod.name} className={styles.productSuggestionImg} />
              <div className={styles.productSuggestionDetails}>
                <span className={styles.productSuggestionName}>{highlightMatch(prod.name)}</span>
                <div className={styles.productSuggestionPriceRow}>
                  <span className={styles.productSuggestionPrice}>
                    ₦{prod.price.toLocaleString()}
                  </span>
                  <span className={styles.productSuggestionCategory}>{prod.category}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Bottom CTA: Search for "{query}" */}
      {cleanQuery && (
        <button
          type="button"
          className={styles.viewAllResultsBtn}
          onClick={() => onSelectTerm(cleanQuery)}
        >
          <span>View all results for &ldquo;{cleanQuery}&rdquo;</span>
          <span className="material-icons-round" style={{ fontSize: "16px" }}>
            arrow_forward
          </span>
        </button>
      )}
    </div>
  );
}
