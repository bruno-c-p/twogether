import { defineRule, eslintCompatPlugin, type ESTree } from "@oxlint/plugins";

const MESSAGE =
  "Read the clock through @/lib/clock: now() for an instant, today(timeZone) or currentMonth(timeZone) for a calendar date.";

const noDirectClockRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `new Date()` and `Date.now` outside @/lib/clock.",
    },
    messages: { directClock: MESSAGE },
  },
  createOnce(context) {
    const text = (node: ESTree.Node) => context.sourceCode.getText(node);

    return {
      NewExpression(node) {
        if (text(node.callee) === "Date" && node.arguments.length === 0) {
          context.report({ node, messageId: "directClock" });
        }
      },
      MemberExpression(node) {
        if (text(node) === "Date.now") {
          context.report({ node, messageId: "directClock" });
        }
      },
    };
  },
});

export default eslintCompatPlugin({
  meta: { name: "clock" },
  rules: { "no-direct-clock": noDirectClockRule },
});
