import Link from "next/link";
import styles from "@/app/login/login.module.css";

export default function LoginFooter() {
  return (
    <p className={styles.signupLine}>
      Don&apos;t have an account? <Link href="/register">Sign up free</Link>
    </p>
  );
}
