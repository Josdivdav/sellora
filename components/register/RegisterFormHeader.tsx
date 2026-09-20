import Link from "next/link";
import styles from "@/app/register/register.module.css";

export default function RegisterFormHeader() {
  return (
    <div className={styles.formHeader}>
      <h2>Create your account</h2>
      <p>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
