import Link from "next/link";
import styles from "@/app/login/login.module.css";

export default function LoginFormHeader() {
  return (
    <div className={styles.formHeader}>
      <h2>Sign in to Sellora</h2>
      <p>
        New here? <Link href="/register">Create an account</Link>
      </p>
    </div>
  );
}
