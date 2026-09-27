import { CalculatorIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"

export default function CalculationsTab() {
  return (
    <EmptyState
      icon={CalculatorIcon}
      title="No calculations"
      description="Every calculation is versioned and traceable to rules, classifications and source transactions."
    />
  )
}
