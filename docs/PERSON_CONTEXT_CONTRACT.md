# Person Context contract

## Purpose

Person Context exists so Eureka can search across the person, not only the current case. It can provide familiar source fields, known concepts, prior projects, recurring friction, success patterns, goals, constraints, language, and concrete earlier episodes.

## Separation rule

Person Context may change retrieval order, P1 and P2 source availability, bridge distance, novelty routing, and story comparison. It may not raise evidence status, structural status, user recognition status, or transfer outcome status.

## Provenance

Each imported item should preserve source reference, date when actually known, confidence label, and whether it is direct, an observed pattern, a candidate inference, or unknown. Missing provenance stays unknown.

## Candidate inferences

Candidate inferences are stored separately. They are not factual biography. They do not enter retrieval unless the user explicitly turns that permission on.

## P1 use

Only concrete imported stories or episodes may enter P1. Freeform biography notes do not automatically become episodes. A candidate imported episode must share at least two target relations before it can enter P1 in the local structural route.

When a prior Eureka case and a broad imported episode both fit, the prior Eureka case receives priority because its relational signature was already constructed from a case record.

## P2 use

Familiar fields imported from Person Context may reduce bridge cost and make a source eligible for P2. Familiarity never verifies the source mapping.

## Known concepts

Known concepts can lower the ranking of sources likely to be obvious. This is a novelty routing signal only. It is not an IQ score or expertise certification.

## ChatGPT import

The PERSON view contains a copyable prompt. It instructs ChatGPT to use only context actually available, audit what it could and could not access, preserve provenance, separate direct information from candidate inference, avoid sensitive inference, and return JSON for deterministic parsing.

If past chats are not accessible in the current ChatGPT context, the interface points to the official ChatGPT data export instructions. A user can upload the exported conversation JSON to ChatGPT and run the same prompt against that inspectable file.

## User control

The user can disable Person Context personalization, disable imported story use for P1, keep candidate inferences disabled, or erase the Person Context independently of the case ledger.
