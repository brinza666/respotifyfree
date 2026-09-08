import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 min-h-11 px-4 text-sm font-medium tracking-tight transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg rounded-md",
        secondary: "bg-raised text-fg border border-border rounded-md",
        ghost: "text-muted hover:text-fg rounded-md",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", block: false },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, block, type = "button", ...props }: Props) {
  return <button type={type} className={cn(buttonVariants({ variant, block }), className)} {...props} />;
}
