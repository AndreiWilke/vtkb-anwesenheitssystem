/**
 * Personenlogik: Normalisierung, Dublettenpruefung, ID-Generierung.
 *
 * Alle Funktionen sind zustandslos und rein berechenbar.
 */

// ---------------------------------------------------------------------------
// Normalisierung
// ---------------------------------------------------------------------------

/**
 * Normalisiert einen Namen fuer den Dubletten-Vergleich:
 * - Trim und Kleinbuchstaben
 * - Wiederholte Leerzeichen zu einem
 * - Deutsche Umlaute und Sonderzeichen konsistent behandeln
 */
export function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

// ---------------------------------------------------------------------------
// Dublettenpruefung
// ---------------------------------------------------------------------------

export interface PersonForDuplicateCheck {
  id: string;
  firstName: string;
  lastName: string;
  birthYear: number;
}

export interface DuplicateCheckResult {
  hasProbableDuplicate: boolean;
  matches: PersonForDuplicateCheck[];
}

/**
 * Prueft normalisiert auf wahrscheinliche Dubletten.
 * Eine Dublette liegt vor, wenn Vorname, Nachname UND Geburtsjahr uebereinstimmen.
 *
 * Trainer und Assistenztrainer duerfen eine erkannte Dublette nicht einfach umgehen.
 * Nur der Vorstand darf nach zusaetzlicher Bestaetigung eine bewusste Neuanlage
 * durchfuehren.
 */
export function checkForDuplicates(
  candidate: { firstName: string; lastName: string; birthYear: number },
  existingPersons: readonly PersonForDuplicateCheck[],
): DuplicateCheckResult {
  const normalFirst = normalizeName(candidate.firstName);
  const normalLast = normalizeName(candidate.lastName);

  const matches = existingPersons.filter((person) => {
    return (
      normalizeName(person.firstName) === normalFirst &&
      normalizeName(person.lastName) === normalLast &&
      person.birthYear === candidate.birthYear
    );
  });

  return {
    hasProbableDuplicate: matches.length > 0,
    matches,
  };
}

// ---------------------------------------------------------------------------
// ID-Generatoren (kollisionssicher, keine array.length-Ableitung)
// ---------------------------------------------------------------------------

export function createPersonIdGenerator(existingIds: readonly string[]): () => string {
  const issued = new Set(existingIds);
  let seq = 1;
  return () => {
    let candidate = `person-${String(seq).padStart(4, "0")}`;
    while (issued.has(candidate)) {
      seq += 1;
      candidate = `person-${String(seq).padStart(4, "0")}`;
    }
    issued.add(candidate);
    seq += 1;
    return candidate;
  };
}

export function createMemberNumberGenerator(
  existingNumbers: readonly string[],
): () => string {
  const issued = new Set(existingNumbers);
  let seq = 1001;
  return () => {
    let candidate = `M-${seq}`;
    while (issued.has(candidate)) {
      seq += 1;
      candidate = `M-${seq}`;
    }
    issued.add(candidate);
    seq += 1;
    return candidate;
  };
}
