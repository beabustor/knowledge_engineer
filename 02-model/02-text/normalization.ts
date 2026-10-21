/** Unicode normalization shared by explicit lexical rules. */
export const normalize = (text: string): string =>
  text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
