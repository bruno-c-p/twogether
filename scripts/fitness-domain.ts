import type { Repo } from "./fitness-checks";

export const DOMAIN_BASELINE = "scripts/fitness-domain-baseline.tsv";

const DOMAIN = "src/features/budget/domain/";

const DOMAIN_TYPES = `${DOMAIN}types.ts`;

const EXPORTED_TYPE = /^export (interface \w+|type \w+)(?:\s*=([^;]*))?/gm;

const SCHEMA_TYPE = /^z\.(?:infer|input|output)<typeof \w+>$/;

const RAW_STATUS = /\bsettlementOf\b|\bsplit\??\.paidAt\b/g;

function baselineCounts(repo: Repo) {
  const counts = new Map<string, number>();

  for (const line of repo.read(DOMAIN_BASELINE).split("\n").filter(Boolean))
    counts.set(line, (counts.get(line) ?? 0) + 1);

  return counts;
}

function hits(repo: Repo) {
  const types = [...repo.read(DOMAIN_TYPES).matchAll(EXPORTED_TYPE)].flatMap(
    (match) =>
      SCHEMA_TYPE.test((match[2] ?? "").trim())
        ? []
        : [
            {
              file: DOMAIN_TYPES,
              token: match[1] ?? "",
              fix: "derive it with z.infer from its schema",
            },
          ],
  );

  const status = repo
    .tracked(["src"])
    .filter(
      (file) =>
        /\.tsx?$/.test(file) &&
        !/\.test\.tsx?$/.test(file) &&
        !file.startsWith(DOMAIN),
    )
    .flatMap((file) =>
      [...repo.read(file).matchAll(RAW_STATUS)].map((match) => ({
        file,
        token: match[0].replace("?.", "."),
        fix: "read repayment, split, paidAt, userOwes or lock from transactionStatus (domain/status.ts)",
      })),
    );

  return [...types, ...status];
}

export function domainModelRules(repo: Repo) {
  const allowed = baselineCounts(repo);

  const added = hits(repo).flatMap(({ file, token, fix }) => {
    const key = `${file}\t${token}`;
    const left = allowed.get(key) ?? 0;

    if (left > 0) {
      allowed.set(key, left - 1);

      return [];
    }

    return [
      `${file} adds ${token}; ${fix}. Existing ones are grandfathered in ${DOMAIN_BASELINE}; do not add to it.`,
    ];
  });

  const stale = [...allowed].flatMap(([key, left]) =>
    left > 0
      ? [
          `${DOMAIN_BASELINE} lists ${key.replace("\t", " ")} ${left} more time(s) than the code uses it; delete those lines`,
        ]
      : [],
  );

  return [...added, ...stale];
}
