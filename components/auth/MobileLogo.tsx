import styles from "@/app/login/login.module.css";

interface MobileLogoProps {
  className?: string;
}

export default function MobileLogo({ className }: MobileLogoProps) {
  return (
    <div className={className || styles.mobileLogo}>
      <img src="/logo.png" alt="Sellora logo" />
      <span>Sellora</span>
    </div>
  );
}
