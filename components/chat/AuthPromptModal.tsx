"use client";

import { useRouter, usePathname } from "next/navigation";
import styles from "./chat.module.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  storeName?: string;
}

export default function AuthPromptModal({ isOpen, onClose, storeName = "Seller" }: Props) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  if (!isOpen) return null;

  const handleSignIn = () => {
    onClose();
    router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
  };

  const handleRegister = () => {
    onClose();
    router.push(`/register?redirect=${encodeURIComponent(pathname)}`);
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.authModalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.authModalIconWrap}>
          <span className="material-icons-round" style={{ fontSize: "36px", color: "#2563eb" }}>
            forum
          </span>
        </div>

        <h3 className={styles.authModalTitle}>Account Required to Chat</h3>
        <p className={styles.authModalDesc}>
          You must have a registered account before sending messages to <strong>{storeName}</strong>.
          An account ensures secure messaging and notifies you as soon as the merchant replies.
        </p>

        <div className={styles.authModalActions}>
          <button type="button" className={styles.primaryAuthBtn} onClick={handleSignIn}>
            <span className="material-icons-round" style={{ fontSize: "18px" }}>
              login
            </span>
            Sign In to Chat
          </button>

          <button type="button" className={styles.secondaryAuthBtn} onClick={handleRegister}>
            <span className="material-icons-round" style={{ fontSize: "18px" }}>
              person_add
            </span>
            Create Free Account
          </button>

          <button type="button" className={styles.cancelAuthBtn} onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
