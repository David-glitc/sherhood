import { Suspense } from "react"
import CreateClient from "./create-client"

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="page-container-wide product-page py-16">
          <div className="product-surface h-64 animate-pulse" />
        </div>
      }
    >
      <CreateClient />
    </Suspense>
  )
}
