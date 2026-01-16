'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Star, ShoppingCart, Heart, Share2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ProductDetailPage() {
  const params = useParams()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    // Fetch product details
    // For now, using mock data
    const mockProduct = {
      id: params.id,
      title: 'Classic Summer Dress',
      description: 'Elegant and comfortable summer dress perfect for any occasion. Made from premium quality fabric that feels soft against your skin. Features a flattering A-line silhouette with a beautiful floral pattern.',
      price: 89.99,
      originalPrice: 119.99,
      images: [
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&h=800&fit=crop',
      ],
      category: 'Clothing',
      brand: 'LEXORA',
      rating: 4.5,
      reviews: 128,
      inStock: true,
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Blue', 'Pink', 'White', 'Black'],
    }
    
    setTimeout(() => {
      setProduct(mockProduct)
      setLoading(false)
    }, 500)
  }, [params.id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">Product not found</p>
        <Link href="/" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 mb-6 font-medium transition-colors group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to products
        </Link>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div>
          <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl overflow-hidden mb-4 shadow-soft border border-white/20">
            <Image
              src={product.images[selectedImage]}
              alt={product.title}
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {product.images.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  selectedImage === idx 
                    ? 'border-indigo-600 shadow-lg scale-105' 
                    : 'border-transparent hover:border-slate-300'
                }`}
              >
                <Image src={img} alt={`${product.title} ${idx + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <div className="mb-6">
            <p className="text-xs font-medium text-indigo-600 mb-2 uppercase tracking-wide">{product.brand}</p>
            <h1 className="text-3xl font-display font-bold text-slate-900 mb-4">{product.title}</h1>
            
            <div className="flex items-center gap-3 mb-4">
              {product.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-slate-700">{product.rating}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-display font-bold text-slate-900">${product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <span className="text-xl text-slate-400 line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
              {product.originalPrice && (
                <span className="bg-red-100 text-red-600 px-2.5 py-1 rounded-lg text-xs font-semibold">
                  {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-b border-slate-200 py-6 space-y-5">
            <div>
              <label className="block text-xs font-display font-semibold text-slate-900 mb-3 uppercase tracking-wide">Size</label>
              <div className="flex gap-2">
                {product.sizes.map((size: string) => (
                  <button
                    key={size}
                    className="px-4 py-2.5 border-2 border-slate-200 rounded-xl hover:border-indigo-600 hover:text-indigo-600 transition font-medium"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-display font-semibold text-slate-900 mb-3 uppercase tracking-wide">Color</label>
              <div className="flex gap-2">
                {product.colors.map((color: string) => (
                  <button
                    key={color}
                    className="px-4 py-2.5 border-2 border-slate-200 rounded-xl hover:border-indigo-600 transition font-medium"
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Add to Cart
            </button>
            <div className="flex gap-3">
              <button className="flex-1 border-2 border-gray-200 py-3 rounded-lg font-medium hover:border-primary-600 hover:text-primary-600 transition flex items-center justify-center gap-2">
                <Heart className="w-5 h-5" />
                Wishlist
              </button>
              <button className="flex-1 border-2 border-gray-200 py-3 rounded-lg font-medium hover:border-primary-600 hover:text-primary-600 transition flex items-center justify-center gap-2">
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-display font-semibold text-slate-900 mb-3 uppercase tracking-wide">Description</h2>
            <p className="text-slate-600 leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
