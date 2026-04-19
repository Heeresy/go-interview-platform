import dynamic from 'next/dynamic'
import { ReactNode } from 'react'

/**
 * Lazy loaded Monaco Editor component
 * Only loads when needed (on /tasks page) to save ~2MB bundle size
 */
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.Editor),
  {
    loading: () => (
      <div className="w-full h-96 bg-secondary rounded-lg flex items-center justify-center">
        <p className="text-muted">Loading editor...</p>
      </div>
    ),
    ssr: false, // Don't render on server
  }
)

export interface LazyMonacoEditorProps {
  value: string
  onChange?: (value: string | undefined) => void
  language?: string
  height?: string | number
  theme?: string
  options?: any
  readOnly?: boolean
  className?: string
}

/**
 * Wrapper component for lazy-loaded Monaco Editor
 * Respects code editor best practices and accessibility
 */
export function LazyMonacoEditor({
  value,
  onChange,
  language = 'javascript',
  height = '400px',
  theme = 'vs-dark',
  options = {},
  readOnly = false,
  className = '',
}: LazyMonacoEditorProps) {
  return (
    <div className={`monaco-editor-wrapper ${className}`}>
      <MonacoEditor
        height={height}
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={onChange}
        theme={theme}
        options={{
          minimap: { enabled: false },
          automaticLayout: true,
          readOnly,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          // Accessibility options
          bracketPairColorization: {
            enabled: true,
          },
          ...options,
        }}
      />
    </div>
  )
}

export default LazyMonacoEditor

