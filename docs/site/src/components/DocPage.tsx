import MarkdocRenderer from './MarkdocRenderer'

export default function DocPage({ content }: { content: string }) {
  return (
    <article className="max-w-4xl mx-auto px-6 py-10">
      <MarkdocRenderer content={content} />
    </article>
  )
}
