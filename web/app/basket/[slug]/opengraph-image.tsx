import { OG_SIZE } from "@/lib/og-frame"
import { renderBasketOgImage } from "@/lib/og-basket"

export const runtime = "nodejs"
export const alt = "Sherhood Sherd pool"
export const size = OG_SIZE
export const contentType = "image/png"

type Props = { params: Promise<{ slug: string }> }

export default async function Image({ params }: Props) {
  const { slug } = await params
  return renderBasketOgImage(slug)
}
