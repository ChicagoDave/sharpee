/**
 * Response formatting utilities
 * TODO: Implement proper response formatting
 */

export function formatResponse(template: string, params?: any): string {
  // Basic template substitution
  if (!params) return template;
  
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
  }
  return result;
}

export function formatList(items: string[], options?: { 
  style?: 'long' | 'short' | 'narrow';
  type?: 'conjunction' | 'disjunction' | 'unit';
}): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  
  const type = options?.type || 'conjunction';
  const connector = type === 'disjunction' ? ' or ' : ' and ';
  
  if (items.length === 2) {
    return items.join(connector);
  }
  
  return items.slice(0, -1).join(', ') + ',' + connector + items[items.length - 1];
}
