import styles from "@/app/home.module.css";

export default function SideButton({
  label,
  icon,
  n,
  onClick,
  active,
}: {
  label: string;
  icon: string;
  n?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button onClick={onClick} className={active ? styles.sideActive : ""}>
      <span className="material-icons-round">{icon}</span>
      <span>{label}</span>
      {n !== undefined && n !== null && n !== "" ? <em>{n}</em> : null}
    </button>
  );
}