import type { MDXComponents } from "mdx/types"
import Link from "next/link"
import type { ComponentPropsWithoutRef } from "react"

function A(props: ComponentPropsWithoutRef<"a">) {
  const href = props.href ?? "#"
  if (href.startsWith("/")) {
    return (
      <Link href={href} className="font-medium text-sherhood underline-offset-4 hover:underline">
        {props.children}
      </Link>
    )
  }
  return (
    <a
      {...props}
      href={href}
      className="font-medium text-sherhood underline-offset-4 hover:underline"
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
    />
  )
}

export const docsMdxComponents: MDXComponents = {
  h1: (props) => (
    <h1
      className="mt-2 scroll-mt-24 text-3xl font-bold tracking-tight text-white sm:text-4xl"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="mt-12 scroll-mt-24 border-b border-white/[0.08] pb-2 text-xl font-bold tracking-tight text-white"
      {...props}
    />
  ),
  h3: (props) => (
    <h3 className="mt-8 scroll-mt-24 text-lg font-semibold text-white" {...props} />
  ),
  p: (props) => <p className="mt-4 text-[15px] leading-7 text-white/60" {...props} />,
  ul: (props) => <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] text-white/60" {...props} />,
  ol: (props) => (
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] text-white/60" {...props} />
  ),
  li: (props) => <li className="leading-7 marker:text-sherhood" {...props} />,
  strong: (props) => <strong className="font-semibold text-white" {...props} />,
  code: (props) => (
    <code
      className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[13px] text-sherhood"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="mt-5 overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-4 font-mono text-[13px] leading-6 text-white/80"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className="mt-5 border-l-2 border-sherhood/60 pl-4 text-[15px] italic text-white/50"
      {...props}
    />
  ),
  table: (props) => (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-white/[0.08]">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-white/[0.04]" {...props} />,
  th: (props) => (
    <th className="border-b border-white/[0.08] px-4 py-3 font-semibold text-white" {...props} />
  ),
  td: (props) => (
    <td className="border-b border-white/[0.05] px-4 py-3 text-white/55" {...props} />
  ),
  hr: () => <hr className="my-10 border-white/[0.08]" />,
  a: A,
}
