import { redirect } from "next/navigation"

export default function PoolRedirect() {
  redirect("/create?tab=pool")
}
