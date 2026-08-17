/**
 * Unified Button — wrapps Shadcn/UI Button (Creative Tim style).
 * Preserves the legacy prop API so all existing code continues to work.
 */
import { CSSProperties } from "react";
import {
  Button as ShadcnButton,
  ButtonProps as ShadcnButtonProps,
  buttonVariants,
} from "@/components/ui/button";
import { cn } from "@/utils";
import Svg from "../Svg";

// Map legacy color + outline flag to the CVA variant names in button.tsx
const legacyColorToVariant: Record<string, Record<"filled" | "outline", string>> = {
  default: { filled: "default", outline: "outline-default" },
  secondary: { filled: "secondary", outline: "outline-secondary" },
  lila: { filled: "black", outline: "outline-secondary" },
  info: { filled: "info", outline: "outline-info" },
  lilac: { filled: "info", outline: "outline-info" },
  blue: { filled: "primary", outline: "outline-primary" },
  indigo: { filled: "primary", outline: "outline-primary" },
  violet: { filled: "primary", outline: "outline-primary" },
  primary: { filled: "primary", outline: "outline-primary" },
  success: { filled: "success", outline: "outline-success" },
  successTicket: { filled: "success", outline: "outline-success" },
  danger: { filled: "danger", outline: "outline-danger" },
  warning: { filled: "warning", outline: "outline-warning" },
  white: { filled: "white", outline: "outline-white" },
  black: { filled: "black", outline: "outline-black" },
};

interface ButtonProps extends Omit<ShadcnButtonProps, "color" | "size"> {
  /** Legacy loose size — not forwarded to Shadcn */
  size?: string;
  /** Legacy color: 'secondary' | 'primary' | 'danger' | 'success' | 'warning' | 'info' | 'blue' | 'lila' | 'lilac' | 'white' | 'black' | 'default' */
  color?: string;
  isLoading?: boolean;
  icon?: string;
  isIcon?: boolean;
  onlyIcon?: boolean;
  outline?: boolean;
  fill?: boolean;
  title?: string;
  style?: CSSProperties;
  onKeyDown?: any;
  onMouseEnter?: any;
  onMouseLeave?: any;
}

const Button = ({
  onClick,
  disabled = false,
  color = "default",
  onMouseEnter,
  onMouseLeave,
  type = "button",
  children,
  onKeyDown,
  icon,
  isIcon,
  onlyIcon,
  fill,
  id,
  outline,
  title,
  isLoading,
  className,
  style,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  size: _size,
  ...rest
}: ButtonProps) => {
  const colorMap = legacyColorToVariant[color] ?? legacyColorToVariant["default"];
  const resolvedVariant = (outline ? colorMap.outline : colorMap.filled) as any;

  return (
    <ShadcnButton
      id={id}
      type={type}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={!!(isLoading || disabled)}
      title={title}
      style={style}
      variant={resolvedVariant}
      className={cn(
        fill ? "w-full" : "",
        onlyIcon ? "px-2" : isIcon ? "px-3" : "",
        className
      )}
      {...rest}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-b-transparent rounded-full inline-block animate-spin" />
      ) : (
        <>
          {isIcon && icon && (
            <Svg
              icon={icon}
              className={cn(
                "fill-current transition-colors duration-200",
                children !== undefined ? "mr-1" : ""
              )}
            />
          )}
          {children}
        </>
      )}
    </ShadcnButton>
  );
};

export default Button;