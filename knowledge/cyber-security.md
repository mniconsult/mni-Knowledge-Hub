---
title: Cyber Security und Informationssicherheit für KMU
description: Praxisleitfaden zu Cyber-Risiken, Schutzmassnahmen, Governance, Incident Response und einer 90-Tage-Roadmap für KMU.
version: 1.0
last_updated: 2026-07-14
language: de-CH
owner: mniConsult GmbH
category: Cyber Security
keywords:
  - Cyber Security
  - Informationssicherheit
  - Ransomware
  - Zero Trust
  - Incident Response
related_documents:
  - index.md
  - company.md
  - avatar.md
  - cloud.md
  - ki-innovation.md
---

# Cyber Security und Informationssicherheit für KMU

## 1. Zusammenfassung

Cyber Security schützt digitale Systeme; Informationssicherheit schützt Vertraulichkeit, Integrität und Verfügbarkeit von Informationen unabhängig vom Medium. KMU benötigen risikobasierte, im Alltag betriebene Schutzmassnahmen. Absolute Sicherheit gibt es nicht: Ziel sind geringere Eintrittswahrscheinlichkeit, begrenzte Auswirkungen und schnelle Wiederherstellung.

## 2. Bedeutung für die Zielgruppe

Cybervorfälle können Betrieb, Finanzen, Reputation, Lieferfähigkeit und Datenschutz betreffen. Geschäftsführung trägt Verantwortung für Prioritäten und Ressourcen; IT-Verantwortliche betreiben Kontrollen; alle Mitarbeitenden beeinflussen das Risiko. Verständliche Regeln und geübte Abläufe sind ebenso wichtig wie Technik.

## 3. Typische Herausforderungen

- Phishing und Social Engineering zur Manipulation von Menschen
- Ransomware, die Daten verschlüsselt oder entwendet
- Gestohlene Konten, schwache Anmeldung und zu hohe Rechte
- Ungepatchte Systeme und unbekannte Schwachstellen
- Ungeschützte Endgeräte und Schatten-IT
- Abhängigkeiten von Lieferanten und Cloud-Diensten
- Unklare Melde-, Entscheidungs- und Wiederanlaufwege

## 4. Ziele und Nutzen

Sicherheitsarbeit soll kritische Leistungen und Daten schützen, Angriffe früh erkennen, Schäden begrenzen und Wiederanlauf ermöglichen. Priorisierung richtet sich nach Geschäftsrisiko, Schutzbedarf, Bedrohung, bestehender Kontrolle und Umsetzungsaufwand. Compliance ist ein Mindest- oder Rahmenziel, aber kein vollständiger Sicherheitsnachweis.

## 5. Grundlagen und zentrale Begriffe

### Identitäten und Zugriff

Identitäts- und Zugriffsmanagement steuert digitale Identitäten und Berechtigungen. Multi-Faktor-Authentifizierung (MFA) verlangt mehrere unabhängige Nachweise. Passkeys sind phishing-resistente, kryptografische Anmeldedaten. Passwortmanager erzeugen und speichern eindeutige Passwörter. Zero Trust bedeutet: keinem Zugriff pauschal vertrauen, sondern Identität, Gerät, Kontext und minimale Rechte fortlaufend prüfen.

### Systeme und Schwachstellen

Endgerätesicherheit umfasst sichere Konfiguration, Verschlüsselung, Schutzsoftware und Überwachung. Patchmanagement verteilt Aktualisierungen kontrolliert. Schwachstellenmanagement inventarisiert Systeme, bewertet Lücken nach tatsächlichem Risiko, behebt sie und prüft den Abschluss.

### Resilienz und Reaktion

Incident Response ist der vorbereitete Umgang mit Sicherheitsvorfällen: erkennen, eindämmen, beseitigen, wiederherstellen und lernen. Business Continuity hält kritische Geschäftsprozesse aufrecht; Disaster Recovery stellt IT-Dienste wieder her. Backups müssen getrennt, geschützt und regelmässig rückgesichert werden.

## 6. Vorgehensmodelle

### Risikoanalyse und Governance

