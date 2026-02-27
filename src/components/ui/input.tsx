import type {
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils/cn";

type InputVariant = "default" | "icon" | "textarea";
type IconPosition = "left" | "right";

interface BaseInputProps {
  className?: string;
  containerClassName?: string;
  icon?: ReactNode;
  iconPosition?: IconPosition;
  error?: string;
}

type TextInputProps = BaseInputProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
    variant?: Exclude<InputVariant, "textarea">;
  };

type TextareaVariantProps = BaseInputProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    variant: "textarea";
  };

export type InputProps = TextInputProps | TextareaVariantProps;

function getFieldClasses(hasIcon: boolean, iconPosition: IconPosition): string {
  return cn(
    "w-full rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-[14px] py-[10px] text-[15px] leading-[1.6] text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:border-[var(--input-border-focus)] focus-visible:shadow-[0_0_0_3px_var(--accent-light)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
    hasIcon && iconPosition === "left" ? "pl-10" : "",
    hasIcon && iconPosition === "right" ? "pr-10" : "",
  );
}

export function Input(props: InputProps): ReactElement {
  const iconPosition = props.iconPosition ?? "left";
  const hasIcon = props.variant === "icon" && Boolean(props.icon);

  if (props.variant === "textarea") {
    const {
      className,
      containerClassName,
      error,
      variant: _variant,
      icon: _icon,
      iconPosition: _iconPosition,
      ...textareaProps
    } = props;
    void _variant;
    void _icon;
    void _iconPosition;

    return (
      <div className={cn("w-full space-y-2", containerClassName)}>
        <textarea
          className={cn(getFieldClasses(false, "left"), "min-h-28 resize-y", className)}
          aria-invalid={Boolean(error)}
          {...textareaProps}
        />
        {error ? (
          <p role="alert" className="text-[13px] text-[var(--error)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const {
    className,
    containerClassName,
    error,
    icon,
    variant: _variant,
    iconPosition: _iconPosition,
    ...inputProps
  } = props;
  void _variant;
  void _iconPosition;

  return (
    <div className={cn("w-full space-y-2", containerClassName)}>
      <div className="relative">
        {hasIcon && icon ? (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--text-secondary)]",
              iconPosition === "left" ? "left-3" : "right-3",
            )}
          >
            {icon}
          </span>
        ) : null}
        <input
          className={cn(getFieldClasses(hasIcon, iconPosition), className)}
          aria-invalid={Boolean(error)}
          {...inputProps}
        />
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-[var(--error)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
