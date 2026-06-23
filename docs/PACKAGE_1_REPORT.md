# Paket 1 – UX-Prototyp und Korrekturstand

## Umfang

Der lokale React-Prototyp bildet den vollständigen Anwesenheitsablauf mit fiktiven Daten ab:

- Start und Auswahl einer Trainingseinheit,
- genau ein verantwortlicher Trainer und mehrere Assistenztrainer,
- manuelle Erfassung sowie Fotoassistenz-Demo ohne Kamera oder Bildverarbeitung,
- Trainerprüfung vor dem Speichern,
- dauerhafte Probetrainingprofile mit Teilnahmegrenze,
- Mitglieder-, Trainer-, Gürtel- und Vergütungsauswertungen,
- vollständige nachträgliche Erstellung vergangener Einheiten,
- Laufzeit-Historie und Audit.

## Fotoassistenz

Unbekannte Vorschläge können einem bestehenden Mitglied zugeordnet, als unbekannt markiert,
verworfen oder später manuell geprüft werden. Die Demo erzeugt keine neuen Personenprofile und
keine biometrischen Daten. Jede Entscheidung bleibt bis zum Abschluss änderbar.

## Personenmodell

Probetrainingsteilnehmer besitzen dauerhafte `TrialParticipant`-Profile. Dieselbe Personen-ID
bleibt bei einer Umwandlung zum Mitglied erhalten; die Mitgliedsnummer wird separat ergänzt.
Anwesenheits-, Probetraining- und Gürtelhistorie bleiben dadurch derselben Person zugeordnet.

## Nachtragseinheiten

Der Vorstand kann eine vergangene Einheit mit Datum, Zeit, Bezeichnung, Trainingsart, Dojo,
Trainingsleitung, Anwesenheit, Pflichtgrund und optionaler Notiz vollständig erstellen. Rollen,
Zeitspanne, Vergangenheit, Dubletten und Probetraininggrenze werden geprüft. Der Abschluss fließt
in Historie, Auswertung, Vergütung, Exporte und Audit ein.

## Datenschutz und Demo-Grenzen

- ausschließlich fiktive Namen und lokale Mockdaten,
- kein Kamerazugriff,
- keine Gesichtserkennung,
- keine Referenzbilder oder biometrischen Enrollment-Daten,
- keine Cloud-, AWS- oder Deployment-Aktion.

## Qualität

Die jeweils tatsächlich ausgeführten Prüfungen und Ergebnisse werden im Abschlussbericht des
zugehörigen Arbeitsbranches dokumentiert. Historische Screenshots sind keine fachliche Quelle;
maßgeblich sind der aktuelle Code, die automatisierten Tests und die Browser-QA.
