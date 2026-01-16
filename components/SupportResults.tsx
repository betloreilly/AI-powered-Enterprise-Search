'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookOpen, FileText, Loader2 } from 'lucide-react'

interface SupportDocument {
  id: string
  title: string
  content: string
  category?: string
  score?: number
}

export default function SupportResults() {
  const searchParams = useSearchParams()
  const [documents, setDocuments] = useState<SupportDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const query = searchParams.get('q')
    const supportMode = searchParams.get('supportMode') === 'true'

    if (supportMode && query) {
      fetchSupportDocs(query)
    } else {
      setLoading(false)
    }
  }, [searchParams])

  const fetchSupportDocs = async (query: string) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/support-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, size: 10 }),
      })

      if (!response.ok) {
        throw new Error('Failed to search support documents')
      }

      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (err: any) {
      console.error('Error fetching support docs:', err)
      setError(err.message || 'Failed to load support documents')
    } finally {
      setLoading(false)
    }
  }

  const supportMode = searchParams.get('supportMode') === 'true'

  // Hide this component - sources are now shown in AnswerBox
  return null

  if (!supportMode) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Searching documentation...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documentation Found</h3>
        <p className="text-gray-600">
          We couldn't find any documentation matching your query. Try rephrasing your question or contact our support team.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <BookOpen className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Support Documentation</h3>
            <p className="text-sm text-blue-700">
              Found {documents.length} relevant {documents.length === 1 ? 'article' : 'articles'} to help answer your question.
            </p>
          </div>
        </div>
      </div>

      {documents.map((doc, index) => (
        <div
          key={doc.id}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start mb-3">
            <FileText className="h-5 w-5 text-gray-400 mt-1 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {doc.title}
              </h3>
              {doc.category && (
                <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                  {doc.category}
                </span>
              )}
            </div>
            {doc.score && (
              <span className="text-sm text-gray-500">
                {Math.round(doc.score * 100)}% match
              </span>
            )}
          </div>
          <div className="prose prose-sm max-w-none text-gray-700">
            <p className="whitespace-pre-wrap">{doc.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Made with Bob
