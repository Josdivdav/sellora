import Link from "next/link";
import styles from "@/app/register/register.module.css";

export default function RegisterFooter() {
  return (
    <p className={styles.signupLine}>
      Already have an account? <Link href="/login">Sign in</Link>
    </p>
  );
}
