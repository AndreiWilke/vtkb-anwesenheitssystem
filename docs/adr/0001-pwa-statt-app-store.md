# ADR-0001: PWA statt App-Store-App

- Status: Accepted
- Datum: 2026-06-20

## Kontext

Trainer sollen das System ohne Store-Installation auf iOS und Android verwenden. Eine einzelne Web-Codebasis reduziert Pflege- und Verteilungsaufwand.

## Entscheidung

Das Frontend wird spaeter als responsive React/TypeScript-PWA mit Vite umgesetzt. Smartphone-Bedienung ist primaer; Desktop bleibt moeglich.

## Folgen

Store-Freigaben und native Doppelentwicklung entfallen. Kamera-, Installations- und Offlineverhalten muessen auf den Zielgeraeten explizit getestet werden.
