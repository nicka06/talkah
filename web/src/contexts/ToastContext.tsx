'use client'

import React, { createContext, useContext } from 'react'
import { useToast } from '@/hooks/useToast'
import ToastContainer from '@/components/ui/ToastContainer'
import { ToastData } from '@/components/ui/Toast'

interface ToastContextType {
  toasts: ToastData[]
  addToast: (toast: Omit<ToastData, 'id'>) => string
  removeToast: (id: string) => void
  clearAllToasts: () => void
  showSuccess: (title: string, message?: string, options?: Partial<ToastData>) => string
  showError: (title: string, message?: string, options?: Partial<ToastData>) => string
  showWarning: (title: string, message?: string, options?: Partial<ToastData>) => string
  showInfo: (title: string, message?: string, options?: Partial<ToastData>) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToastContext = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: React.ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const toastHook = useToast()

  return (
    <ToastContext.Provider value={toastHook}>
      {children}
      <ToastContainer 
        toasts={toastHook.toasts} 
        onRemoveToast={toastHook.removeToast} 
      />
    </ToastContext.Provider>
  )
} 