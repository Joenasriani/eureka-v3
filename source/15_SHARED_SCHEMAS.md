# Shared Schemas - v5.5 proposed

## Experience anchor

```yaml
anchor_id: X1
type: USER_STORY_FRAGMENT|SALIENT_EPISODE|USER_PHRASE|PRIOR_ATTEMPT|REPORTED_SUCCESS|REPORTED_FAILURE|EXPECTATION|OBSERVED_OUTCOME|FRICTION|FAMILIAR_DOMAIN|USER_PROVIDED_SKILL_OR_ROLE|USER_METAPHOR|DESIRED_CAPABILITY|LATENT_OPPORTUNITY|WHAT_ALREADY_WORKS|OTHER
text_or_summary: ""
provenance: CURRENT_USER_INPUT|AUTHORIZED_CONTEXT
allowed_for_personalization: true
```

## Experience episode

```yaml
episode_id: EP1
context_anchor_ids: []
goal_anchor_ids: []
trigger_anchor_ids: []
action_anchor_ids: []
expectation_anchor_ids: []
observed_outcome_anchor_ids: []
friction_anchor_ids: []
reported_emotion_anchor_ids: []
user_interpretation_anchor_ids: []
what_worked_anchor_ids: []
what_failed_anchor_ids: []
constraint_anchor_ids: []
```

## Experience relation

```yaml
relation_id: XR1
from_id: EP1|X1
to_id: EP2|X2
type: SAME_PATTERN_AS|DIFFERENT_OUTCOME_FROM|SUCCESS_ANALOGUE_OF|FAILURE_ANALOGUE_OF|PRECEDES|FOLLOWS|USER_SUSPECTS_CAUSES|BLOCKS|ENABLES|CONFLICTS_WITH_EXPECTATION|REPEATS|COULD_TRANSFER_TO
provenance_anchor_ids: []
```

## Experience tension

```yaml
tension_id: T1
episode_ids: []
anchor_ids: []
expected: ""
observed: ""
current_explanation: ""
unexplained_residue: ""
why_it_matters: ""
```

## Experience opportunity / transfer gap

```yaml
opportunity_id: O1
source_episode_ids: []
target_episode_ids: []
anchor_ids: []
what_already_works: ""
where_it_is_not_being_transferred: ""
latent_relation: ""
desired_capability: ""
why_it_matters: ""
```

## Experience graph

```yaml
anchors: []
episodes: []
relations: []
tensions: []
opportunities: []
prior_attempts: []
what_failed: []
what_worked: []
what_worked_elsewhere: []
recurring_patterns: []
surprises: []
familiar_domains: []
explicit_skills_or_roles: []
user_metaphors: []
current_self_explanation: ""
desired_change: ""
desired_capability: ""
```

## AHA target

```yaml
current_frame: ""
target_mode: STUCKNESS|EXPECTATION_VIOLATION|CONTRADICTION|REPEATED_FRICTION|SUCCESS_PATTERN|OPPORTUNITY|CAPABILITY_GAP|TRANSFER_GAP|UNKNOWN
stuck_point_or_gap: ""
primary_tension_id: ""
primary_opportunity_id: ""
experience_anchor_ids: []
old_frame_prediction_or_default_move: ""
unexplained_residue_or_unused_strength: ""
desired_shift: ""
desired_capability: ""
```

## Atomic claim

```yaml
claim_id: C1
text: ""
epistemic_type: ""
provenance: ""
source_ids: []
status: UNKNOWN
assumptions: []
boundaries: []
contradictions: []
allowed_in_final: false
```

## Experience assertion

```yaml
assertion_id: XA1
text: ""
assertion_type: EXPERIENCE|EXPECTATION|ACTION|OUTCOME|INTERPRETATION|EMOTION_AS_REPORTED|SKILL_OR_ROLE|PREFERENCE_AS_REPORTED|DESIRED_CAPABILITY|OTHER
anchor_ids: []
episode_ids: []
fidelity_status: NOT_ASSESSED
```

## Eureka candidate

```yaml
candidate_id: E1
candidate_class: RIGHT_BISOCIATION_CANDIDATE|OTHER_EUREKA_CANDIDATE
initial_model: ""
aha_target_mode: ""
old_frame_blind_spot: ""
new_model: ""
discovery_route: ""
target_structure: ""
source_structure: ""
source_pool: P1_INTRA_PERSONAL|P2_FAMILIAR|P3_REMOTE|P4_CONTRASTIVE|NONE
relational_mapping: []
experience_anchor_ids: []
episode_ids: []
tension_ids: []
opportunity_ids: []
user_language_anchor: ""
collision_point: ""
story_reinterpretation: ""
anchor_coverage: []
counter_anchor_ids: []
hidden_mechanism_if_any: ""
old_frame_prediction_or_move: ""
new_prediction_or_move: ""
new_option: ""
micro_transfer: ""
self_transfer_prompt: ""
aha_potential: LOW|MEDIUM|HIGH
personal_fit_potential: LOW|MEDIUM|HIGH|UNKNOWN
novelty_to_user: UNKNOWN
evidence_status: UNVERIFIED
structural_status: UNVERIFIED
personal_fit_status: NOT_ASSESSED
reframe_gain_status: NOT_ASSESSED
recognition_status: UNKNOWN
transfer_status: NOT_TESTED
boundaries: []
defeaters: []
allowed_in_decision: false
```

## User recognition response

```yaml
candidate_id: E1
response: NO_CLICK|INTERESTING|CLICKS|STRONG_AHA|KNOWN_ALREADY|DOES_NOT_FIT|UNKNOWN
user_restatement: ""
anchor_that_clicked: ""
what_changed_in_their_view: ""
next_move_they_see: ""
self_transfer_example: ""
does_not_change_evidence_status: true
does_not_change_structural_status: true
```

## Transfer outcome

```yaml
candidate_id: E1
micro_transfer: ""
status: NOT_TESTED|TEST_PLANNED|TRANSFER_HELPED|TRANSFER_NO_CLEAR_EFFECT|TRANSFER_FAILED|OUTCOME_UNINTERPRETABLE
observed_outcome: ""
new_evidence_claim_ids: []
context_scope: ""
model_update: ""
does_not_automatically_validate_source_analogy: true
```

## Trusted claim

```yaml
claim_id: C1
approved_wording: ""
status: SUPPORTED
source_ids: []
independence_notes: ""
causal_status: ""
scope: ""
boundaries: []
allowed_in_final: true
```

## Final action / decision

```yaml
objective: ""
desired_capability: ""
decision_rule: ""
best_supported_action: ""
micro_transfer: ""
alternatives: []
surviving_models: []
key_unknowns: []
what_would_change_decision: []
evidence_status: ""
structural_status: ""
personal_fit_status: ""
recognition_status: ""
transfer_status: ""
```
