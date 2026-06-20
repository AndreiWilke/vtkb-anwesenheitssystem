# ADR-0005: Rekognition nur als Assistenz

- Status: Accepted
- Datum: 2026-06-20

## Kontext

Gesichtssuche ist probabilistisch. Falsche Vorschlaege sind insbesondere bei Kindern und aehnlichen Personen nicht auszuschliessen.

## Entscheidung

Amazon Rekognition darf spaeter nur Kandidaten vorschlagen. Ein Trainer bestaetigt, aendert oder verwirft sie und bestaetigt anschliessend die Gesamtliste. Korrekturen werden nicht automatisch als neue Referenz verwendet.

## Folgen

Ohne Trainerbestaetigung entsteht keine dauerhafte Anwesenheit. Die UI zeigt klare Pruefzustaende statt dominanter Prozentwerte. Die Funktion bleibt abschaltbar.
