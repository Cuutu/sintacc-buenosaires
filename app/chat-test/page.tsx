"use client"

import { useChat } from "@ai-sdk/react"
import { useState } from "react"

export default function ChatTestPage() {
  const [input, setInput] = useState("")
  const { messages, sendMessage, status, error } = useChat()
  const busy = status === "submitted" || status === "streaming"

  return (
    <main>
      <h1>Chat test</h1>
      <div>
        {messages.map((message) => (
          <div key={message.id}>
            <strong>{message.role === "user" ? "User" : "AI"}:</strong>{" "}
            {message.parts.map((part, index) => {
              if (part.type === "text") {
                return <span key={`${message.id}-${index}`}>{part.text}</span>
              }
              return null
            })}
          </div>
        ))}
      </div>
      {error ? <p>{error.message}</p> : null}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const text = input.trim()
          if (!text || busy) return
          sendMessage({ text })
          setInput("")
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          placeholder="Escribí un mensaje"
          disabled={busy}
        />
        <button type="submit" disabled={busy}>
          Enviar
        </button>
      </form>
    </main>
  )
}
