import { useEffect, useRef } from 'react'

interface Props {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, type = 'success', onClose }: Props) {
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), 3500)
    return () => clearTimeout(timer)
  }, [])

  const bg = type === 'error' ? 'bg-red-500' : 'bg-green-500'

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-lg text-white text-sm shadow-lg ${bg}`}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        aria-label="Fechar notificação"
        className="ml-1 opacity-75 hover:opacity-100 transition-opacity leading-none"
      >
        ✕
      </button>
    </div>
  )
}
