'use client'

import { useState } from 'react'
import { HelpCircle, Mail, Phone, MessageCircle, ChevronDown, ChevronUp, Search } from 'lucide-react'

const FAQ_CATEGORIES = [
  {
    title: 'Orders & Shipping',
    faqs: [
      {
        q: 'How do I track my order?',
        a: 'You can track your order by logging into your account and visiting the "My Orders" section. You\'ll receive a tracking number via email once your order ships.',
      },
      {
        q: 'What are your shipping options?',
        a: 'We offer standard shipping (5-7 business days), express shipping (2-3 business days), and overnight shipping (next business day). Shipping costs vary by option and location.',
      },
      {
        q: 'Can I change or cancel my order?',
        a: 'You can modify or cancel your order within 2 hours of placing it. After that, contact our support team immediately for assistance.',
      },
    ],
  },
  {
    title: 'Returns & Refunds',
    faqs: [
      {
        q: 'What is your return policy?',
        a: 'We offer a 30-day return policy on most items. Products must be unused, in original packaging, and with tags attached. Some items like electronics may have different return windows.',
      },
      {
        q: 'How do I return an item?',
        a: 'Log into your account, go to "My Orders", select the item you want to return, and follow the return process. You\'ll receive a prepaid return label via email.',
      },
      {
        q: 'When will I receive my refund?',
        a: 'Refunds are processed within 5-7 business days after we receive your returned item. The refund will appear in your original payment method within 1-2 business days after processing.',
      },
    ],
  },
  {
    title: 'FlexCard',
    faqs: [
      {
        q: 'What is FlexCard?',
        a: 'FlexCard is LEXORA\'s digital gift card and store credit system. It can be used for purchases across most product categories.',
      },
      {
        q: 'How do I check my FlexCard balance?',
        a: 'You can check your FlexCard balance in your account dashboard or at checkout. The balance is displayed in real-time.',
      },
      {
        q: 'Does my FlexCard expire?',
        a: 'Yes, FlexCards expire after 12 months from issuance. Promotional FlexCards may have shorter expiration periods. Check your account dashboard for specific expiration dates.',
      },
      {
        q: 'Can I use FlexCard with other payment methods?',
        a: 'Yes, FlexCard can be combined with credit cards, debit cards, or other accepted payment methods for partial payments.',
      },
    ],
  },
  {
    title: 'Care+ Protection',
    faqs: [
      {
        q: 'What is Care+?',
        a: 'Care+ is an extended warranty and protection plan that covers your products beyond the manufacturer warranty, including accidental damage protection.',
      },
      {
        q: 'How do I file a Care+ claim?',
        a: 'Contact LEXORA support and provide proof of purchase and issue description. Claim processing typically takes 3-5 business days.',
      },
      {
        q: 'What does Care+ cover?',
        a: 'Care+ includes extended warranty coverage, accidental damage protection (drops, spills), mechanical and electrical failure coverage, and priority customer support.',
      },
    ],
  },
  {
    title: 'SmartReturn',
    faqs: [
      {
        q: 'What is SmartReturn?',
        a: 'SmartReturn is LEXORA\'s hassle-free return program that allows eligible customers to return items within 30 days with free return shipping.',
      },
      {
        q: 'Which products are eligible for SmartReturn?',
        a: 'Most new products are eligible. Some items like electronics, personalized products, or final sale items may have restrictions. Check product details for eligibility.',
      },
      {
        q: 'How do I use SmartReturn?',
        a: 'During checkout, eligible items will show the SmartReturn badge. Simply initiate a return through your account, and we\'ll provide a prepaid return label.',
      },
    ],
  },
  {
    title: 'Account & Payment',
    faqs: [
      {
        q: 'How do I update my account information?',
        a: 'Log into your account, go to "Account Settings", and update your personal information, shipping addresses, or payment methods.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit cards (Visa, Mastercard, American Express), debit cards, PayPal, Apple Pay, Google Pay, and FlexCard.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'Yes, we use industry-standard encryption and never store your full payment details. All transactions are processed through secure payment gateways.',
      },
    ],
  },
]

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFAQs = FAQ_CATEGORIES.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq => 
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.faqs.length > 0)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Support Center</h1>
            <p className="text-gray-600">Find answers to common questions or contact us</p>
          </div>

          {/* Search */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FAQs..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* FAQ Sections */}
          <div className="space-y-4 mb-12">
            {filteredFAQs.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">{category.title}</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {category.faqs.map((faq, faqIndex) => {
                    const globalIndex = categoryIndex * 100 + faqIndex
                    const isOpen = openFaq === globalIndex
                    return (
                      <div key={faqIndex}>
                        <button
                          onClick={() => toggleFaq(globalIndex)}
                          className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition"
                        >
                          <span className="font-medium text-gray-900 pr-4">{faq.q}</span>
                          {isOpen ? (
                            <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 text-gray-600">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Contact Us</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-4">
                <div className="bg-indigo-100 rounded-lg p-3">
                  <Mail className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                  <p className="text-sm text-gray-600 mb-2">support@lexora.com</p>
                  <p className="text-xs text-gray-500">Response within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-indigo-100 rounded-lg p-3">
                  <Phone className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                  <p className="text-sm text-gray-600 mb-2">1-800-LEXORA-1</p>
                  <p className="text-xs text-gray-500">Mon-Fri, 9am-6pm EST</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-indigo-100 rounded-lg p-3">
                  <MessageCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Live Chat</h3>
                  <p className="text-sm text-gray-600 mb-2">Available 24/7</p>
                  <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                    Start Chat →
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Still need help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Our support team is here to help. Reach out through any of the methods above, or use our AI-powered support assistant for instant answers.
              </p>
              <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium text-sm">
                Chat with Support Assistant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
