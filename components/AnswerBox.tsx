'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Sparkles, BookOpen, X, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { clearSearchState, isReloadNavigation } from '@/lib/searchState'

interface AnswerBoxProps {
  onClose?: () => void
}

interface SourceDocument {
  id: string
  title: string
  content: string
  score: number
}

export default function AnswerBox({ onClose }: AnswerBoxProps) {
  const searchParams = useSearchParams()
  const [answer, setAnswer] = useState<string>('')
  const [sources, setSources] = useState<string[]>([])
  const [sourceDocuments, setSourceDocuments] = useState<SourceDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [intent, setIntent] = useState<string>('')
  const [showSources, setShowSources] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [explorationContext, setExplorationContext] = useState<string>('')

  const updateAnswer = () => {
    const answerData = sessionStorage.getItem('intelligentSearchAnswer')

    if (answerData) {
      try {
        const parsed = JSON.parse(answerData)
        setAnswer(parsed.answer || '')
        setSources(parsed.sources || [])
        setSourceDocuments(parsed.sourceDocuments || [])
        setIntent(parsed.intent || '')
        setSuggestions(parsed.suggestions || [])
        setExplorationContext(parsed.explorationContext || '')
        setVisible(true)
        setShowSources(false) // Reset on new search
      } catch (e) {
        console.error('Failed to parse answer data:', e)
      }
    } else {
      setVisible(false)
    }
  }

  useEffect(() => {
    // On full page reload, clear any stale search/exploration state so we don't
    // show old answers when the user lands fresh on "/"
    if (isReloadNavigation()) {
      clearSearchState('search_only')
      setVisible(false)
    }

    // Initial load
    updateAnswer()

    // Listen for storage events (when sessionStorage is updated from other components)
    const handleStorageChange = () => {
      updateAnswer()
    }

    // Listen for custom event when answer is updated
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('answerUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('answerUpdated', handleStorageChange)
    }
  }, [searchParams])

  const handleClose = () => {
    setVisible(false)
    sessionStorage.removeItem('intelligentSearchAnswer')
    if (onClose) onClose()
  }

  if (!visible || !answer) {
    return null
  }

  return (
    <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {intent === 'support' ? (
            <BookOpen className="h-5 w-5 text-blue-600 flex-shrink-0" />
          ) : intent === 'generic_exploration' ? (
            <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0" />
          ) : (
            <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0" />
          )}
          <h3 className="font-semibold text-blue-900">
            {intent === 'support'
              ? 'Support Answer'
              : intent === 'generic_exploration'
              ? 'Product Recommendations'
              : 'Quick Summary'}
          </h3>
        </div>
        <button
          onClick={handleClose}
          className="text-blue-400 hover:text-blue-600 transition-colors"
          aria-label="Close answer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="prose prose-sm max-w-none text-gray-800">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({...props}) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full divide-y divide-gray-300 border border-gray-300" {...props} />
              </div>
            ),
            th: ({...props}) => (
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 bg-gray-50 border-b border-gray-300" {...props} />
            ),
            td: ({...props}) => (
              <td className="px-3 py-2 text-sm text-gray-700 border-b border-gray-200" {...props} />
            ),
            strong: ({...props}) => (
              <strong className="font-semibold text-gray-900" {...props} />
            ),
            ul: ({...props}) => (
              <ul className="list-disc list-inside space-y-1 my-2" {...props} />
            ),
            ol: ({...props}) => (
              <ol className="list-decimal list-inside space-y-1 my-2" {...props} />
            ),
            li: ({...props}) => (
              <li className="text-gray-800" {...props} />
            ),
            p: ({...props}) => (
              <p className="mb-2 leading-relaxed" {...props} />
            ),
          }}
        >
          {answer}
        </ReactMarkdown>
      </div>

      {/* Show suggestions for generic exploration */}
      {intent === 'generic_exploration' && suggestions && suggestions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-purple-200">
          <p className="text-sm font-medium text-purple-900 mb-2">
            Search categories used:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      )}

      {sources && sources.length > 0 && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center justify-between w-full text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
          >
            <span>View Source Documents ({sources.length})</span>
            <span className="text-blue-500">
              {showSources ? '▼' : '▶'}
            </span>
          </button>
          
          {showSources && sourceDocuments && sourceDocuments.length > 0 && (
            <div className="mt-3 space-y-3">
              {sourceDocuments.map((doc, index) => (
                <div key={doc.id} className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Source {index + 1}: {doc.title}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {Math.round(doc.score * 100)}% match
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-3">
                    {doc.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Made with Bob
