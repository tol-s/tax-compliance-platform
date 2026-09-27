import { SearchXIcon } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/app/empty-state"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchXIcon}
      title="Not found"
      description="This record does not exist, or it belongs to an organisation you are not signed in to."
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  )
}
