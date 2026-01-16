'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Code, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { clearSearchState, isReloadNavigation } from '@/lib/searchState'

export default function QueryViewer() {
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [reasoning, setReasoning] = useState<string | null>(null)
  const [intentType, setIntentType] = useState<string>('text_search')

  useEffect(() => {
    const updateQuery = () => {
      const queryData = sessionStorage.getItem('opensearchQuery')
      if (queryData) {
        try {
          const parsed = JSON.parse(queryData)
          setQuery(parsed)
          console.log('[QueryViewer] Updated query:', parsed.index, parsed.timestamp)
        } catch (e) {
          console.error('Failed to parse query data:', e)
        }
      } else {
        setQuery(null)
      }
      
      // Also check for reasoning and intent from intelligent search
      const reasoningData = sessionStorage.getItem('intentReasoning')
      const intentData = sessionStorage.getItem('intentType')
      
      console.log('[QueryViewer] Checking sessionStorage - reasoning:', reasoningData, 'intent:', intentData)
      
      if (intentData) {
        setIntentType(intentData)
      }
      
      if (reasoningData) {
        setReasoning(reasoningData)
        console.log('[QueryViewer] Updated reasoning from sessionStorage:', reasoningData)
      } else if (queryData) {
        // Set default reasoning based on intent type
        const intent = intentData || 'text_search'
        let defaultReasoning = ''
        
        switch (intent) {
          case 'text_search':
            // Default message when we're in basic keyword / filter mode
            // and no richer reasoning has been provided.
            defaultReasoning = 'On keyword search mode.'
            break
          case 'visual_search':
            defaultReasoning = "The user wants to find visually similar products. Visual search analyzes the uploaded image with an AI vision model and compares it to stored product images, focusing on visual characteristics like color, shape, style, and overall composition to surface close matches."
            break
          case 'support':
            defaultReasoning = "The user has a question about store policies, shipping, returns, or account help. Support search uses semantic search over the knowledge base to find relevant documentation and provide accurate answers to customer service questions."
            break
          case 'generic_exploration':
            defaultReasoning = "The user has a general need or lifestyle question. The system generates multiple specific product searches using AI to suggest relevant items that match the user's broader intent."
            break
          default:
            defaultReasoning = "Analyzing the query to determine the best search method for finding relevant results."
        }
        
        setReasoning(defaultReasoning)
        console.log('[QueryViewer] Using default reasoning for intent:', intent)
      } else {
        setReasoning(null)
      }
    }

    // On full page reload, clear any stale search state so we don't
    // show old queries or explanations when the user lands fresh on "/"
    if (isReloadNavigation()) {
      clearSearchState('search_only')
      setQuery(null)
      setReasoning(null)
    }

    // Update on mount and when searchParams change
    updateQuery()

    // Also listen for storage events (in case of updates from other tabs)
    window.addEventListener('storage', updateQuery)
    
    // Listen for custom event when query is updated
    window.addEventListener('queryUpdated', updateQuery)

    return () => {
      window.removeEventListener('storage', updateQuery)
      window.removeEventListener('queryUpdated', updateQuery)
    }
  }, [searchParams])

  const handleCopy = () => {
    if (query) {
      navigator.clipboard.writeText(JSON.stringify(query, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!query) {
    return null
  }

  // If this is a semantic exploration response from intelligent search,
  // surface the FULL underlying OpenSearch queries that were actually run
  // (one per suggested semantic query) instead of just the high-level wrapper.
  const isExploration = query.explorationMode && Array.isArray(query.queryInfos)
  const explorationQueries = isExploration
    ? query.queryInfos.map((q: any) => ({
        label: q.query,
        index: q.queryInfo?.index,
        size: q.queryInfo?.size,
        from: q.queryInfo?.from,
        sort: q.queryInfo?.sort,
        query: q.queryInfo?.query,
        timestamp: q.queryInfo?.timestamp,
      }))
    : null

  return (
    <div className="fixed right-4 top-24 z-40 w-96 max-h-[calc(100vh-120px)] bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200"
      >
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5 text-gray-600" />
          <span className="font-semibold text-gray-900">OpenSearch Query</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-gray-600" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-600" />
        )}
      </button>

      {/* Intent Reasoning - Always visible under header */}
      {reasoning && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-900 mb-1">
                Why {intentType.replace('_', ' ')}?
              </p>
              <p className="text-xs text-blue-800 leading-relaxed">{reasoning}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isOpen && (
        <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Query Structure
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
            <code>
              {JSON.stringify(
                explorationQueries || query,
                null,
                2
              )}
            </code>
          </pre>

          {/* Query Info */}
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-200">
              <span className="text-gray-600">Index:</span>
              <span className="font-mono text-gray-900">{query.index || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200">
              <span className="text-gray-600">Query Type:</span>
              <span className="font-mono text-gray-900">
                {isExploration
                  ? `Semantic exploration (${query.queryInfos?.length || 0} sub-queries)`
                  : query.query?.bool
                  ? 'Boolean'
                  : query.query?.knn
                  ? 'KNN'
                  : query.query?.multi_match
                  ? 'Multi-Match'
                  : 'Other'}
              </span>
            </div>
            {query.size && (
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600">Size:</span>
                <span className="font-mono text-gray-900">{query.size}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Made with Bob
