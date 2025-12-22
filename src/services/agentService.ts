import { StreamData, AgentRequest } from '../types';

export const fetchAgentStream = async (
  url: string,
  body: AgentRequest,
  onMessage: (data: StreamData) => void,
  onError: (error: Error) => void,
  onComplete: () => void
) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    if (!response.body) throw new Error("ReadableStream not supported in this browser.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Handle potentially fragmented SSE events
      // We expect format: "data: {...}\n\n"
      const lines = buffer.split('\n\n');
      
      // Keep the last part in the buffer if it's incomplete (doesn't end with \n\n logic effectively)
      // If the last split is empty string, it means the chunk ended perfectly with \n\n
      // If it's not empty, it's the start of the next message
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data:')) {
          const jsonStr = trimmedLine.replace('data:', '').trim();
          
          if (jsonStr === '[DONE]') {
            onComplete();
            return;
          }

          try {
            const data: StreamData = JSON.parse(jsonStr);
            onMessage(data);
          } catch (e) {
            console.warn('JSON Parse Warning:', e, 'Raw:', jsonStr);
          }
        }
      }
    }
    
    // Flush remaining buffer if any (rare in SSE but good practice)
    if (buffer.trim().startsWith('data:')) {
       try {
          const jsonStr = buffer.replace('data:', '').trim();
          if (jsonStr !== '[DONE]') {
             const data = JSON.parse(jsonStr);
             onMessage(data);
          }
       } catch (e) {
         // ignore partial tail garbage
       }
    }

    onComplete();
  } catch (err) {
    onError(err instanceof Error ? err : new Error('Unknown stream error'));
  }
};