export interface HighlightToken {
  text: string;
  className: string;
}

const KEY_LINE = /^(\s*(?:-\s+)?)("?[\w.\-*/]+"?)(:)(.*)$/;

function splitQuoted(text: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  const regex = /"[^"]*"/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, match.index), className: "" });
    }
    tokens.push({ text: match[0], className: "text-emerald-400" });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex), className: "" });
  }
  return tokens;
}

export type HighlightLanguage = "yaml" | "json" | "text";

/** Tokenizes one line of YAML/JSON/text for display: comments, `key:` prefixes, and quoted strings each get their own class. Not a real parser - good enough for a read-only preview. Plain `text` artifacts are never tokenized as code, so a value that happens to contain a colon doesn't get mistaken for a YAML key. */
export function highlightLine(line: string, language: HighlightLanguage): HighlightToken[] {
  if (language === "text") {
    return [{ text: line, className: "" }];
  }

  const trimmed = line.trim();
  if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
    return [{ text: line, className: "text-(--text-muted) italic" }];
  }

  const match = line.match(KEY_LINE);
  if (!match) {
    return splitQuoted(line);
  }

  const [, prefix = "", key = "", colon = "", rest = ""] = match;
  return [
    { text: prefix, className: "" },
    { text: key, className: "text-sky-400" },
    { text: colon, className: "" },
    ...splitQuoted(rest),
  ];
}
