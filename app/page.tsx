import ProductGrid from '@/components/ProductGrid'
import SearchBar from '@/components/SearchBar'
import FilterSidebar from '@/components/FilterSidebar'
import TrendingProducts from '@/components/TrendingProducts'
import SupportResults from '@/components/SupportResults'
import AnswerBox from '@/components/AnswerBox'
import QueryViewer from '@/components/QueryViewer'
import { Suspense } from 'react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
      <div className="container mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
            Discover Products
          </h1>
          <p className="text-gray-600 mb-8 text-base">Explore our curated collection of quality products</p>
          <Suspense fallback={<div className="h-14 bg-gray-100 rounded-xl animate-pulse"></div>}>
            <SearchBar />
          </Suspense>
          <Suspense fallback={null}>
            <AnswerBox />
          </Suspense>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 flex-shrink-0">
            <FilterSidebar />
          </aside>
          
          <div className="flex-1 min-w-0">
            <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
              <SupportResults />
              <TrendingProducts />
              <ProductGrid />
            </Suspense>
          </div>
        </div>
      </div>
      <Suspense fallback={null}>
        <QueryViewer />
      </Suspense>
    </div>
  )
}
