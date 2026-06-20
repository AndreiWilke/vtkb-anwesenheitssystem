# Web-Prototyp · Paket 1

Lokaler, klickbarer Smartphone-first-Prototyp mit React, TypeScript und Vite. Sämtliche Personen- und Trainingsdaten sind fiktive Mockdaten.

```powershell
npm ci
npm run dev --workspace @vtkb/web
```

Der Prototyp bietet eine vollständige manuelle Anwesenheitserfassung und eine ausdrücklich gekennzeichnete Fotoassistenz-Simulation. Die Simulation verwendet weder Kamera noch Bilder, Uploads, biometrische Verarbeitung oder externe Dienste. Persistenz, Login, Backend, AWS und Rekognition sind nicht implementiert.

Tests und Build werden vom Repository-Stamm gestartet:

```powershell
npm test
npm run build
```
