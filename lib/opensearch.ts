export interface Product {
  id: string
  title: string
  description: string
  price: number
  image: string
  category: string
  brand: string
  rating?: number
  availability?: string
}

export interface ProductFilters {
  category?: string
  price?: string
  brand?: string
  rating?: string
  availability?: string
  query?: string
}

export interface SupportDocument {
  id: string
  title: string
  content?: string
  text?: string
  page_content?: string
  category?: string
  doc_type?: string
}

export async function searchProducts(filters: ProductFilters, from: number = 0, size: number = 24): Promise<{ products: Product[], total: number, queryInfo?: any }> {
  try {
    // Determine if we're on server or client
    const baseUrl = typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      : ''
    
    const response = await fetch(`${baseUrl}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filters, from, size }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }))
      const errorMessage = error.error || 'Failed to search products'
      
      // Preserve connection errors for fallback logic
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch') || errorMessage.includes('connection')) {
        throw new Error(`Connection error: ${errorMessage}`)
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Error searching products:', error)
    // Re-throw to let caller handle (connection errors vs query errors)
    throw error
  }
}

export async function searchSupport(query: string, from: number = 0, size: number = 5): Promise<{ documents: SupportDocument[], total: number }> {
  try {
    const response = await fetch('/api/support-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, from, size }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }))
      throw new Error(error.error || 'Failed to search support documents')
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Error searching support:', error)
    throw error
  }
}
