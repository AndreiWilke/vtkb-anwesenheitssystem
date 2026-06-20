# ADR-0006: Eine Anwesenheit und eine Funktion je Einheit

- Status: Accepted
- Datum: 2026-06-20

## Kontext

Eine qualifizierte Person kann je Einheit verantwortlicher Trainer, Assistenztrainer oder normaler Teilnehmer sein. Getrennte Anwesenheits- und Trainerlisten wuerden Doppelzaehlungen ermoeglichen.

## Entscheidung

Pro Mitglied und Einheit existiert genau ein Anwesenheitsdatensatz. Bei `PRESENT` traegt er genau eine Funktion: `RESPONSIBLE_TRAINER`, `ASSISTANT_TRAINER` oder `PARTICIPANT`. Bei `ABSENT` gibt es keine Funktion. Jede abgeschlossene Einheit hat genau einen verantwortlichen Trainer.

## Folgen

Statistiken zaehlen Personen genau einmal. Dauerhafte Qualifikation bleibt getrennt von der heutigen Funktion. Die Invarianten werden zentral validiert und spaeter atomar persistiert.
