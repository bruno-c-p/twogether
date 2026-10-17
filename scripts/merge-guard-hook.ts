import { z } from "zod";

const shells = new Set(["sh", "bash", "zsh", "dash", "fish"]);

const separators = new Set([";", "&", "|", "(", ")", "`", "\n"]);

const bashInput = z.object({ tool_input: z.object({ command: z.string() }) });

type Parsed = { commands: string[][]; substitutions: string[] };

type Parser = Parsed & {
  source: string;
  heredocs: string[];
  words: string[];
  word: string | null;
};

export function invokesGhPrMerge(command: string): boolean {
  const { commands, substitutions } = parse(command);

  return (
    commands.some(isRawMerge) ||
    substitutions.some((inner) => invokesGhPrMerge(inner))
  );
}

const program = (word: string) => word.split("/").pop() ?? "";

function isRawMerge(words: string[]): boolean {
  const shell = words.findIndex((word) => shells.has(program(word)));

  if (shell !== -1 && words[shell + 1] === "-c") {
    return invokesGhPrMerge(words[shell + 2] ?? "");
  }

  if (words[0] === "eval") return invokesGhPrMerge(words.slice(1).join(" "));

  const [group, command] = ghSubcommand(words);

  return group === "pr" && command === "merge";
}

function ghSubcommand(words: string[]): string[] {
  const gh = words.findIndex((word) => program(word) === "gh");
  const positional: string[] = [];

  if (gh === -1) return positional;

  for (let i = gh + 1; i < words.length && positional.length < 2; i++) {
    if (words[i] === "-R" || words[i] === "--repo") i++;
    else if (!words[i].startsWith("-")) positional.push(words[i]);
  }

  return positional;
}

function closing(source: string, from: number, token: string) {
  const end = source.indexOf(token, from);

  return end === -1 ? source.length : end;
}

function closingParen(source: string, from: number) {
  let depth = 1;

  for (let i = from; i < source.length; i++) {
    if (source[i] === "(") depth++;

    if (source[i] === ")" && --depth === 0) return i;
  }

  return source.length;
}

function afterHeredoc(source: string, from: number, delimiter: string) {
  let line = from;

  while (line < source.length) {
    const end = closing(source, line, "\n");

    if (source.slice(line, end).trim() === delimiter) return end + 1;
    line = end + 1;
  }

  return source.length;
}

function parse(source: string): Parsed {
  const parser: Parser = {
    source,
    commands: [],
    substitutions: [],
    heredocs: [],
    words: [],
    word: null,
  };

  let i = 0;

  while (i < source.length) i = step(parser, i);

  endCommand(parser);

  return { commands: parser.commands, substitutions: parser.substitutions };
}

function step(parser: Parser, i: number): number {
  const { source } = parser;
  const char = source[i];

  if (char === "'") return readSingleQuoted(parser, i);

  if (char === '"') return readDoubleQuoted(parser, i);

  if (char === "\\") return readEscape(parser, i);

  if (source.startsWith("<<", i) && source[i + 2] !== "<") {
    return readHeredocStart(parser, i);
  }

  if (char === "\n") return readNewline(parser, i);

  if (separators.has(char)) endCommand(parser);
  else if (/\s/.test(char)) endWord(parser);
  else append(parser, char);

  return i + 1;
}

function readSingleQuoted(parser: Parser, i: number): number {
  const end = closing(parser.source, i + 1, "'");

  append(parser, parser.source.slice(i + 1, end));

  return end + 1;
}

function readDoubleQuoted(parser: Parser, i: number): number {
  append(parser, "");

  let at = i + 1;

  while (at < parser.source.length && parser.source[at] !== '"') {
    at = stepQuoted(parser, at);
  }

  return at + 1;
}

function stepQuoted(parser: Parser, i: number): number {
  const { source } = parser;

  if (source[i] === "\\") return readEscape(parser, i);

  if (source.startsWith("$(", i)) {
    return substitute(parser, i + 2, closingParen(source, i + 2));
  }

  if (source[i] === "`") {
    return substitute(parser, i + 1, closing(source, i + 1, "`"));
  }

  append(parser, source[i]);

  return i + 1;
}

function substitute(parser: Parser, from: number, end: number): number {
  parser.substitutions.push(parser.source.slice(from, end));

  return end + 1;
}

function readEscape(parser: Parser, i: number): number {
  append(parser, parser.source[i + 1] ?? "");

  return i + 2;
}

function readHeredocStart(parser: Parser, i: number): number {
  endWord(parser);

  const match = /^-?\s*(['"]?)([\w.-]+)\1/.exec(parser.source.slice(i + 2));

  if (match) parser.heredocs.push(match[2]);

  return i + 2 + (match?.[0].length ?? 0);
}

function readNewline(parser: Parser, i: number): number {
  endCommand(parser);

  let at = i + 1;

  for (const delimiter of parser.heredocs.splice(0)) {
    at = afterHeredoc(parser.source, at, delimiter);
  }

  return at;
}

function append(parser: Parser, text: string) {
  parser.word = (parser.word ?? "") + text;
}

function endWord(parser: Parser) {
  if (parser.word !== null) parser.words.push(parser.word);

  parser.word = null;
}

function endCommand(parser: Parser) {
  endWord(parser);

  if (parser.words.length > 0) parser.commands.push(parser.words);

  parser.words = [];
}

if (import.meta.main) {
  const input = bashInput.safeParse(await Bun.stdin.json());

  if (input.success && invokesGhPrMerge(input.data.tool_input.command)) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            "Raw `gh pr merge` is blocked: it can merge while CI is pending or red. Run `bun run merge-guard <pr>` instead; it waits for green checks on the head and then squash-merges that exact commit.",
        },
      }),
    );
  }
}
