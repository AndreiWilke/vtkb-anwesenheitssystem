# Verbindliche Projektregeln

## Arbeitsbereich und Freigaben

- Der bestaetigte Projektordner ist `C:\Users\andre\OneDrive\Documents\Privat\VTKB\Anwesenheit`.
- Pro Auftrag wird nur das ausdruecklich freigegebene Arbeitspaket bearbeitet.
- Vor Aenderungen werden Bestand und Auswirkungen geprueft und ein kurzer Plan genannt.
- Nach jedem Paket werden Tests, Aenderungen, Annahmen und offene Punkte berichtet. Danach wird gestoppt.
- Bestehende Dateien werden nicht blind ueberschrieben. Unklare oder kollidierende Anforderungen werden vor einer irreversiblen Entscheidung geklaert.

## Cloud- und Kostenstopp

- Kein `terraform apply`, kein AWS-Deployment und keine kostenpflichtige Cloudaktion ohne gesonderte ausdrueckliche Freigabe.
- Keine Loeschung oder Migration produktiver Daten, keine Domain- oder DNS-Aenderung und keine Rotation produktiver Zugangsdaten ohne gesonderte Freigabe.
- Zielregion ist spaeter `eu-central-1`.
- Keine EC2-Instanz, kein NAT Gateway, keine Aurora-Dauerressource, keine provisionierte Dauerkapazitaet und keine SMS-Abhaengigkeit.

## Datenschutz und Testdaten

- Keine echten Mitgliedsdaten, Namen realer Kinder, Kinderbilder oder biometrischen Daten im Repository, in Tests oder Logs.
- Ausschliesslich eindeutig fiktive Mockdaten und neutrale Platzhalterbilder verwenden.
- Namentlich gekennzeichnete Projekturheber in Governance- und Planungsunterlagen gelten als Dokumentprovenienz, nicht als Mock- oder Testdaten.
- Eine Fotoerlaubnis ist keine biometrische Einwilligung.
- Das Fachmodell `BiometricConsent` bezieht sich ausschliesslich auf biometrische Identifizierung zur Anwesenheitserfassung und nie auf eine allgemeine Fotoerlaubnis.
- Gesichtserkennung bleibt optional und darf nur Vorschlaege liefern. Die endgueltige Entscheidung trifft ein berechtigter Trainer.
- Die manuelle Erfassung muss vollstaendig, gleichwertig und ohne Benachteiligung funktionieren.
- Gruppenbilder und temporaere Gesichtsausschnitte sind spaeter nach Bestaetigung sofort zu loeschen; ein Cleanup-Fallback muss Abbrueche abdecken.
- Trainerkorrekturen duerfen nicht automatisch zu neuen biometrischen Referenzen oder Trainingsdaten werden.
- Keine sensiblen Bilder, Bildbytes, Aehnlichkeitslisten oder vollstaendigen Personendaten in Anwendungslogs.

## Fachliche Invarianten

- Es gibt keinen festen Kader. Alle aktiven Mitglieder koennen grundsaetzlich an allen Einheiten teilnehmen.
- Eine Einheit wird anhand von Datum, Uhrzeit und Dojo vorgeschlagen; die Auswahl bleibt aenderbar.
- Pro abgeschlossener Einheit gibt es genau einen verantwortlichen Trainer und null bis mehrere Assistenztrainer.
- Dauerhafte Qualifikation und Funktion in einer konkreten Einheit sind getrennt.
- Pro Person und Einheit gibt es genau einen Anwesenheitsdatensatz.
- Trainer- und Assistenzfunktion implizieren Anwesenheit und fuehren nie zu einer Doppelzaehlung als Teilnehmer.
- Dauerhafter Anwesenheitsstatus ist `PRESENT` oder `ABSENT`.
- Gaeste und Probetrainingsteilnehmer werden manuell erfasst und nie biometrisch aufgenommen.
- Trainer und Assistenztrainer duerfen aktuelle Einheiten erfassen. Aeltere Korrekturen erfordern eine besonders berechtigte Vorstand-/Administratorrolle und ein Auditprotokoll.
- Guertelfarbe und Guertelgrad stammen aus Mitgliederstammdaten, nicht aus Bilderkennung.

## Grenzen von Paket 0

- Keine AWS-Ressourcen oder deploybaren Terraform-Ressourcen.
- Kein Cognito-Login, Datenbankzugriff, Foto-Upload oder Rekognition-Aufruf.
- Keine echte Offline-Synchronisation.
- Paket 1 beginnt erst nach einer getrennten ausdruecklichen Freigabe.
