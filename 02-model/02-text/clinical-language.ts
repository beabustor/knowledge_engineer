/** Small explicit bilingual rules, not a clinical language model. */
export function isNegated(text: string, start: number): boolean {
  const prefix = text
    .slice(0, start)
    .split(
      /[.;:!?\n]|,(?!\d)|\b(?:pero|aunque|but|however|y\s+(?:tengo|presento|me encuentro|siento)|and\s+i\s+(?:have|feel))\b/,
    )
    .at(-1)!;
  return /\b(?:sin|no|niego|not|without|deny|denies)\b/.test(prefix);
}
export function temperatures(text: string) {
  const normalized = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const regex =
    /\b(\d{2,3}(?:[.,]\d+)?)\s*(?:°\s*([cf])\b|grados(?:\s+(celsius|centigrados|fahrenheit))?\b|degrees(?:\s+(celsius|fahrenheit))?\b|\bcelsius\b|\bfahrenheit\b|de\s+fiebre\b)/gu;
  return [...normalized.matchAll(regex)].map((match) => {
    const token = match[0];
    const unit = /fahrenheit|°\s*f\b/.test(token)
      ? 'F'
      : /celsius|centigrados|°\s*c\b/.test(token)
        ? 'C'
        : 'unspecified';
    return {
      value: Number(match[1].replace(',', '.')),
      unit,
      negated: isNegated(normalized, match.index),
      text: match[0],
    };
  });
}