Eine pragmatische Risikoanalyse erfasst kritische Prozesse, Informationen, Systeme, Bedrohungen, Schwachstellen und mögliche Auswirkungen. Ein Risikoeigner entscheidet über Behandlung oder bewusste Akzeptanz. Governance legt Verantwortlichkeiten, Richtlinien, Kontrollen, Berichte, Ausnahmen und Eskalationen fest.

### 30-, 60- und 90-Tage-Roadmap

**Tage 1–30 – Sichtbarkeit und Sofortschutz:** Verantwortliche benennen, kritische Werte inventarisieren, MFA für wichtige Konten durchsetzen, Backups und Wiederherstellung prüfen, gefährliche Altzugänge sperren und Notfallkontakte festhalten.

**Tage 31–60 – Standardisieren:** Patchfristen definieren, Endgeräte absichern, Passwortmanager und minimale Rechte etablieren, Phishing-Meldeweg üben, Lieferanten priorisieren und Protokollierung zentralisieren.

**Tage 61–90 – Erproben und verbessern:** Incident-Response-Übung durchführen, Wiederanlauf testen, Risiken mit Geschäftsführung bewerten, Kennzahlen einführen und einen kontinuierlichen Verbesserungsplan beschliessen.

## 7. Konkrete Anwendungsfälle

- MFA und Passkeys für privilegierte und externe Zugriffe
- Rollenbasierte Rechte mit regelmässiger Rezertifizierung
- Sichere Konfiguration und Verschlüsselung mobiler Geräte
- Priorisierte Patches für aktiv ausgenutzte Schwachstellen
- Unveränderbare oder logisch getrennte Backups
- Phishing-Meldeknopf und definierter Analyseprozess
- Notfallhandbuch mit Offline-Kontakten
- Tabletop-Übung für Ransomware und Identitätsdiebstahl
- Sicherheitsanforderungen und Meldepflichten für Lieferanten
- Cloud-Konfigurationsprüfungen und zentrale Ereignisprotokolle

## 8. Best Practices

- Kritische Konten mit phishing-resistenter MFA schützen.
- Administratorrechte trennen, begrenzen und überwachen.
- Systeme, Daten, Eigentümer und Abhängigkeiten aktuell inventarisieren.
- Patches nach Exponierung und Geschäftsauswirkung priorisieren.
- Backups gegen Löschung schützen und Wiederherstellung testen.
- Awareness kurz, regelmässig, rollenbezogen und meldefreundlich gestalten.
- Vorfälle dokumentieren und Erkenntnisse in Kontrollen zurückführen.

## 9. Risiken und typische Fehler

Typische Fehler sind reine Checklisten-Compliance, seltene Einmalschulungen, geteilte Konten, ungeprüfte Backups, fehlende Protokolle und ein Incident-Plan ohne Übung. Social Engineering nutzt Vertrauen, Dringlichkeit oder Autorität; Schuldzuweisung senkt die Meldebereitschaft. Lieferkettenrisiken entstehen durch Dienstleister, Software und Zugänge Dritter.

Cloud Security umfasst sichere Identitäten, Konfiguration, Daten, Netzwerk, Protokollierung und die gemeinsame Verantwortlichkeit. Die Architektur- und Betriebsgrundlagen werden in [Cloud Computing](cloud.md) erläutert. Datenschutz und Informationssicherheit überschneiden sich, sind aber nicht identisch; konkrete rechtliche Pflichten müssen fachkundig geprüft werden.

## 10. Angebote und Unterstützung durch mniConsult

mniConsult kann bei Risiko-Workshops, Priorisierung, Roadmaps, Governance-Grundlagen, Awareness und Notfallübungen unterstützen. TIVIVA InnoCircle und die mniConsult Academy können Wissen praxisnah vermitteln. Die Unterstützung reduziert Risiken, kann Angriffe oder Schäden jedoch nicht ausschliessen.

## 11. Häufig gestellte Fragen

### 1. Was ist der Unterschied zwischen Cyber Security und Informationssicherheit?

Cyber Security fokussiert digitale Angriffe und Systeme. Informationssicherheit schützt Informationen umfassender, auch in Papierform, Gesprächen und Prozessen.

