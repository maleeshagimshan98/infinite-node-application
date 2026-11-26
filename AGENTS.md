# Infinite Node Application — AGENTS.md

A clean-architecture Node.js/TypeScript service framework for DDD-layered REST APIs (Express, MongoDB/Mongoose,
Redis/BullMQ, Awilix). Owner: Maleesha Gimshan ([@maleeshagimshan98](https://github.com/maleeshagimshan98)).

**Read [`CLAUDE.md`](CLAUDE.md) before making any change**, and the `Docs/rules/` file it names for each layer you
touch. Together they are the single source of the rules, the application structure and the patterns for every AI
agent (Claude, Codex, Copilot, Cursor, …), not only Claude. Follow them exactly.

Don't add rules to this file; change `CLAUDE.md` or the `Docs/rules/` file that holds the section instead, so there
is only one copy to keep up to date.

Rule files, listed in the "Rule files" table of `CLAUDE.md` (section numbers as in `CLAUDE.md`):

- `Docs/rules/domain-modelling.md`: §5 domain models
- `Docs/rules/mappers.md`: §6.1–§6.3, §6.9–§6.11 schemas, mappers and sub-documents
- `Docs/rules/repositories.md`: §6.4–§6.8 repositories
- `Docs/rules/domain-services.md`: §7 domain services
- `Docs/rules/application-services.md`: §8 application services and transactions
- `Docs/rules/presentation.md`: §9 validators, controllers, routes
- `Docs/rules/errors.md`: §10 errors → HTTP status
- `Docs/rules/infrastructure.md`: §11 infrastructure services
- `Docs/rules/pull-requests.md`: §13.3 pull requests
- `Docs/rules/work-in-progress.md`: §14 work in progress
- `Docs/rules/api-resource.md`: §15 API resources
- `Docs/rules/seeding.md`: §16 seeding

Further reading, linked from `CLAUDE.md` §1:

- `Docs/prompts/API_Resource_Guide.md`: building a full resource, layer by layer
- `Docs/prompts/Domain_Model_Repository_Mapper_Guide.md`: domain models, schemas, mappers, sub-documents
- `Docs/prompts/Database_Seeding_Guide.md`: seeders
- `Docs/architecture/application-architecture.md`: how the layers, processes, request flow and errors fit together
- `Docs/architecture/infrastructure-layer-pattern.md`: infrastructure services in depth
- `Docs/features/`: feature reference (email, notifications)
