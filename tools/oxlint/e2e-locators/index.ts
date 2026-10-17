import { defineRule, eslintCompatPlugin, type ESTree } from "@oxlint/plugins";

const BARE_TAGS = new Set(["span", "p", "div"]);

const PICKS = new Set(["first", "nth", "last"]);

function calledMethod(node: ESTree.CallExpression) {
  const callee = node.callee;

  if (callee.type !== "MemberExpression" || callee.computed) return null;

  return callee.property.type === "Identifier" ? callee.property.name : null;
}

// "span" or `span`; anything built at runtime is not a bare tag.
function staticString(
  node: ESTree.CallExpression["arguments"][number] | undefined,
) {
  if (node?.type === "Literal") return String(node.value);

  if (node?.type === "TemplateLiteral" && node.expressions.length === 0)
    return node.quasis[0].value.cooked ?? "";

  return "";
}

function followsGetByText(node: ESTree.Expression | ESTree.Super) {
  let current = node;

  while (
    current.type === "CallExpression" &&
    current.callee.type === "MemberExpression"
  ) {
    if (calledMethod(current) === "getByText") return true;

    current = current.callee.object;
  }

  return false;
}

// Responsive layouts render some content twice and hide one copy with CSS.
// Text and tag locators still see the hidden copy, so they hit strict-mode
// violations as soon as a breakpoint duplicates the text (#103).
const noAmbiguousLocatorRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow bare tag locators and picking one getByText match by position in e2e specs.",
    },
    messages: {
      bareTag:
        "`locator('{{tag}}')` matches every copy a breakpoint renders, hidden ones included. Use getByRole (scoped to a region or listitem) or getByLabel.",
      pick: "`.{{method}}()` after getByText hides an ambiguous match. Scope with getByRole to the visible region or row and assert there.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const method = calledMethod(node);

        if (method === "locator") {
          const tag = staticString(node.arguments[0]);

          if (BARE_TAGS.has(tag))
            context.report({ node, messageId: "bareTag", data: { tag } });

          return;
        }

        if (
          method &&
          PICKS.has(method) &&
          node.callee.type === "MemberExpression" &&
          followsGetByText(node.callee.object)
        )
          context.report({ node, messageId: "pick", data: { method } });
      },
    };
  },
});

export default eslintCompatPlugin({
  meta: { name: "e2e" },
  rules: { "no-ambiguous-locator": noAmbiguousLocatorRule },
});
