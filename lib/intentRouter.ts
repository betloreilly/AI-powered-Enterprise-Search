/**
 * Intent-based query router using OpenAI
 * Routes user queries to appropriate tools: text search, visual search, or support
 */

import { OpenAI } from 'openai'

export type IntentType = 'text_search' | 'visual_search' | 'support' | 'clarification' | 'generic_exploration'

export interface RouterResult {
  intent: IntentType
  confidence: number
  extractedParams: {
    query?: string
    category?: string
    brand?: string
    priceRange?: string
    imageDescription?: string
    supportQuestion?: string
    suggestedSearches?: string[]
    explorationContext?: string
  }
  message: string
  reasoning?: string
}

const SYSTEM_PROMPT = `You are an intelligent intent classifier for an e-commerce platform. Analyze the user's query and determine their intent.

Intents:
1. text_search - User wants to find SPECIFIC products by name, category, brand, price, or features
   Examples: "wireless headphones", "laptops under $1000", "Nike shoes", "red dresses"
   
2. visual_search - User wants to find visually similar products or mentions uploading/showing an image
   Examples: "find products like this", "similar items", "I have a picture", "upload image"
   
3. support - User has questions about POLICIES, SHIPPING, RETURNS, ORDER TRACKING, or ACCOUNT HELP
   Examples: "how do I return?", "shipping policy", "track my order", "reset password", "payment methods"
   Key: These are about the STORE'S operations, not product recommendations
   
4. generic_exploration - User has a GENERIC need, lifestyle question, or wants RECOMMENDATIONS
   Examples: "I want to start a hobby", "what should I buy for camping?", "gift ideas for mom",
            "I'm bored, what can I do?", "need something for fitness", "looking for home improvement ideas"
   Key: User doesn't know exactly what they want - needs AI to suggest relevant product searches
   
5. clarification - Query is too vague or just a greeting
   Examples: "hi", "hello", "what can you do?"

CRITICAL DISTINCTION:
- support = Questions about store operations (returns, shipping, policies, account)
- generic_exploration = Lifestyle questions, recommendations, "what should I buy for X?" scenarios

For generic_exploration intent, you MUST generate 3-5 BROAD, SEMANTIC product search queries.
Use descriptive terms that match product descriptions, not just category names.
Examples: Instead of "sofa sets", use "comfortable living room seating furniture"
Instead of "dining tables", use "elegant dining room table for family meals"

Respond ONLY with valid JSON in this exact format:
{
  "intent": "text_search|visual_search|support|clarification|generic_exploration",
  "confidence": 0.0-1.0,
  "extractedParams": {
    "query": "extracted search query (for text_search)",
    "category": "extracted category if mentioned",
    "brand": "extracted brand if mentioned",
    "priceRange": "extracted price range if mentioned",
    "imageDescription": "what user wants to find visually",
    "supportQuestion": "the support question",
    "suggestedSearches": ["search1", "search2", "search3"],
    "explorationContext": "brief context about what user is looking for"
  },
  "reasoning": "brief explanation"
}`

/**
 * Route user query to appropriate intent
 */
export async function routeQuery(userQuery: string): Promise<RouterResult> {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const openai = new OpenAI({ apiKey })

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userQuery }
      ],
      temperature: 0,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(content)
    
    // Generate appropriate message based on intent
    let message = ''
    switch (parsed.intent) {
      case 'text_search':
        message = `Searching for products...`
        break
      case 'visual_search':
        message = `To search visually, please upload an image using the upload button.`
        break
      case 'support':
        message = `Let me find that information for you...`
        break
      case 'generic_exploration':
        message = `I understand you're looking for ideas! Let me search for some relevant products...`
        break
      case 'clarification':
        message = `I can help you with:
• Finding products (e.g., "wireless headphones")
• Visual search (upload an image to find similar items)
• Support questions (e.g., "how do I return a product?")
• Product recommendations (e.g., "what should I buy for camping?")

What would you like to do?`
        break
    }

    return {
      intent: parsed.intent as IntentType,
      confidence: parsed.confidence || 0.8,
      extractedParams: parsed.extractedParams || {},
      message,
      reasoning: parsed.reasoning
    }
  } catch (error) {
    console.error('Error routing query:', error)
    
    // Fallback: simple keyword matching
    const lowerQuery = userQuery.toLowerCase()
    
    if (lowerQuery.includes('image') || lowerQuery.includes('picture') || lowerQuery.includes('similar') || lowerQuery.includes('like this')) {
      return {
        intent: 'visual_search',
        confidence: 0.6,
        extractedParams: { imageDescription: userQuery },
        message: 'To search visually, please upload an image using the upload button.'
      }
    }
    
    if (lowerQuery.includes('help') || lowerQuery.includes('return') || lowerQuery.includes('shipping') || lowerQuery.includes('policy') || lowerQuery.includes('how')) {
      return {
        intent: 'support',
        confidence: 0.6,
        extractedParams: { supportQuestion: userQuery },
        message: 'Let me find that information for you...'
      }
    }
    
    if (userQuery.trim().length < 3) {
      return {
        intent: 'clarification',
        confidence: 0.9,
        extractedParams: {},
        message: 'How can I help you today? You can search for products, upload an image for visual search, or ask support questions.'
      }
    }
    
    // Default to text search
    return {
      intent: 'text_search',
      confidence: 0.5,
      extractedParams: { query: userQuery },
      message: 'Searching for products...'
    }
  }
}

