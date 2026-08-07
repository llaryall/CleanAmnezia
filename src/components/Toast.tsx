
'use client'

interface Props {
  message: string
  type: 'success' | 'error' | 'info'
}

export default function Toast({ message, type }: Props) {
  const className = `toast toast-${type} fade-in`

  return (
    <div className={className}>
      {message}
    </div>
  )
}
