import { useId } from "react";

type TextFieldSize = "md" | "sm";

type TextFieldProps = Omit<React.ComponentProps<"input">, "size" | "type"> & {
  label?: string;
  type?: "text" | "email" | "password" | "url";
  /** The field's error message. Setting it marks the field invalid. */
  error?: string;
  size?: TextFieldSize;
};

const SIZES: Record<TextFieldSize, string> = {
  md: "h-13",
  sm: "h-11.5",
};

/** A labelled input with an inline error (ui.md §1.4). */
export function TextField({
  label,
  type = "text",
  error,
  size = "md",
  id,
  className = "",
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  const border = error
    ? "border-[1.5px] border-status-error-border"
    : "border border-default";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-strong">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-md bg-surface-card px-4 text-md text-strong placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500 ${SIZES[size]} ${border}`}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="m-0 text-sm text-status-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
