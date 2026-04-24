'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownViewerProps {
  content: string
  className?: string
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h3: ({ node: _node, ...props }) => (
            <h3 className="mt-4 text-sm font-semibold" {...props} />
          ),
          p: ({ node: _node, ...props }) => (
            <p className="leading-6 text-sm" {...props} />
          ),
          ul: ({ node: _node, ...props }) => (
            <ul className="my-2 list-disc pl-5 text-sm" {...props} />
          ),
          ol: ({ node: _node, ...props }) => (
            <ol className="my-2 list-decimal pl-5 text-sm" {...props} />
          ),
          li: ({ node: _node, ...props }) => <li className="my-1" {...props} />,
          strong: ({ node: _node, ...props }) => (
            <strong className="font-semibold" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
