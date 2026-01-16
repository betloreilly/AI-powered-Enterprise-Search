import { NextRequest, NextResponse } from 'next/server'
import { routeQuery, executeIntent } from '@/lib/intentRouter'

/**
 * Intelligent Search API
 * Uses OpenAI to understand user intent and route to appropriate search tool
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    console.log('[Intelligent Search] Query:', query)

    // Step 1: Determine intent
    const routingResult = await routeQuery(query)
    console.log('[Intelligent Search] Intent:', routingResult.intent, 'Confidence:', routingResult.confidence)
    console.log('[Intelligent Search] Extracted params:', routingResult.extractedParams)

    // Step 2: Execute appropriate action
    const result = await executeIntent(routingResult)

    // Step 3: Generate summary based on intent and results
    let summary = ''
    let queryInfo = null
    
    if (routingResult.intent === 'support') {
      // For support, use the semantic support answer (OpenSearch + OpenAI)
      summary = result.answer || 'No answer available'
      queryInfo = result.queryInfo
    } else if (routingResult.intent === 'text_search') {
      // For text search, summarize product results
      const productCount = result.products?.length || 0
      const total = result.total || 0
      summary = `Found ${productCount} products matching "${query}"${total > productCount ? ` (${total} total results)` : ''}`
      queryInfo = result.queryInfo
    } else if (routingResult.intent === 'generic_exploration') {
      // For generic exploration, provide context and suggestions
      const productCount = result.products?.length || 0
      const suggestions = routingResult.extractedParams.suggestedSearches || []
      const context = routingResult.extractedParams.explorationContext || ''
      const searchResults = result.searchResults || []
      
      // Create a more informative summary
      const searchSummary = searchResults
        .filter((sr: any) => sr.count > 0)
        .map((sr: any) => `${sr.query} (${sr.count} items)`)
        .join(', ')
      
      summary = `${context ? context + '. ' : ''}I found ${productCount} products using semantic search across: ${searchSummary || suggestions.slice(0, 3).join(', ')}`
      
      // Include search breakdown in queryInfo with semantic search details
      queryInfo = {
        explorationMode: true,
        searchType: 'semantic_vector_search',
        suggestions: suggestions,
        searchResults: searchResults,
        queryInfos: result.queryInfos || [],
        context: context,
        note: 'Using OpenAI text-embedding-ada-002 for semantic similarity'
      }
    } else if (routingResult.intent === 'visual_search') {
      // For visual search, summarize similar products
      const productCount = result.products?.length || 0
      summary = `Found ${productCount} visually similar products`
      queryInfo = result.queryInfo
    } else if (routingResult.intent === 'clarification') {
      // For clarification, use the message
      summary = routingResult.message
    }

    // Step 4: Format response based on intent
    return NextResponse.json({
      intent: routingResult.intent,
      confidence: routingResult.confidence,
      message: routingResult.message,
      summary, // Add summary for AnswerBox
      data: result,
      queryInfo, // Add query info for QueryViewer
      extractedParams: routingResult.extractedParams,
      reasoning: routingResult.reasoning // Add reasoning for QueryViewer
    })

  } catch (error: any) {
    console.error('[Intelligent Search] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process query' },
      { status: 500 }
    )
  }
}

// Made with Bob
