---
name: async-question
description: Ask David a question when he is away during autonomous work — open a GitHub issue, send an ntfy push with the link, then poll for his reply and continue. Use when stuck mid-task with no one at the keyboard.
user_invocable: true
---

# Async communication (when the user is away)

If stuck or have questions during autonomous work:

1. Create a GitHub issue with the question:

   ```bash
   gh issue create --title "Claude Question: [topic]" --body "[details]"
   ```

2. Send an ntfy notification with the issue link:

   ```bash
   curl -d "Question: [brief desc] - reply on GitHub: [issue-url]" ntfy.sh/sharpee-chicagodave
   ```

3. Poll for the response:

   ```bash
   gh api repos/ChicagoDave/sharpee/issues/[N]/comments --jq '.[].body'
   ```

4. Continue work based on the response.
