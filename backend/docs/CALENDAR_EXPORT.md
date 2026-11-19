# Calendar export behavior

The backend offers two low-friction calendar integrations:

- A Google Calendar pre-filled event URL, which opens an event form in the user's browser. It does not grant the application access to the user's calendar.
- An iCalendar text export (`.ics`), which can be imported into compatible calendar applications.

## Current formatting behavior

The export helper accepts Python `datetime` instances or ISO-format datetime strings. The current implementation writes the date/time components as floating local times; it does not attach a timezone identifier or convert between time zones. Consumers should therefore interpret exported times in the intended local context.

Text values are escaped for iCalendar's TEXT property rules: backslashes, commas, semicolons, and line breaks.

## Regression tests

Run from the `backend` directory:

```bash
python -m unittest tests.test_calendar_service tests.test_ics_text_escaping -v
```

The tests cover URL query encoding, empty calendars, datetime and ISO-string event values, and text escaping. A future timezone-aware implementation should add explicit tests for UTC offsets, daylight-saving transitions, and all-day events before changing the current output contract.
