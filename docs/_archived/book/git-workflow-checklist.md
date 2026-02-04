# Git Workflow Checklist for AI-Assisted Development

## Before Starting a Session

- [ ] Check current branch and status
- [ ] Pull latest changes from main/master
- [ ] Create a feature branch with descriptive name
- [ ] Share the current git status with your AI assistant

## During Development

### Every 30-45 minutes or after completing a logical unit:
- [ ] Ask AI to summarize what was just accomplished
- [ ] Review changed files with `git status`
- [ ] Stage related changes together
- [ ] Ask AI to generate a commit message following this format:
  ```
  type(scope): brief description
  
  - Detail 1
  - Detail 2
  - Why this change was necessary
  
  Fixes #issue (if applicable)
  ```

### Types to use:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc.)
- `perf`: Performance improvements
- `chore`: Maintenance tasks

## After Major Changes

- [ ] Run tests before committing
- [ ] Ask AI to review the diff for potential issues
- [ ] Create atomic commits (one logical change per commit)
- [ ] Push to remote branch regularly

## Creating Pull Requests

- [ ] Ask AI to:
  - Summarize all commits in the branch
  - Identify breaking changes
  - List all affected modules
  - Generate a PR description with:
    - What changed
    - Why it changed
    - How to test
    - Breaking changes (if any)

## Example AI Prompts

### For Commit Messages:
```
"Generate a conventional commit message for these changes:
[paste git diff]
Focus on the why, not just the what."
```

### For PR Description:
```
"Create a pull request description for these commits:
[paste git log]
Include summary, motivation, test plan, and any breaking changes."
```

### For Breaking Down Large Changes:
```
"I have these changes staged. Help me split them into logical commits:
[paste git status]
Suggest which files should be committed together and why."
```

## Red Flags to Avoid

- [ ] Commits with 50+ file changes (unless it's a genuine sweeping refactor)
- [ ] Commit messages like "fixed stuff" or "updates"
- [ ] Mixing feature additions with refactoring in one commit
- [ ] Committing debugging console.logs or commented code
- [ ] Force pushing without discussing with team

## Weekly Maintenance

- [ ] Review the week's git history
- [ ] Clean up or squash WIP commits before merging
- [ ] Update documentation if APIs changed
- [ ] Tag releases with semantic versioning
- [ ] Generate changelog from commits

## Recovery Procedures

### When AI Makes a Mess:
1. `git stash` to save current work
2. Review what went wrong
3. `git reset --hard HEAD~n` to go back n commits
4. Re-apply changes more carefully

### When You Forgot to Commit:
1. Use `git diff > massive-change.patch` to save work
2. Reset to last good state
3. Apply patches incrementally with proper commits

## Integration with AI Sessions

### Starting a Session:
```bash
git status
git log --oneline -10
# Share this with AI for context
```

### Ending a Session:
```bash
git log --oneline --since="2 hours ago"
# Ask AI to create a session summary
# Commit the summary to a SESSION_NOTES.md file
```

## Tools and Aliases

Add to your `.gitconfig`:
```ini
[alias]
  ai-status = "!f() { git status --short | head -20; echo '...'; git diff --stat; }; f"
  ai-recent = log --oneline --graph --all -20
  ai-summary = "!git log --oneline --since='6 hours ago' --author=$(git config user.name)"
```

## Remember

- Your AI assistant doesn't know your git history unless you share it
- Commit messages are documentation for your future self
- Small, focused commits are easier to review and revert
- Git history tells the story of your project's evolution
- Good git practices make AI assistance more effective, not less