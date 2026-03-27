import React from 'react'
import Markdoc, { type RenderableTreeNode } from '@markdoc/markdoc'

function Callout({
  type = 'info',
  title,
  children,
}: {
  type?: 'info' | 'warning' | 'danger' | 'success'
  title?: string
  children: React.ReactNode
}) {
  const icons = { info: 'ℹ️', warning: '⚠️', danger: '🚨', success: '✅' }
  return (
    <div className={`callout callout-${type}`}>
      {title && (
        <div className="callout-title">
          {icons[type]} {title}
        </div>
      )}
      <div>{children}</div>
    </div>
  )
}

const config: Parameters<typeof Markdoc.transform>[1] = {
  tags: {
    callout: {
      render: 'Callout',
      attributes: {
        type: { type: String, default: 'info' },
        title: { type: String },
      },
    },
  },
  nodes: {
    fence: {
      render: 'Fence',
      attributes: {
        language: { type: String },
        content: { type: String },
      },
    },
  },
}

function Fence({ language, content }: { language?: string; content: string }) {
  return (
    <pre className="bg-gray-900 border border-gray-700 rounded-lg overflow-x-auto mb-6">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700 bg-gray-800/60">
        <span className="text-xs text-gray-400 font-mono">{language ?? 'text'}</span>
      </div>
      <code className="block p-4 text-sm text-gray-200 font-mono leading-relaxed">
        {content}
      </code>
    </pre>
  )
}

const components: Record<string, React.ComponentType<any>> = {
  Callout,
  Fence,
}

export default function MarkdocRenderer({ content }: { content: string }) {
  const ast = Markdoc.parse(content)
  const tree = Markdoc.transform(ast, config)
  return (
    <div className="markdoc-content">
      {Markdoc.renderers.react(tree as RenderableTreeNode, React, { components })}
    </div>
  )
}
