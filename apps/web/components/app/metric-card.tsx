import Link from "next/link"

import { cn } from "@/lib/utils"

export interface MetricCardProps {
  label: string
  value: number
  hint?: string
  href?: string
  tone?: "default" | "warning"
}

/** A single real, computed figure that links to the list behind it. */
export function MetricCard({ label, value, hint, href, tone = "default" }: MetricCardProps) {
  const body = (
    <>
      <div className="text-muted-foreground text-xs font-medium">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "warning" && value > 0 && "text-warning-foreground"
        )}
      >
        {value.toLocaleString("en-GB")}
      </div>
      {hint ? <div className="text-muted-foreground mt-0.5 text-xs">{hint}</div> : null}
    </>
  )
  const className = "bg-card block rounded-lg border p-4 transition-colors"

  return href ? (
    <Link
      href={href}
      className={cn(className, "hover:bg-accent/50 focus-visible:ring-ring/50 outline-none focus-visible:ring-3")}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}
