"use client";

import { useState, ChangeEvent } from "react";
import styles from "./manage-store.module.css";
import type { Product } from "@/types/product";

interface ProductFormModalProps {
  productToEdit?: Product | null;
  storeCategory?: string;
  storeName: string;
  onClose: () => void;
  onSave: (product: Product) => Promise<boolean | void> | void;
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

const MAX_PHOTOS = 8;

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
    productToEdit?.sku ||
      `SEL-${storeName.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
  );

  // Multi-image state — seed from existing product images
  const seedImages =
    productToEdit?.images && productToEdit.images.length > 0
      ? productToEdit.images
      : productToEdit?.image
      ? [productToEdit.image]
      : [];
  const [images, setImages] = useState<string[]>(seedImages);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null); // which slot is uploading

  const [description, setDescription] = useState(productToEdit?.description || "");
  const [tagsInput, setTagsInput] = useState(
    productToEdit?.tags ? productToEdit.tags.join(", ") : ""
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ── Upload a single file and append/replace in the images array ──
  const uploadFile = async (file: File, slotIdx?: number): Promise<string | null> => {
    if (file.size > 10 * 1024 * 1024) {
      setError("Image exceeds 10MB — please pick a smaller file.");
      return null;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      return data.url as string;
    } catch (err: any) {
      // Fallback: canvas compress to data URL
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 800;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
              else { w = Math.round((w * maxDim) / h); h = maxDim; }
            }
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (ctx) { ctx.drawImage(img, 0, 0, w, h); resolve(canvas.toDataURL("image/jpeg", 0.8)); }
            else resolve(String(reader.result));
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Add new photos (multiple files at once)
  const handleAddPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_PHOTOS - images.length;
    const toUpload = files.slice(0, remaining);
    setError("");

    for (let i = 0; i < toUpload.length; i++) {
      const newIdx = images.length + i;
      setUploadingIdx(newIdx);
      const url = await uploadFile(toUpload[i]);
      if (url) setImages((prev) => [...prev, url]);
    }
    setUploadingIdx(null);
    // Reset input so same file can be re-picked
    e.target.value = "";
  };

  // Replace an existing photo slot
  const handleReplacePhoto = async (idx: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploadingIdx(idx);
    const url = await uploadFile(file, idx);
    if (url) setImages((prev) => prev.map((img, i) => (i === idx ? url : img)));
    setUploadingIdx(null);
    e.target.value = "";
  };

  // Remove a photo
  const handleRemovePhoto = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // Reorder: move photo left (make it primary if moved to 0)
  const handleMoveLeft = (idx: number) => {
    if (idx === 0) return;
    setImages((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Please provide a product title."); return; }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) { setError("Please enter a valid selling price."); return; }
    if (images.length === 0) { setError("Please add at least one product photo."); return; }

    const numStock = Number(stock) || 0;
    const numOldPrice = oldPrice ? Number(oldPrice) : null;
    const tags = tagsInput.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);

    const updatedProduct: Product = {
      id: productToEdit?.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      slug: (productToEdit?.slug || name)
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""),
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
      image: images[0],      // first photo = primary
      images,
      author: storeName,
      description: description.trim(),
      stock: numStock,
      inStock: numStock > 0,
      sku: sku.trim(),
      tags,
      createdAt: productToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setError("");
    try {
      await onSave(updatedProduct);
    } catch (err: any) {
      setError(err?.message || "Failed to save product. Please try again.");
      setIsSaving(false);
    }
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
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} disabled={isSaving}>
            <span className="material-icons-round">close</span>
          </button>
        </div>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div style={{ background: "#fff1f2", color: "#e11d48", padding: "10px 14px", borderRadius: "10px", fontSize: "12.5px", fontWeight: 600 }}>
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
                onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder="e.g. Vintage Denim Jacket, Wireless Earbuds..."
                required
              />
            </div>

            {/* Category & SKU */}
            <div className={styles.twoColRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select className={styles.formInput} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>SKU Code</label>
                <input type="text" className={styles.formInput} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. SEL-TOP-001" />
              </div>
            </div>

            {/* Price & Compare Price */}
            <div className={styles.twoColRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Price (₦ NGN) <span style={{ color: "#e11d48" }}>*</span></label>
                <input type="number" className={styles.formInput} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 35000" min="0" step="100" required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Compare at Price (₦ NGN)</label>
                <input type="number" className={styles.formInput} value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="Optional original price" min="0" step="100" />
              </div>
            </div>

            {/* Stock & Tags */}
            <div className={styles.twoColRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Inventory Stock</label>
                <input type="number" className={styles.formInput} value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Available units" min="0" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tags (comma separated)</label>
                <input type="text" className={styles.formInput} value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. streetwear, oversized" />
              </div>
            </div>

            {/* ── Multi-photo gallery ── */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  Product Photos{" "}
                  <span style={{ color: "#e11d48" }}>*</span>
                  <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: "6px" }}>
                    ({images.length}/{MAX_PHOTOS}) · first photo is the cover
                  </span>
                </span>
                {images.length < MAX_PHOTOS && (
                  <label className={styles.photoAddBtn} style={{ cursor: uploadingIdx !== null ? "not-allowed" : "pointer" }}>
                    <span className="material-icons-round" style={{ fontSize: "15px" }}>add_photo_alternate</span>
                    Add Photos
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleAddPhotos}
                      disabled={uploadingIdx !== null || isSaving}
                    />
                  </label>
                )}
              </label>

              <div className={styles.photoGrid}>
                {images.map((src, idx) => (
                  <div key={idx} className={`${styles.photoSlot} ${idx === 0 ? styles.photoSlotPrimary : ""}`}>
                    <img
                      src={src}
                      alt={`Photo ${idx + 1}`}
                      className={styles.photoSlotImg}
                      style={{ opacity: uploadingIdx === idx ? 0.35 : 1 }}
                    />

                    {uploadingIdx === idx && (
                      <div className={styles.photoSlotSpinner}>
                        <span className={`material-icons-round ${styles.spinning}`} style={{ fontSize: "22px", color: "#4f46e5" }}>sync</span>
                      </div>
                    )}

                    {idx === 0 && (
                      <span className={styles.photoCoverBadge}>Cover</span>
                    )}

                    {/* Overlay controls */}
                    <div className={styles.photoSlotOverlay}>
                      {idx > 0 && (
                        <button type="button" title="Make cover" onClick={() => handleMoveLeft(idx)} className={styles.photoActionBtn}>
                          <span className="material-icons-round" style={{ fontSize: "14px" }}>star</span>
                        </button>
                      )}
                      <label title="Replace" className={styles.photoActionBtn} style={{ cursor: "pointer" }}>
                        <span className="material-icons-round" style={{ fontSize: "14px" }}>edit</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={(e) => handleReplacePhoto(idx, e)} disabled={uploadingIdx !== null || isSaving} />
                      </label>
                      <button type="button" title="Remove" onClick={() => handleRemovePhoto(idx)} className={styles.photoActionBtnDanger}>
                        <span className="material-icons-round" style={{ fontSize: "14px" }}>delete</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Empty slot prompt */}
                {images.length === 0 && (
                  <label className={styles.photoEmptySlot} style={{ cursor: uploadingIdx !== null ? "not-allowed" : "pointer" }}>
                    <span className="material-icons-round" style={{ fontSize: "32px", color: "#c4b5fd" }}>add_photo_alternate</span>
                    <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>Upload photos</span>
                    <span style={{ fontSize: "11px", color: "#9ca3af" }}>JPG, PNG, WEBP · up to 10MB each</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleAddPhotos}
                      disabled={uploadingIdx !== null || isSaving}
                    />
                  </label>
                )}
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
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelModalBtn} onClick={onClose} disabled={isSaving}>Cancel</button>
            <button type="submit" className={styles.saveModalBtn} disabled={isSaving || uploadingIdx !== null}>
              {isSaving ? "Saving..." : isEditing ? "Save Changes" : "List Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
