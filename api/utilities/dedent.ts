/**
 * Removes excess indentation caused by using multiline template strings.
 *
 * Ported from `dedent-js` solution.
 *
 * @see https://github.com/MartinKolarik/dedent-js
 *
 * @param templateStrings - Template strings to dedent.
 *
 * @example
 * {
 *   nested: {
 *     examples: [
 *       dedent(`
 *         I am 8 spaces off from the beginning of this file.
 *         But I will be 2 spaces based on the trimmed distance
 *         of the first line.
 *       `),
 *     ]
 *   }
 * }
 */
export function dedent(templateStrings: TemplateStringsArray | string, ...values: any[]) {
  const matches = [];
  const strings = typeof templateStrings === "string" ? [templateStrings] : templateStrings.slice();

  // Remove trailing whitespace.

  strings[strings.length - 1] = strings[strings.length - 1].replace(/\r?\n([\t ]*)$/, "");

  // Find all line breaks to determine the highest common indentation level.

  for (let i = 0; i < strings.length; i++) {
    const match = strings[i].match(/\n[\t ]+/g);
    if (match) {
      matches.push(...match);
    }
  }

  // Remove the common indentation from all strings.

  if (matches.length) {
    const size = Math.min(...matches.map((value) => value.length - 1));
    const pattern = new RegExp(`\n[\t ]{${size}}`, "g");
    for (let i = 0; i < strings.length; i++) {
      strings[i] = strings[i].replace(pattern, "\n");
    }
  }

  // Remove leading whitespace.

  strings[0] = strings[0].replace(/^\r?\n/, "");

  // Perform interpolation.

  let string = strings[0];
  for (let i = 0; i < values.length; i++) {
    string += values[i] + strings[i + 1];
  }

  return string;
}
