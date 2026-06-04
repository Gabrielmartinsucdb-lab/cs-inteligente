import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-center text-sm font-semibold leading-none transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-slate-950 text-white shadow-[0_10px_22px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 active:bg-slate-900",
        secondary: "bg-slate-100 text-slate-950 hover:bg-slate-200 active:bg-slate-300",
        outline: "border border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-950 hover:bg-slate-50 active:bg-slate-100",
        ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
        danger: "bg-red-600 text-white shadow-[0_10px_22px_rgba(220,38,38,0.18)] hover:-translate-y-0.5 hover:bg-red-700 active:translate-y-0 active:bg-red-800"
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-xs",
        icon: "h-10 w-10 p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
