# ADR-0007: Temporaere Bilder mit Sofort- und Fallback-Loeschung

- Status: Accepted
- Datum: 2026-06-20

## Kontext

Gruppenbilder und Gesichtsausschnitte sind besonders schutzbeduerftig und fuer den Anwesenheitsnachweis nach der Trainerentscheidung nicht erforderlich. Abbrueche duerfen keine Restbilder hinterlassen.

## Entscheidung

Spaetere Gruppenbilder werden privat und kurzlebig gespeichert. Gesichtsausschnitte bleiben nur temporaer. Nach Bestaetigung oder bewusstem Abbruch erfolgt eine explizite Sofortloeschung; ein unabhaengiger Cleanup entfernt verwaiste Artefakte nach kurzer Frist.

## Folgen

Loeschung wird als eigener fachlicher Ablauf automatisiert getestet und ueberwacht. Bildbytes, Objektpfade mit Personenbezug und Aehnlichkeitslisten duerfen nicht in Logs gelangen.
