/**
 * Shadcn/UI Button — Extended with Creative Tim color palette
 * Variants: default, secondary, destructive, success, warning, info, outline, ghost, link
 * Sizes: default, sm, lg, icon
 */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils"

const buttonVariants = cva(
  // Base styles
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-lg text-sm font-semibold",
    "transition-all duration-200 ease-in-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "cursor-pointer select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        // ── Filled variants ──────────────────────────────────────────────
        default:
          "bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:scale-[0.98]",
        primary:
          "btn-accent shadow-sm active:scale-[0.98]",
        secondary:
          "btn-accent-soft shadow-sm active:scale-[0.98]",
        destructive:
          "bg-rose-500 text-white shadow-sm hover:bg-rose-600 active:scale-[0.98]",
        danger:
          "bg-rose-500 text-white shadow-sm hover:bg-rose-600 active:scale-[0.98]",
        success:
          "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 active:scale-[0.98]",
        warning:
          "bg-amber-400 text-amber-900 shadow-sm hover:bg-amber-500 active:scale-[0.98]",
        info:
          "bg-sky-500 text-white shadow-sm hover:bg-sky-600 active:scale-[0.98]",

        // ── Outline variants ─────────────────────────────────────────────
        "outline-default":
          "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 active:scale-[0.98]",
        "outline-primary":
          "border border-accent-brand bg-transparent text-accent-brand hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]",
        "outline-secondary":
          "border border-violet-500 bg-transparent text-violet-600 hover:bg-violet-50 active:scale-[0.98]",
        "outline-destructive":
          "border border-rose-400 bg-transparent text-rose-500 hover:bg-rose-50 active:scale-[0.98]",
        "outline-danger":
          "border border-rose-400 bg-transparent text-rose-500 hover:bg-rose-50 active:scale-[0.98]",
        "outline-success":
          "border border-emerald-400 bg-transparent text-emerald-600 hover:bg-emerald-50 active:scale-[0.98]",
        "outline-warning":
          "border border-amber-400 bg-transparent text-amber-600 hover:bg-amber-50 active:scale-[0.98]",
        "outline-info":
          "border border-sky-400 bg-transparent text-sky-600 hover:bg-sky-50 active:scale-[0.98]",

        // ── Utility variants ─────────────────────────────────────────────
        ghost:
          "bg-transparent text-slate-700 hover:bg-slate-100 active:scale-[0.98]",
        link:
          "text-blue-600 underline-offset-4 hover:underline p-0 h-auto",
        white:
          "bg-white text-slate-800 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98]",
        black:
          "bg-slate-900 dark:bg-slate-600 text-white shadow-sm hover:bg-slate-700 dark:hover:bg-slate-500 active:scale-[0.98]",
        "outline-black":
          "border border-slate-900 dark:border-slate-400 bg-transparent text-slate-900 dark:text-slate-200 hover:bg-slate-900 dark:hover:bg-slate-700 hover:text-white active:scale-[0.98]",
        "outline-white":
          "border border-white bg-transparent text-white hover:bg-white hover:text-slate-900 active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-11 px-8 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
