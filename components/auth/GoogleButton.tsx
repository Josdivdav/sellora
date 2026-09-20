interface GoogleButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  text?: string;
  className?: string;
  id?: string;
}

export default function GoogleButton({
  onClick,
  disabled = false,
  text = "Continue with Gmail",
  className,
  id = "gmailBtn",
}: GoogleButtonProps) {
  return (
    <button
      type="button"
      className={className}
      id={id}
      onClick={onClick}
      disabled={disabled}
    >
      <img src="/google.svg" alt="Google icon" />
      {text}
    </button>
  );
}
