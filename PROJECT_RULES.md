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
- Die Bildanalyse darf ausschliesslich eine sichtbare Guertelfarbe als unverbindlichen Pruefhinweis vorschlagen.
- Die Bildanalyse darf niemals automatisch Stammdaten aendern.
- Sie darf niemals einen Kyu- oder Dan-Grad bestimmen oder das Bestehen einer Pruefung feststellen.
- Die endgueltige Aenderung von Guertelfarbe und Guertelgrad erfolgt ausschliesslich nach ausdruecklicher Bestaetigung durch einen berechtigten Trainer, Assistenztrainer oder Vorstand.
- Jede bestaetigte Guertelaenderung erzeugt einen Historieneintrag und einen Audit-Eintrag.
- Gaeste und Probetrainingsteilnehmer werden nicht biometrisch identifiziert; ein Bildvorschlag darf bei ihnen keiner Person automatisch zugeordnet werden.

## Fachliche Invarianten fuer Personen und Probetraining (ab Paket 1.2)

- Ein Probetrainingsteilnehmer besitzt ein dauerhaftes lokales Profil.
- Es stehen grundsaetzlich vier kostenlose, tatsaechlich besuchte Probetrainings zur Verfuegung.
- Als Probetraining zaehlt ausschliesslich: `PersonMembershipStatus.TRIAL`, `PresenceStatus.PRESENT` in einer `TrainingSessionStatus.COMPLETED`-Einheit.
- Abwesenheit, Abbruch oder stornierte Einheiten zaehlen nicht; doppelte Anwesenheit zaehlt nur einmal.
- Tagesgaeste zaehlen nicht als Probetrainingsteilnehmer.
- Der Zaehler besuchter Probetrainings wird aus der Anwesenheitshistorie berechnet, nie als frei aenderbares Feld gespeichert.
- Nach dem vierten besuchten Probetraining ist fuer weitere Teilnahme mindestens eines erforderlich: Vertragsstatus RECEIVED, aktives Mitglied oder eine begruendete Vorstandsausnahme.
- Die Vorstandsausnahme erlaubt genau eine zusaetzliche Einheit und erzeugt einen Audit-Eintrag.
- Die Umwandlung zum Mitglied erhaelt Personen-ID, Probetrainingsteilnahmen, den gesamten Anwesenheitsverlauf, Guerteldaten, Guertelhistorie, Auditverlauf und interne Bemerkungen.
- Personen ohne Mitgliedschaft werden ausschließlich als dauerhafte Probetrainingprofile geführt.
- Keine biometrische Registrierung von Gaesten oder Probetrainingsteilnehmern.

## Grenzen von Paket 0

- Keine AWS-Ressourcen oder deploybaren Terraform-Ressourcen.
- Kein Cognito-Login, Datenbankzugriff, Foto-Upload oder Rekognition-Aufruf.
- Keine echte Offline-Synchronisation.
- Paket 1 beginnt erst nach einer getrennten ausdruecklichen Freigabe.

## Fachliche Invarianten fuer Auswertung und Aufwandsentschaedigung

- Auswertungen verwenden nur tatsaechlich gespeicherte Anwesenheiten; ohne festen Kader werden weder Fehlzeiten noch Anwesenheitsquoten abgeleitet.
- Fuer die Verguetung gilt ausschliesslich die Funktion in der abgeschlossenen Trainingseinheit, niemals die dauerhafte Qualifikation.
- Geldbetraege werden als ganze Centwerte berechnet.
- Fehlt fuer einen abrechnungsfaehigen Einsatz ein gueltiger aktiver Verguetungssatz, entsteht ein Pruefhinweis und keine stillschweigende Nullabrechnung.
- Freigegebene und bezahlte Abrechnungen beruhen auf einem unveraenderlichen Snapshot; spaetere Satz- oder Korrekturaenderungen wirken nicht rueckwirkend.
- Manuelle Korrekturen bleiben getrennt von der automatischen Grundverguetung und benoetigen eine Begruendung.
