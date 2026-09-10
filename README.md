# EUREKA

A local web application built around the Experience AHA route in the Eureka v5.5 source package, with the Adaptive Bisociation Leveler added from the later product audit.

## What the running app does

A case begins with an episode, not a label. The server preserves the reported material as traceable anchors, forms an experience graph, identifies the unresolved residue, extracts a relational signature, searches personal and external source fields, constructs explicit A to B mappings, attacks the transfer, keeps five status axes separate, and returns only candidates that survive the current gates.

The user alone records whether a candidate clicked. That report can change later search distance. It cannot change evidence or structural status.

The current build also supports:

0. A separate Person Context record with direct notes, ChatGPT JSON import, provenance, permissions, known concepts, familiar fields, prior stories, and independent erasure. Person Context can alter retrieval and Leveler calibration but cannot promote evidence or structural status.

1. Same case P1 retrieval from a contrasting successful episode.
2. Prior case P1 retrieval when the user explicitly permits stored case access.
3. P2 familiar field retrieval only from explicitly supplied familiarity.
4. P3 remote structural retrieval.
5. P4 contrastive cases.
6. Selective G1 to G18 routing.
7. Adaptive source distance, abstraction, bridge load, and novelty calibration.
8. Optional model interpretation constrained to admitted anchor IDs.
9. Optional open source field discovery followed by a separate structural review.
10. Optional source claim inspection using live web search.
11. Independent adversarial model review when credentials are present.
12. Recognition rerouting after known or failed candidates.
13. Self transfer recording in the user's own words.
14. Real world transfer outcome recording.
15. Case deletion and full ledger clearing.
16. Null outcomes for thin input and consequential case gating.
17. A built in ChatGPT Person Context prompt at `public/person-prompt.txt`, with a copy control in the PERSON view.
18. Optional P1 retrieval from imported prior episodes when the user permits it.
19. Known concept suppression so imported knowledge can reduce obvious source suggestions without acting as an intelligence score.

## Run

From this folder:

`npm start`

Open:

`http://localhost:8787`

No third party packages are required for the local structural route.

## Model route

Create a local `.env` or set environment variables in the shell before starting:

`OPENAI_API_KEY`

`OPENAI_MODEL`

The default model ID in the server is `gpt-5.6-terra`.

When credentials are absent, the local route remains available. When credentials are present, the model can participate in case interpretation, source proposal, candidate wording, adversarial review, and external source inspection. Each role has a separate contract.

## Test

`npm test`

Current automated checks cover reasoning behavior, interface constraints, HTTP flow, recognition separation, transfer separation, history permission, self transfer, source inspection behavior, and case deletion.

## Source contract

Read:

`docs/SOURCE_CONTRACT.md`

`docs/IMPLEMENTATION_MAP.md`

`docs/INTERFACE_CONTRACT.md`

`docs/BUILD_STATUS.md`

`docs/PRODUCT_LANGUAGE_RULES.md`

## Storage

This package stores state in `data/state.json`. It is intended for local development and evaluation. It is not a substitute for authenticated encrypted hosted storage.
