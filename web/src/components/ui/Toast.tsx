'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastData {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastProps {
  toast: ToastData
  onClose: (id: string) => void
}

const Toast = ({ toast, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, toast.duration || 5000)
      return () => clearTimeout(timer)
    }
  }, [toast.duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onClose(toast.id)
    }, 300)
  }

  const getToastStyles = () => {
    const baseStyles = "flex items-start p-4 rounded-xl border-2 shadow-lg backdrop-blur-sm transition-all duration-300 transform max-w-md"
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-500 text-green-800`
      case 'error':
        return `${baseStyles} bg-red-50 border-red-500 text-red-800`
      case 'warning':
        return `${baseStyles} bg-orange-50 border-orange-500 text-orange-800`
      case 'info':
        return `${baseStyles} bg-blue-50 border-blue-500 text-blue-800`
      default:
        return `${baseStyles} bg-gray-50 border-gray-500 text-gray-800`
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-6 h-6 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const animationClasses = isLeaving 
    ? 'opacity-0 translate-x-full scale-95' 
    : isVisible 
      ? 'opacity-100 translate-x-0 scale-100' 
      : 'opacity-0 translate-x-full scale-95'

  return (
    <div className={`${getToastStyles()} ${animationClasses}`}>
      <div className="mr-3 mt-0.5">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm mb-1">
          {toast.title}
        </div>
        {toast.message && (
          <div className="text-sm opacity-90 break-words">
            {toast.message}
          </div>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm underline hover:no-underline transition-all"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleClose}
        className="ml-3 flex-shrink-0 p-1 rounded-lg hover:bg-black/10 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default Toast 