'use client'

import { useState } from 'react'

interface ContactToggleProps {
  email: string
}

export default function ContactToggle({ email }: ContactToggleProps) {
  const [showContact, setShowContact] = useState(false)

  return (
    <div className="text-lg text-black">
      {showContact ? (
        <span>{email}</span>
      ) : (
        <button
          onClick={() => setShowContact(true)}
          className="underline hover:no-underline"
        >
          Show Contact
        </button>
      )}
    </div>
  )
}