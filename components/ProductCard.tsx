'use client'

import Image from 'next/image'
import { Star, ShoppingCart } from 'lucide-react'

interface Product {
  id: string
  title: string
  description: string
  price: number
  image: string
  category: string
  brand: string
  rating?: number
}

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
      <div className="group relative bg-white rounded-2xl border border-gray-200/60 overflow-hidden hover:border-indigo-300/80 hover:shadow-2xl hover:shadow-indigo-100/40 transition-all duration-500 hover:-translate-y-2 cursor-default">
        <div className="relative aspect-square bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 overflow-hidden">
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-4 right-4 bg-white/98 backdrop-blur-md rounded-full p-2.5 opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-xl hover:scale-110 hover:bg-indigo-50 border border-gray-100">
            <ShoppingCart className="w-4.5 h-4.5 text-indigo-600 group-hover:text-indigo-700" />
          </div>
          {product.rating && product.rating >= 4.9 && (
            <div className="absolute top-4 left-4 bg-amber-400/95 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md">
              ⭐ Top Rated
            </div>
          )}
        </div>
        
        <div className="p-5 bg-white">
          <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors text-sm mb-2 leading-tight">
            {product.title}
          </h3>
          <p className="text-xs text-gray-500 font-medium mb-4 uppercase tracking-wider">{product.brand}</p>
          
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xl font-bold text-gray-900 tracking-tight mb-1">
                ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {product.rating && (
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-semibold text-gray-700">{product.rating}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  )
}
