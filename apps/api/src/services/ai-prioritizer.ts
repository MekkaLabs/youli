import type { Task } from '@youli/shared';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';

export async function prioritizeTask(task: Task): Promise<Task> {
  if (!ANTHROPIC_API_KEY) return fallback(task);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 256,
        system: `Você é um sistema de priorização de tarefas pessoais. 
Dado o título de uma tarefa, responda APENAS com um JSON: 
{"priority": <1-5>, "nextStep": "<próximo passo executável em 5-15 min>"}
Critérios: 5=urgente/deadline/crítico, 4=importante/esta semana, 3=rotina, 2=quando puder, 1=backlog`,
        messages: [{ role: 'user', content: `Tarefa: "${task.title}"` }],
      }),
    });

    if (!response.ok) return fallback(task);
    const data = await response.json();
    const text = data?.content?.[0]?.text ?? '';
    const parsed = JSON.parse(text);
    return {
      ...task,
      priority: Math.min(5, Math.max(1, Number(parsed.priority) || task.priority)) as Task['priority'],
      nextStep: parsed.nextStep || task.nextStep,
    };
  } catch {
    return fallback(task);
  }
}

function fallback(task: Task): Task {
  const title = task.title.toLowerCase();
  let priority: Task['priority'] = task.priority ?? 3;
  if (/(hoje|urgente|prazo|crítico|deadline)/.test(title)) priority = 5;
  else if (/(planejar|review|revisar|organizar)/.test(title)) priority = 4;
  else if (/(rotina|hábito)/.test(title)) priority = 3;
  return { ...task, priority, nextStep: task.nextStep || 'Definir o primeiro passo executável de 5-15 minutos.' };
}
