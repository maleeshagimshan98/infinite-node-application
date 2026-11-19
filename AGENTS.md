# Infinite Node Application — AGENTS.md

A clean-architecture Node.js/TypeScript service framework for DDD-layered REST APIs (Express, MongoDB/Mongoose,
Redis/BullMQ, Awilix). Owner: Maleesha Gimshan ([@maleeshagimshan98](https://github.com/maleeshagimshan98)).

**Read [`CLAUDE.md`](CLAUDE.md) before making any change.** It is the single source of the rules, the application
structure and the patterns for every AI agent (Claude, Codex, Copilot, Cursor, …), not only Claude. Follow it exactly.

Don't add rules to this file; change `CLAUDE.md` instead, so there is only one copy to keep up to date.

Further reading, linked from `CLAUDE.md` §1:

- `Docs/prompts/API_Resource_Guide.md`: building a full resource, layer by layer
- `Docs/prompts/Domain_Model_Repository_Mapper_Guide.md`: domain models, schemas, mappers, sub-documents
- `Docs/prompts/Database_Seeding_Guide.md`: seeders
- `Docs/architecture/infrastructure-layer-pattern.md`: infrastructure services in depth
- `Docs/features/`: feature reference (email, notifications)
