import { redirect } from "next/navigation"

export default function InstantRedirect() {
  redirect("/create?tab=instant")
}
