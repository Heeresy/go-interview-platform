'use client'

import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/atom-one-dark.css'

interface MarkdownContentProps {
    content: string
    className?: string
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
                components={{
                    pre: ({ children, ...props }) => (
                        <div className="markdown-pre-container">
                            <pre {...props} className="markdown-pre">
                                {children}
                            </pre>
                        </div>
                    ),
                    code: ({ className, children, ...props }) => {
                        const hasLang = /language-(\w+)/.exec(className || '')
                        return hasLang ? (
                            <code {...props} className="markdown-code-block">
                                {children}
                            </code>
                        ) : (
                            <code {...props} className="markdown-code-inline">
                                {children}
                            </code>
                        )
                    },
                    p: ({ children, ...props }) => <p {...props} className="mb-4 last:mb-0 leading-relaxed" style={{ marginBottom: '1rem' }}>{children}</p>,
                    ul: ({ children, ...props }) => <ul {...props} className="list-disc pl-6 mb-4 space-y-2" style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>{children}</ul>,
                    ol: ({ children, ...props }) => <ol {...props} className="list-decimal pl-6 mb-4 space-y-2" style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>{children}</ol>,
                    li: ({ children, ...props }) => <li {...props} className="pl-1" style={{ marginBottom: '0.25rem' }}>{children}</li>,
                    h1: ({ children, ...props }) => <h1 {...props} className="text-2xl font-bold mb-4 mt-8 first:mt-0" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', marginTop: '1.5rem' }}>{children}</h1>,
                    h2: ({ children, ...props }) => <h2 {...props} className="text-xl font-bold mb-3 mt-6 first:mt-0" style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.75rem', marginTop: '1.25rem' }}>{children}</h2>,
                    h3: ({ children, ...props }) => <h3 {...props} className="text-lg font-bold mb-2 mt-4 first:mt-0" style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', marginTop: '1rem' }}>{children}</h3>,
                }}
            >
                {content}
            </ReactMarkdown>

            <style jsx global>{`
        .markdown-pre-container {
          position: relative;
          margin: 1.5rem 0;
        }
        .markdown-pre {
          background: #0d1117 !important;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.25rem;
          overflow-x: auto;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
        }
        .markdown-code-block {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          line-height: 1.6;
          background: transparent !important;
          padding: 0 !important;
        }
        .markdown-code-inline {
          background: rgba(62, 207, 142, 0.1) !important;
          color: #3ecf8e !important;
          padding: 0.2rem 0.4rem !important;
          border-radius: 6px;
          font-family: var(--font-mono);
          font-size: 0.85em;
        }
        .markdown-content .hljs-keyword { color: #ff7b72; }
        .markdown-content .hljs-string { color: #a5d6ff; }
        .markdown-content .hljs-title { color: #d2a8ff; }
        .markdown-content .hljs-params { color: #ffa657; }
        .markdown-content .hljs-function { color: #d2a8ff; }
        .markdown-content .hljs-comment { color: #8b949e; font-style: italic; }
        .markdown-content .hljs-number { color: #79c0ff; }
        .markdown-content .hljs-type { color: #ff7b72; }
        .markdown-content .hljs-built_in { color: #ffa657; }
      `}</style>
        </div>
    )
}
