import React from "react"

interface MacBookProps {
  children: React.ReactNode
}

export function MacBook({ children }: MacBookProps) {
  return (
    <div className="relative mx-auto w-full max-w-4xl rounded-2xl bg-gray-800 p-4 shadow-lg">
      <div className="absolute -top-2 left-1/2 h-2 w-24 -translate-x-1/2 rounded-b-lg bg-gray-700" />
      <div className="rounded-lg bg-black p-4">{children}</div>
      <div className="absolute -bottom-2 left-1/2 h-2 w-32 -translate-x-1/2 rounded-b-xl bg-gray-700" />
    </div>
  )
}
