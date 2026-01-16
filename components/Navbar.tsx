'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ShoppingBag, User, LogOut, Search, Menu, X } from 'lucide-react'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
              <ShoppingBag className="relative w-8 h-8 text-white p-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl" />
            </div>
            <span className="text-xl font-semibold text-gray-900">LEXORA</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-700 hover:text-indigo-600 transition-colors text-sm font-medium">
              Home
            </Link>
            <Link href="/support" className="text-gray-700 hover:text-indigo-600 transition-colors text-sm font-medium">
              Support
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2 text-gray-700">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{user.name || user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
              >
                <User className="w-5 h-5" />
                <span>Login</span>
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <Link href="/" className="block py-2 text-gray-700 hover:text-indigo-600">
              Home
            </Link>
            <Link href="/support" className="block py-2 text-gray-700 hover:text-indigo-600">
              Support
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
