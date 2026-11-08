import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-lg text-muted">{subtitle}</p>}
    </header>
  )
}
