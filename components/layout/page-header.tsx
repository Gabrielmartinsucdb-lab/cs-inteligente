import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-900 bg-slate-950 px-6 py-6 text-white shadow-[0_22px_50px_rgba(15,23,42,0.2)]",
        className
      )}
    >
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -left-16 top-0 h-40 w-40 rounded-full border border-white/10" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full border border-white/10" />
      </div>

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight lg:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 lg:text-base">
            {description}
          </p>
        </div>

        {actions ? <div className="relative">{actions}</div> : null}
      </div>
    </section>
  );
}
