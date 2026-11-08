import { PageHeader } from './PageHeader'

export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-lg text-muted">{note}</div>
    </>
  )
}
