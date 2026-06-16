import { SYSTEM_PROMPT } from './prompt'
import { getOllamaUrl, getOllamaModel, type Message } from './storage'

export type { Message }

export async function streamMessage(
  messages: Message[],
  onChunk: (text: string) => void,
): Promise<void> {
  const baseUrl = await getOllamaUrl()
  const model = await getOllamaModel()

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Ollama ${response.status}: ${err}`)
  }

  if (!response.body) throw new Error('Pas de body dans la réponse')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const data = JSON.parse(line)
        if (data.message?.content) onChunk(data.message.content)
        if (data.done) return
      } catch {
        // ligne incomplète, ignore
      }
    }
  }
}

export async function testConnection(): Promise<string> {
  const baseUrl = await getOllamaUrl()
  const response = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  const models = (data.models ?? []).map((m: { name: string }) => m.name)
  return models.length > 0 ? models.join(', ') : 'Aucun modèle installé'
}
