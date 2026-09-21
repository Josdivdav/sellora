"use client";

import { useState, ChangeEvent } from "react";
import styles from "./manage-store.module.css";
import type { Product } from "@/types/product";

interface ProductFormModalProps {
  productToEdit?: Product | null;
  storeCategory?: string;
  storeName: string;
  onClose: () => void;
  onSave: (product: Product) => void;
}

const CATEGORIES = [
  "Fashion & Apparel",
  "Electronics & Audio",
  "Luxury & Watches",
  "Skincare & Beauty",
  "Home & Living",
  "Jewelry & Accessories",
  "Gadgets & Tech",
  "Sports & Fitness",
  "General",
];

const PRESET_IMAGES = [
  "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80",
  "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80",
  "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
  "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80",
];

export default function ProductFormModal({
  productToEdit,
  storeCategory,
  storeName,
  onClose,
  onSave,
}: ProductFormModalProps) {
  const isEditing = Boolean(productToEdit);

  const [name, setName] = useState(productToEdit?.name || "");
  const [category, setCategory] = useState(
    productToEdit?.category || storeCategory || "Fashion & Apparel"
  );
  const [price, setPrice] = useState<number | string>(
    productToEdit?.price !== undefined ? productToEdit.price : ""
  );
  const [oldPrice, setOldPrice] = useState<number | string>(
    productToEdit?.oldPrice !== undefined && productToEdit.oldPrice !== null
      ? productToEdit.oldPrice
      : ""
  );
  const [stock, setStock] = useState<number | string>(
    productToEdit?.stock !== undefined ? productToEdit.stock : 25
  );
  const [sku, setSku] = useState(
    productToEdit?.sku || `SEL-${storeName.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [image, setImage] = useState(
    productToEdit?.image || PRESET_IMAGES[0]
  );
  const [description, setDescription] = useState(productToEdit?.description || "");
  const [tagsInput, setTagsInput] = useState(
    productToEdit?.tags ? productToEdit.tags.join(", ") : ""
  );
  const [error, setError] = useState("");

  const handleImageFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size exceeds 5MB. Please choose a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a product title.");
      return;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError("Please enter a valid selling price greater than 0.");
      return;
    }

    const numStock = Number(stock) || 0;
    const numOldPrice = oldPrice ? Number(oldPrice) : null;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const updatedProduct: Product = {
      id: productToEdit?.id || `p-merchant-${Date.now()}`,
      name: name.trim(),
      slug: (productToEdit?.slug || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, ""),
      category,
      price: numPrice,
      oldPrice: numOldPrice,
      discountPercentage:
        numOldPrice && numOldPrice > numPrice
          ? Math.round(((numOldPrice - numPrice) / numOldPrice) * 100)
          : undefined,
      currency: "NGN",
      rating: productToEdit?.rating || 5.0,
      reviewsCount: productToEdit?.reviewsCount || 0,
      image,
      images: [image],
      author: storeName,
      description: description.trim(),
      stock: numStock,
      inStock: numStock > 0,
      sku: sku.trim(),
      tags,
      createdAt: productToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedProduct);
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalHeaderTitle}>
            <span className="material-icons-round" style={{ color: "#4f46e5" }}>
              {isEditing ? "edit" : "add_circle"}
            </span>
            {isEditing ? "Edit Product" : "Add New Product"}
          </h3>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose}>
            <span className="material-icons-round">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div
                style={{
                  background: "#fff1f2",
                  color: "#e11d48",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            {/* Product Title */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Product Title <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <input
                type="text"
                className={styles.formInput}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="e.g. Vintage Denim Jacket, Wireless Earbuds..."
                required
              />
            </div>

            {/* Two col: Category & SKU */}
            <div className={styles.twoColRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select
                  className={styles.formInput}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>SKU Code</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. SEL-TOP-001"
                />
              </div>
            </div>

            {/* Two col: Price & Old Price */}
            <div className={styles.twoColRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Price (₦ NGN) <span style={{ color: "#e11d48" }}>*</span>
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 35000"
                  min="0"
                  step="100"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Compare at Price (₦ NGN)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={oldPrice}
                  onChange={(e) => setOldPrice(e.target.value)}
                  placeholder="Optional original price"
                  min="0"
                  step="100"
                />
              </div>
            </div>

            {/* Stock Quantity */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Inventory Stock</label>
              <input
                type="number"
                className={styles.formInput}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Available units"
                min="0"
              />
            </div>

            {/* Image Preview & Presets */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Product Main Photo</label>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <img
                  src={image}
                  alt="Preview"
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "10px",
                    objectFit: "cover",
                    border: "1px solid #e5e7eb",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="Paste image URL..."
                    style={{ marginBottom: "6px" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label
                      style={{
                        fontSize: "11px",
                        color: "#4f46e5",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      📁 Upload Local File
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleImageFile}
                      />
                    </label>
                    <span style={{ fontSize: "11px", color: "#9ca3af" }}>• or choose sample:</span>
                    {PRESET_IMAGES.slice(0, 3).map((pImg, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImage(pImg)}
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "4px",
                          overflow: "hidden",
                          border: image === pImg ? "2px solid #4f46e5" : "1px solid #d1d5db",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
                        <img
                          src={pImg}
                          alt="Preset"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <textarea
                className={styles.formTextarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product highlights, materials, warranty, or sizing details..."
                rows={3}
              />
            </div>

            {/* Tags */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tags (comma separated)</label>
              <input
                type="text"
                className={styles.formInput}
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. streetwear, oversized, cotton"
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelModalBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveModalBtn}>
              {isEditing ? "Save Changes" : "List Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
