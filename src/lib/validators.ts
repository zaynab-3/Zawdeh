export function trimToMax(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

export function hasText(value: string) {
  return value.trim().length > 0;
}

export function normalizeIngredientName(value: string) {
  return trimToMax(value.toLowerCase(), 120);
}

export function isHttpUrl(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
