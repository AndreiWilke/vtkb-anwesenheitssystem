# ADR-0002: Serverlose AWS-Architektur

- Status: Accepted
- Datum: 2026-06-20

## Kontext

Die Nutzung ist klein und unregelmaessig. Dauerhaft laufende Infrastruktur wuerde Kosten und Betriebskomplexitaet ohne Nutzen erhoehen.

## Entscheidung

Die Zielarchitektur verwendet spaeter CloudFront/S3, Cognito, API Gateway HTTP API, Lambda, DynamoDB On-Demand, SQS und Rekognition in `eu-central-1`. Es gibt kein EC2, NAT Gateway, Aurora und keine SMS-Abhaengigkeit.

## Folgen

Kosten folgen weitgehend der Nutzung. Funktionen brauchen klare Timeouts, Parallelitaetsgrenzen, Logaufbewahrung und Fehlerwiederholung. Paket 0 stellt keine Cloudressourcen bereit.
