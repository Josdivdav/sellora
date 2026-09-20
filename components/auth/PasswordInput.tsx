"use client";

import { useState } from "react";

interface PasswordInputStyles {
  fieldGroup?: string;
  inputWrap?: string;
  passwordInput?: string;
  toggleVisibility?: string;
}

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  id: string;
  name: string;
  styles?: PasswordInputStyles;
  toggleId?: string;
}

export default function PasswordInput({
  label = "Password",
  id,
  name,
  placeholder = "Enter your password",
  styles,
  toggleId,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={styles?.fieldGroup}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className={styles?.inputWrap}>
        <span className="material-icons-round">lock_outline</span>
        <input
          type={showPassword ? "text" : "password"}
          id={id}
          name={name}
          placeholder={placeholder}
          className={styles?.passwordInput}
          {...props}
        />
        <span
          className={`material-icons-round ${styles?.toggleVisibility || ""}`}
          id={toggleId}
          onClick={() => setShowPassword((prev) => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowPassword((prev) => !prev);
            }
          }}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? "visibility" : "visibility_off"}
        </span>
      </div>
    </div>
  );
}
