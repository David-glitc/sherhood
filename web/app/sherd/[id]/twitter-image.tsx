import { OG_SIZE } from "@/lib/og-frame"
import { renderSherdOgImage } from "@/lib/og-sherd"

export const runtime = "nodejs"
export const alt = "Sherhood Sherd"
export const size = OG_SIZE
export const contentType = "image/png"

type Props = { params: Promise<{ id: string }> }

export default async function Image({ params }: Props) {
  const { id } = await params
  return renderSherdOgImage(id)
}
