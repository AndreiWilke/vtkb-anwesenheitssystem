# ADR-0003: DynamoDB statt relationaler Datenbank

- Status: Accepted
- Datum: 2026-06-20

## Kontext

Mitglieder, Vorlagen, Einheiten und Anwesenheiten haben geringe Datenmengen und vorhersehbare Zugriffsmuster. Eine relationale Dauerressource waere fuer den erwarteten Betrieb unverhaeltnismaessig.

## Entscheidung

Spaetere persistente Daten werden in DynamoDB On-Demand modelliert. Zugriffsmuster, Schluessel und Nebenindizes werden vor Paket 3 dokumentiert.

## Folgen

Fachliche Invarianten muessen in der Geschaeftslogik und mit bedingten beziehungsweise transaktionalen Schreibvorgaengen abgesichert werden. Ad-hoc-SQL steht nicht zur Verfuegung.
