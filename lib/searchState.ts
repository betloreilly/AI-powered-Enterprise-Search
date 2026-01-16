'use client'

/**
 * Central helpers for managing search-related state in sessionStorage.
 * This keeps AnswerBox, QueryViewer, SearchBar, ProductGrid and FilterSidebar
 * consistent so results and the OpenSearch query explanation always match.
 */

export type ClearMode = 'all' | 'search_only' | 'filters_only'

export function clearSearchState(mode: ClearMode = 'all') {
  if (typeof window === 'undefined') return

  const clearSearchKeys = () => {
    sessionStorage.removeItem('intentReasoning')
    sessionStorage.removeItem('intentType')
    sessionStorage.removeItem('opensearchQuery')
    sessionStorage.removeItem('intelligentSearchAnswer')
    sessionStorage.removeItem('currentSearch')
    sessionStorage.removeItem('searchMode')
    sessionStorage.removeItem('explorationSearchResults')
    sessionStorage.removeItem('visualSearchResults')
  }

  const clearFilterKeys = () => {
    sessionStorage.removeItem('activeFilters')
  }

  switch (mode) {
    case 'all':
      clearSearchKeys()
      clearFilterKeys()
      break
    case 'search_only':
      clearSearchKeys()
      break
    case 'filters_only':
      clearFilterKeys()
      break
  }

  // Let listeners update their UI
  window.dispatchEvent(new Event('queryUpdated'))
  window.dispatchEvent(new CustomEvent('filtersChanged', { detail: {} }))
}

/**
 * Returns true when the current navigation was a full page reload.
 */
export function isReloadNavigation(): boolean {
  if (typeof performance === 'undefined' || !('getEntriesByType' in performance)) return false
  const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  const nav = navEntries && navEntries[0]
  return !!nav && nav.type === 'reload'
}

