import { redirect } from "next/navigation"

export default async function ClientIndex({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params
  redirect(`/clients/${id}/overview`)
}
