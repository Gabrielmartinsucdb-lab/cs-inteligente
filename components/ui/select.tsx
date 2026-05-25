import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-600",
        className
      )}
      {...props}
    />
  );
}
