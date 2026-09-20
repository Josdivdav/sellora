import styles from "@/app/home.module.css";

interface ToastProps {
  message: string;
}

export default function Toast({ message }: ToastProps) {
  return (
    <div
      className={`${styles.toast} ${message ? styles.show : ""}`}
      role="status"
    >
      {message}
    </div>
  );
}
