'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Toast, { ToastData } from './Toast'

interface ToastContainerProps {
  toasts: ToastData[]
  onRemoveToast: (id: string) => void
}

const ToastContainer = ({ toasts, onRemoveToast }: ToastContainerProps) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onClose={onRemoveToast} />
        </div>
      ))}
    </div>,
    document.body
  )
}

export default ToastContainer 