/**
 * Execute the appropriate action based on intent
 */
export async function executeIntent(result: RouterResult): Promise<any> {
  const { intent, extractedParams } = result

  switch (intent) {
    case 'text_search': {
      const { performProductSearch } = await import('@/lib/productSearch')
      const filters = {
        query: extractedParams.query,
        category: extractedParams.category,
        brand: extractedParams.brand,
        price: extractedParams.priceRange,
      }
      console.log('[Intent Router] Text search with query:', extractedParams.query)
      const searchResult = await performProductSearch(filters, 0, 24)
      console.log('[Intent Router] Text search found:', searchResult.products.length, 'products')
      return searchResult
    }

    case 'generic_exploration': {
      // For generic queries, perform multiple semantic searches and combine results
      const { performProductSearch } = await import('@/lib/productSearch')
      const suggestedSearches = extractedParams.suggestedSearches || []
      
      console.log('[Intent Router] Generic exploration with suggestions:', suggestedSearches)
      
      if (suggestedSearches.length === 0) {
        // Fallback if no suggestions were generated
        return {
          type: 'exploration_results',
          products: [],
          message: 'I need more specific information to help you find products. Could you tell me more about what you\'re looking for?',
          suggestions: [],
          searchResults: [],
          context: extractedParams.explorationContext
        }
      }

      // Perform semantic search for each suggestion and combine results
      const allProducts: any[] = []
      const searchResults: any[] = []
      const queryInfos: any[] = []

      for (const searchQuery of suggestedSearches.slice(0, 3)) {
        try {
          console.log(`[Intent Router] Searching for: "${searchQuery}"`)
          const searchResult = await performProductSearch({ query: searchQuery }, 0, 24) // Get more candidates
          
          console.log(`[Intent Router] Found ${searchResult.products.length} products for "${searchQuery}"`)
          if (searchResult.products.length > 0) {
            console.log(`[Intent Router] Sample products:`, searchResult.products.slice(0, 3).map(p => p.title))
          }
          
          searchResults.push({
            query: searchQuery,
            count: searchResult.products.length,
            total: searchResult.total
          })
          
          if (searchResult.queryInfo) {
            queryInfos.push({
              query: searchQuery,
              queryInfo: searchResult.queryInfo
            })
          }
          
          // Add products with their search query context for better ranking
          allProducts.push(...searchResult.products.map((p: any) => ({
            ...p,
            _searchQuery: searchQuery, // Track which query found this product
            _searchScore: p._score || 0 // Preserve relevance score if available
          })))
        } catch (error) {
          console.error(`[Intent Router] Error searching for "${searchQuery}":`, error)
          searchResults.push({
            query: searchQuery,
            count: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Remove duplicates based on product ID, keeping the one with highest score
      const productMap = new Map<string, any>()
      for (const product of allProducts) {
        const existing = productMap.get(product.id)
        if (!existing || (product._searchScore || 0) > (existing._searchScore || 0)) {
          productMap.set(product.id, product)
        }
      }
      const uniqueProducts = Array.from(productMap.values())

      // Sort by relevance score (highest first)
      uniqueProducts.sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0))

      console.log(`[Intent Router] Total unique products: ${uniqueProducts.length}`)
      if (uniqueProducts.length > 0) {
        console.log(`[Intent Router] Top products:`, uniqueProducts.slice(0, 5).map(p => `${p.title} (score: ${p._searchScore || 'N/A'})`))
      }

      return {
        type: 'exploration_results',
        products: uniqueProducts.slice(0, 24), // Limit to 24 products
        total: uniqueProducts.length,
        message: result.message,
        suggestions: suggestedSearches,
        searchResults,
        queryInfos, // Include query info for debugging
        context: extractedParams.explorationContext
      }
    }

    case 'visual_search': {
      return {
        type: 'visual_search_prompt',
        message: result.message,
        description: extractedParams.imageDescription
      }
    }

    case 'support': {
      const question = extractedParams.supportQuestion || extractedParams.query || ''
      
      try {
        // Use semantic search with OpenSearch + OpenAI
        const { querySemanticSupport } = await import('@/lib/semanticSupport')
        const result = await querySemanticSupport(question)
        
        // Convert sources to strings for UI
        const sourcesForUI = result.sources.map((chunk, idx) =>
          `Source ${idx + 1}: ${chunk.title} (${Math.round(chunk.score * 100)}% match)`
        )
        
        return {
          type: 'support_answer',
          answer: result.answer,
          sources: sourcesForUI,
          sourceDocuments: result.sources, // Pass full documents for expandable view
          queryInfo: result.queryInfo
        }
      } catch (error) {
        console.error('[Intent Router] Semantic support error:', error)
        
        return {
          type: 'support_answer',
          answer: 'I encountered an error while searching for that information. Please try again or contact our support team.',
          sources: [],
          sourceDocuments: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    case 'clarification': {
      return {
        type: 'clarification',
        message: result.message
      }
    }

    default:
      throw new Error(`Unknown intent: ${intent}`)
  }
}

// Made with Bob
