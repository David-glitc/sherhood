import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MDXRemote } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"
import { docsMdxComponents } from "@/components/docs/mdx-components"
import { DocsPager } from "@/components/docs/docs-pager"
import { DOCS_NAV, docsMeta } from "@/lib/docs"
import { getDocBySlug, getDocSlugs } from "@/lib/docs-content"

type PageProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getDocSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const doc = getDocBySlug(slug)
    return docsMeta(doc.title, doc.description)
  } catch {
    return docsMeta("Help", "Learn how to use Sherhood")
  }
}

export default async function DocSlugPage({ params }: PageProps) {
  const { slug } = await params
  if (!getDocSlugs().includes(slug)) notFound()

  const doc = getDocBySlug(slug)
  const index = DOCS_NAV.findIndex((d) => d.href === `/docs/${slug}`)
  const prev = index > 0 ? DOCS_NAV[index - 1] : undefined
  const next = index >= 0 && index < DOCS_NAV.length - 1 ? DOCS_NAV[index + 1] : undefined

  return (
    <>
      <MDXRemote
        source={doc.content}
        components={docsMdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
          },
        }}
      />
      <DocsPager prev={prev} next={next} />
    </>
  )
}
