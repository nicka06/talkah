'use client'

import { useRouter } from 'next/navigation'

interface BackButtonProps {
  text?: string
  href?: string
  className?: string
}

export function BackButton({ 
  text = "Back", 
  href = "/dashboard",
  className = ""
}: BackButtonProps) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(href)}
      className={`flex items-center space-x-2 px-4 py-2 bg-white/10 border-2 border-black rounded-lg text-black hover:bg-black hover:text-white transition-colors ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span>{text}</span>
    </button>
  )
} 