import { useState, useCallback } from 'react'
import { ToastData, ToastType } from '@/components/ui/Toast'

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastData = {
      ...toast,
      id,
      duration: toast.duration ?? 5000
    }
    
    setToasts(prev => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods for different toast types
  const showSuccess = useCallback((title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'success', title, message, ...options })
  }, [addToast])

  const showError = useCallback((title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'error', title, message, ...options })
  }, [addToast])

  const showWarning = useCallback((title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'warning', title, message, ...options })
  }, [addToast])

  const showInfo = useCallback((title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'info', title, message, ...options })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
} 