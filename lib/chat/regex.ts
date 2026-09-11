const REGEX_METACHARS = /[.*+?^${}()|[\]\\]/g

export function escapeRegexLiteral(value: string): string {
  return value.replace(REGEX_METACHARS, "\\$&")
}

function diacriticCharClass(char: string): string {
  const normalized = char
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  switch (normalized) {
    case "a":
      return "[aáàäâãAÁÀÄÂÃ]"
    case "e":
      return "[eéèëêEÉÈËÊ]"
    case "i":
      return "[iíìïîIÍÌÏÎ]"
    case "o":
      return "[oóòöôõOÓÒÖÔÕ]"
    case "u":
      return "[uúùüûUÚÙÜÛ]"
    case "n":
      return "[nñNÑ]"
    default:
      return escapeRegexLiteral(char)
  }
}

/** Regex de texto de usuario para Mongo. Cada caracter especial queda escapado. */
export function userTextToMongoRegex(value: string, exact: boolean): RegExp {
  const pattern = value
    .trim()
    .split("")
    .map((char) => (/\s/.test(char) ? "\\s+" : diacriticCharClass(char)))
    .join("")
  return new RegExp(exact ? `^${pattern}$` : pattern, "i")
}
