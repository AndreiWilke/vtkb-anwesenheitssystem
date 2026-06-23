# VTKB Anwesenheitssystem - Codex-2-Reviewprompt

Prüfe das aktuelle Repository des Projekts **„VTKB Digitales Anwesenheitssystem“** ausschließlich lesend. Nimm keine Änderungen vor, erstelle keine Commits und führe keine Cloudaktionen aus.

## Prüfauftrag

Bewerte mindestens:

1. Übereinstimmung mit `PROJECT_RULES.md`, `README.md` und den Architecture Decision Records.
2. Fachliche Rollenlogik:
   - genau ein verantwortlicher Trainer je abgeschlossener Einheit,
   - mehrere Assistenztrainer möglich,
   - dauerhafte Qualifikation getrennt von der heutigen Funktion,
   - genau eine Anwesenheit pro Person und Einheit,
   - keine Doppelzählung als Trainer und Teilnehmer,
   - dauerhafte Probetrainingprofile ohne biometrisches Enrollment.
3. Datenschutz-by-Design:
   - keine echten Mitglieds- oder Kinderdaten,
   - keine unnötigen Logs,
   - vollständige manuelle Alternative,
   - vorgesehene Sofortlöschung und Cleanup-Fallback,
   - kein automatisches Lernen aus Trainerkorrekturen.
4. AWS- und Kostenrisiken:
   - kein NAT Gateway,
   - keine EC2- oder Aurora-Grundkosten,
   - keine SMS-Abhängigkeit,
   - begrenzte Logaufbewahrung,
   - keine unkontrollierte Parallelität oder Bildspeicherung.
5. Sicherheit:
   - Backend-Autorisierung statt bloßer Frontend-Prüfung,
   - Least-Privilege-IAM,
   - private Buckets,
   - Presigned-URL-Grenzen,
   - keine Secrets im Repository,
   - keine sensiblen Bild- oder Ähnlichkeitsdaten in Logs.
6. Testabdeckung und reproduzierbare lokale Befehle.
7. UI-Konsistenz und Smartphone-Nutzbarkeit.
8. Abweichungen zwischen Implementierung, Architektur und Machbarkeitsstudie.

## Ausgabeformat

Erstelle einen Review-Bericht mit den Prioritäten:

- `BLOCKER`
- `HOCH`
- `MITTEL`
- `NIEDRIG`

Für jeden Befund:

- Datei und genaue Stelle,
- verletzte Regel oder Anforderung,
- technische beziehungsweise fachliche Auswirkung,
- konkrete Korrekturempfehlung,
- empfohlener Test zum Nachweis der Korrektur.

Wenn keine Befunde vorliegen, bestätige ausdrücklich, welche Prüfungen und Befehle durchgeführt wurden. Verändere keine Datei und **STOPPE** nach dem Bericht.
