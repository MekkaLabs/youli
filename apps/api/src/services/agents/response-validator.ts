/**
 * Response Validator — Aider-inspired "Response Validation Loop"
 * Valida respostas do agente contra critérios estruturais.
 */

// Tipos locais (espelham AgentResponse sem import circular)
interface AgentResponseLike {
  message: string;
  actions: string[];
  insights: string[];
  confidence?: number;
}

export interface ValidationRule {
  id: string;
  description: string;
  check: (response: AgentResponseLike, userMessage: string) => boolean;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  rulesChecked: number;
}

export const DEFAULT_RULES: ValidationRule[] = [
  {
    id: 'has_message',
    description: 'A resposta deve ter uma mensagem com pelo menos 10 caracteres',
    check: (response: AgentResponseLike, _userMessage: string): boolean =>
      response.message.trim().length >= 10,
    severity: 'error',
  },
  {
    id: 'has_action',
    description: 'A resposta deve conter pelo menos uma ação',
    check: (response: AgentResponseLike, _userMessage: string): boolean =>
      response.actions.length >= 1,
    severity: 'warning',
  },
  {
    id: 'no_placeholder',
    description: 'A mensagem não deve conter placeholders ou valores inválidos',
    check: (response: AgentResponseLike, _userMessage: string): boolean =>
      !/(\[INSERIR|TODO:|undefined|^null$)/.test(response.message),
    severity: 'error',
  },
  {
    id: 'message_not_too_long',
    description: 'A mensagem não deve exceder 2000 caracteres',
    check: (response: AgentResponseLike, _userMessage: string): boolean =>
      response.message.length < 2000,
    severity: 'warning',
  },
  {
    id: 'actions_not_empty',
    description: 'Todas as ações devem ter mais de 5 caracteres',
    check: (response: AgentResponseLike, _userMessage: string): boolean =>
      response.actions.every((a) => a.trim().length > 5),
    severity: 'warning',
  },
];

export function validateResponse(
  response: AgentResponseLike,
  userMessage: string,
  rules: ValidationRule[] = DEFAULT_RULES,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    const passed = rule.check(response, userMessage);
    if (!passed) {
      if (rule.severity === 'error') {
        errors.push(`[${rule.id}] ${rule.description}`);
      } else {
        warnings.push(`[${rule.id}] ${rule.description}`);
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    rulesChecked: rules.length,
  };
}

export function isValidResponse(
  response: AgentResponseLike,
  userMessage: string,
): boolean {
  return validateResponse(response, userMessage).passed;
}

export function formatValidationErrors(result: ValidationResult): string {
  const all = [...result.errors, ...result.warnings];
  return all.join('\n');
}