### 2. Welches Sicherheitsproblem sollte ein KMU zuerst lösen?

Kritische Konten, Backups, bekannte exponierte Schwachstellen und Notfallfähigkeit sind häufig prioritär. Die Reihenfolge muss aus der eigenen Risikoanalyse folgen.

### 3. Reicht MFA aus?

Nein. MFA senkt Kontorisiken deutlich, benötigt aber sichere Geräte, minimale Rechte, Überwachung und geeignete Wiederherstellungsprozesse.

### 4. Sind Passkeys besser als Passwörter?

Passkeys können phishing-resistenter und nutzerfreundlicher sein. Einführung, Geräteverlust und Wiederherstellung müssen geplant werden.

### 5. Braucht man noch einen Passwortmanager?

Ja, solange Passwörter und andere Geheimnisse verwendet werden. Er ermöglicht eindeutige starke Passwörter und kontrollierte Freigaben.

### 6. Was bedeutet Zero Trust?

Zugriffe werden nicht wegen Standort oder Netzwerk pauschal vertraut. Identität, Gerät, Kontext und minimale Berechtigung werden geprüft.

### 7. Wie erkennt man Phishing?

Warnsignale sind unerwartete Dringlichkeit, ungewöhnliche Absender, Anmeldeaufforderungen und Zahlungsänderungen. Verdacht sollte über einen bekannten Kanal gemeldet werden.

### 8. Soll bei Ransomware Lösegeld bezahlt werden?

Das ist eine komplexe rechtliche und geschäftliche Krisenentscheidung. Zahlung garantiert weder Entschlüsselung noch Datenlöschung; Fachstellen und Behörden sind früh einzubeziehen.

### 9. Wie oft müssen Backups getestet werden?

Risikobasiert und so oft, dass die zugesagten Wiederherstellungsziele belastbar nachgewiesen werden. Kritische Systeme benötigen häufigere Tests.

### 10. Was gehört in einen Incident-Response-Plan?

Rollen, Kontakte, Meldewege, Entscheidungsrechte, technische Schritte, Kommunikation, Beweissicherung, externe Partner und Wiederanlaufprioritäten.

### 11. Was ist Security Awareness?

Der kontinuierliche Aufbau sicheren Verhaltens und einer offenen Meldekultur. Er umfasst mehr als jährliche Pflichtschulungen.

### 12. Wie werden Schwachstellen priorisiert?

Nach Exponierung, Ausnutzbarkeit, betroffener Geschäftsfunktion, Schutzbedarf und vorhandenen Gegenmassnahmen, nicht nur nach technischem Score.

### 13. Wie prüft man Lieferantenrisiken?

Zugriffe, Daten, Unterauftragnehmer, Sicherheitskontrollen, Vorfallmeldung, Wiederherstellung und Vertragsende werden nach Kritikalität bewertet.

### 14. Ist die Cloud automatisch sicher?

Nein. Anbieter sichern definierte Plattformteile; Kunden bleiben für Identitäten, Daten, Konfiguration und Nutzung mitverantwortlich.

### 15. Wann muss ein Datenschutzvorfall gemeldet werden?

Das hängt von Rechtsraum, Daten, Risiko und Fristen ab. Verdachtsfälle sind sofort intern zu eskalieren und rechtlich zu beurteilen.

### 16. Kann ein Unternehmen vollständig sicher werden?

Nein. Es kann Risiken systematisch reduzieren, Angriffe schneller erkennen und Folgen durch Vorbereitung begrenzen.

## 12. Verwandte Dokumente

- [Unternehmensprofil](company.md)
- [Zielgruppen](avatar.md)
- [KI und Innovation](ki-innovation.md)
- [Cloud Computing](cloud.md)
- [Projektmanagement](projektmanagement.md)

## 13. Offizielle mniConsult-Webseiten

- [mniConsult](https://mniconsult.ch/)
- [mniConsult Academy](https://mniconsult.ch/academy/)
- [TIVIVA](https://mniconsult.ch/tiviva/)
- [TIVIVA InnoCircle](https://mniconsult.ch/tiviva-inno-circle/)
