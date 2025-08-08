# Building Complex Software with Claude
## The Design-to-Deployment Pipeline

### Core Workflow Pattern
**Design Conversations → ADRs → Plans → Checklists → Build/Test Logs → Iteration**

---

## Part I: Foundations

### Chapter 1: The Claude Development Method
- Why Claude is different from other AI assistants
- The power of structured conversations
- Understanding Claude's strengths and limitations
- The Sharpee project as our case study
- Overview of the Design-to-Deployment pipeline

### Chapter 2: Setting Up Your Claude Environment
- Choosing between Claude.ai, API, and Claude Code
- Project structure that maximizes Claude's effectiveness
- Essential files: README, ARCHITECTURE, CLAUDE.md
- Organizing your conversation history
- Managing context windows effectively

### Chapter 3: The Artifact Pipeline
- How artifacts flow through development
- From ideas to running code
- The importance of written decisions
- Building institutional knowledge with Claude
- Version control as conversation history

---

## Part II: Design Conversations

### Chapter 4: Initiating Design Conversations
- Framing problems for Claude
- Providing the right context
- Asking architecture questions effectively
- Example: Designing Sharpee's parser architecture
- When to start new conversations vs continuing

### Chapter 5: Exploring Solution Spaces
- Getting multiple approaches from Claude
- Comparing trade-offs systematically
- Technical spike conversations
- Proof-of-concept development
- Example: Sharpee's event system design alternatives

### Chapter 6: Refining Designs Through Dialog
- Iterative refinement techniques
- Challenging Claude's assumptions
- Bringing in constraints progressively
- Cross-referencing with existing code
- Example: Sharpee's scope system evolution

---

## Part III: Architecture Decision Records (ADRs)

### Chapter 7: From Conversation to ADR
- When a design conversation becomes an ADR
- The ADR template that works with Claude
- Capturing context and constraints
- Recording alternatives considered
- Example: ADR-047 from Sharpee

### Chapter 8: Building Your ADR System
- Numbering and organizing ADRs
- Cross-referencing related decisions
- Updating ADRs as understanding evolves
- Using ADRs as Claude context
- The living documentation approach

### Chapter 9: ADR-Driven Development
- Using ADRs to guide implementation
- When to revise vs supersede ADRs
- Team alignment through ADRs
- ADRs as onboarding documentation
- Example: How Sharpee's 48 ADRs guide development

---

## Part IV: Planning and Checklists

### Chapter 10: Converting ADRs to Implementation Plans
- Breaking down architectural decisions
- Creating phased implementation approaches
- Identifying dependencies and prerequisites
- Risk assessment with Claude
- Example: Sharpee's dynamic loading refactor plan

### Chapter 11: The Power of Checklists
- Why checklists matter in AI development
- Checklist formats that Claude understands
- Progress tracking during implementation
- Using TODO comments effectively
- Example: Sharpee's refactoring checklists

### Chapter 12: Multi-Phase Development Plans
- Planning beyond single sessions
- Handoff documents between sessions
- Migration and refactoring strategies
- Maintaining backward compatibility
- Example: Sharpee's entity state refactor phases

---

## Part V: Implementation with Claude

### Chapter 13: Test-Driven Development with Claude
- Writing tests before implementation
- Using Claude for test generation
- Golden test patterns
- Test failure analysis
- Example: Sharpee's action tests

### Chapter 14: Incremental Building
- Small, verifiable steps
- Continuous validation through builds
- Using TypeScript for safety
- Managing cross-package dependencies
- Example: Building Sharpee's parser extensions

### Chapter 15: Build and Test Logs as Feedback
- Feeding errors back to Claude
- Pattern recognition in failures
- Systematic debugging approaches
- Log analysis techniques
- Example: Solving Sharpee's module resolution issues

---

## Part VI: The Feedback Loop

### Chapter 16: Log-Driven Development
- Types of logs that help Claude help you
- Build logs and their interpretation
- Test failure patterns
- Performance profiling data
- Example: Sharpee's vitest migration

### Chapter 17: Iterative Refinement
- When to pivot vs persist
- Recognizing systematic issues
- Refactoring based on test results
- Performance optimization cycles
- Example: Sharpee's command history refinement

### Chapter 18: Closing the Loop
- From logs back to design conversations
- When to create new ADRs
- Updating plans based on reality
- Maintaining momentum across sessions
- Example: Sharpee's vocabulary system evolution

---

## Part VII: Advanced Patterns

### Chapter 19: Context Management Strategies
- The art of the handoff document
- Session summaries that work
- Chunking large refactors
- Managing multiple parallel changes
- Example: Sharpee's parallel module development

### Chapter 20: Complex Refactoring Workflows
- Planning multi-week refactors
- Maintaining a working system
- Feature flags and gradual rollout
- Rollback strategies
- Example: Sharpee's world model extraction

### Chapter 21: Cross-Cutting Concerns
- Type system evolution
- API compatibility management
- Performance regression prevention
- Security consideration workflows
- Example: Sharpee's event type safety

---

## Part VIII: Team and Process

### Chapter 22: Git Integration in the Claude Workflow
- Commits as workflow checkpoints
- Branch strategies for AI development
- PR descriptions from plans and ADRs
- Code review with Claude's help
- Maintaining readable history

### Chapter 23: Release Management
- From checklists to changelogs
- Semantic versioning decisions
- Breaking change documentation
- Release testing strategies
- Post-release monitoring

### Chapter 24: Scaling the Method
- Team adoption strategies
- Shared ADR repositories
- Conversation handoffs between developers
- Knowledge management at scale
- Building on each other's work

---

## Part IX: Case Studies

### Chapter 25: Parser Development Deep Dive
- Initial design conversation
- ADR-036: Parser contracts
- Implementation plan and phases
- Test-driven parser development
- Debugging through logs

### Chapter 26: Event System Evolution
- Problem identification through testing
- Design exploration conversation
- ADR-039: Event emission patterns
- Refactoring checklist
- Validation through test logs

### Chapter 27: The Great Module Reorganization
- Recognizing architectural debt
- Planning conversation with Claude
- Multi-phase migration plan
- Checklist-driven execution
- Success metrics and validation

---

## Appendices

### Appendix A: Templates
- Design conversation starters
- ADR template
- Plan document structure
- Checklist formats
- Session handoff template

### Appendix B: Claude Prompts That Work
- Architecture exploration prompts
- Implementation planning prompts
- Debugging prompts
- Documentation prompts
- Review and validation prompts

### Appendix C: Real Artifacts from Sharpee
- Sample ADRs (with permission)
- Actual checklists used
- Build/test logs and solutions
- Handoff documents
- Git commit sequences

### Appendix D: Tooling and Setup
- VS Code configuration
- Build system setup
- Test framework configuration
- Logging strategies
- Monitoring and metrics

### Appendix E: Common Pitfalls and Solutions
- When Claude gets stuck
- Recovering from bad decisions
- Context window management
- Performance degradation
- Avoiding circular dependencies

---

## Book Philosophy

This book demonstrates that **software development with Claude is not about getting quick code snippets, but about building a systematic workflow** where:

1. **Every design conversation** produces concrete artifacts
2. **Every decision** is documented and reasoned
3. **Every plan** becomes actionable checklists
4. **Every implementation** is validated through logs
5. **Every problem** feeds back into the system

The reader will learn not just to use Claude, but to build a **sustainable, scalable development practice** that produces high-quality, well-documented, maintainable software.