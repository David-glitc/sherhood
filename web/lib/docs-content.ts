import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { DOCS_NAV } from "@/lib/docs"

const DOCS_DIR = path.join(process.cwd(), "content/docs")

export type DocSlug = (typeof DOCS_NAV)[number]["href"] extends `/docs/${infer S}` ? S : never

export function getDocSlugs(): string[] {
  return DOCS_NAV.map((d) => d.href.replace("/docs/", ""))
}

export function getDocBySlug(slug: string): { content: string; title: string; description: string } {
  const file = path.join(DOCS_DIR, `${slug}.mdx`)
  if (!fs.existsSync(file)) {
    throw new Error(`Missing doc: ${slug}`)
  }
  const raw = fs.readFileSync(file, "utf8")
  const { content, data } = matter(raw)
  const nav = DOCS_NAV.find((d) => d.href === `/docs/${slug}`)
  return {
    content,
    title: (data.title as string) || nav?.title || slug,
    description: (data.description as string) || nav?.description || "",
  }
}
