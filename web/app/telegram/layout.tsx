import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Telegram · Sherhood",
  description: "Join the Sherhood community on Telegram.",
}

export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  return children
}
