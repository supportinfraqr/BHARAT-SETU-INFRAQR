import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[var(--color-bss-interactive-blue)] text-white hover:bg-[var(--color-bss-navy)] shadow-sm":
              variant === "primary",
            "bg-[var(--color-bss-surface)] text-[var(--color-bss-text-primary)] hover:bg-[var(--color-bss-blue-tint)]":
              variant === "secondary",
            "border border-[var(--color-bss-border)] bg-transparent hover:bg-[var(--color-bss-surface)] text-[var(--color-bss-text-primary)]":
              variant === "outline",
            "hover:bg-[var(--color-bss-surface)] text-[var(--color-bss-text-primary)]":
              variant === "ghost",
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-4 py-2 text-sm": size === "md",
            "h-12 px-8 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
