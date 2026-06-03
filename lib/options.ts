export const MENTORSHIP_OPTIONS = [
  "LexAi Pro",
  "Liga dos Mentores",
  "Fabrica de Intercessores"
];

export const DEFAULT_CS_NAMES = [
  "Gabriel Martins",
  "Mateus Borges"
];

export function normalizeMentorship(
  value: string
) {
  const cleanValue = value.trim();
  const match = MENTORSHIP_OPTIONS.find(
    (option) =>
      option.toLowerCase() ===
      cleanValue.toLowerCase()
  );

  return match ?? cleanValue;
}
