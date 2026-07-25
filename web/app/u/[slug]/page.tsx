import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { resolveProfileParam } from "@/lib/profile-store"
import { profilePath } from "@/lib/user-profile"
import { PublicProfileClient } from "./public-profile-client"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const profile = await resolveProfileParam(slug)
  if (!profile) {
    return buildPageMetadata({
      title: "Player",
      description: "Sherhood player profile",
      path: `/u/${slug}`,
      noIndex: true,
    })
  }
  return buildPageMetadata({
    title: `${profile.name} · Sherhood`,
    description: profile.allowReceive
      ? `${profile.name} accepts Sherds and tokens on Sherhood.`
      : `${profile.name} on Sherhood.`,
    path: profilePath(profile),
  })
}

export default function PublicProfilePage() {
  return <PublicProfileClient />
}
