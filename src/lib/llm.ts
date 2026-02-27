import type { Settings } from '@/store/types';

export async function* streamCompletion(
  messages: { role: string; content: string }[],
  settings: Settings
) {
  const response = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      // Add reasoning parameters if needed
      ...(settings.enableReasoning && settings.reasoningEffort ? { reasoning_effort: settings.reasoningEffort } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) return;

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      if (trimmedLine.startsWith('data: ')) {
        const data = trimmedLine.slice(6);
        if (data === '[DONE]') return;

        try {
          const json = JSON.parse(data);
          const content = json.choices[0]?.delta?.content || '';
          if (content) yield content;
        } catch (e) {
          console.error('Error parsing JSON', e);
        }
      }
    }
  }
}
