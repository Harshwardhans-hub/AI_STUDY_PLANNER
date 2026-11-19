# Study Plan Generation Input Rules

The plan-generation endpoint validates the requested workload before contacting the AI provider.

| Field | Default when omitted or null | Accepted range |
| --- | --- | --- |
| `hours_per_day` | `4.0` | Greater than 0 and at most 24; finite number |
| `days` | `14` | Integer from 1 through 365 |

Invalid values return a client error (HTTP 400) with a validation message. The endpoint does not call the Gemini service when these parameters are invalid.

Examples:

Valid:

```json
{"hours_per_day": 3.5, "days": 21}
```

Invalid:

```json
{"hours_per_day": 0, "days": 14}
```

```json
{"hours_per_day": 5, "days": 500}
```

The checks protect the generation endpoint against malformed, non-finite, or unreasonable workload values. The validation helper is separately unit-tested in `tests/test_plan_validation.py`.
