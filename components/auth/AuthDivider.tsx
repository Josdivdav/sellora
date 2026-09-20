interface AuthDividerProps {
  text?: string;
  className?: string;
}

export default function AuthDivider({
  text = "or",
  className,
}: AuthDividerProps) {
  return (
    <div className={className}>
      <span>{text}</span>
    </div>
  );
}
