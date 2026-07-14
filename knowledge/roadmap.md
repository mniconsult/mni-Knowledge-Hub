---
title: Roadmap der mniConsult Knowledge Base
description: Stand, geplante Ausbaustufen, Qualitätsziele und Governance der mniConsult Knowledge Base.
version: 1.0
last_updated: 2026-07-14
language: de-CH
owner: mniConsult GmbH
category: Roadmap und Governance
keywords:
  - Roadmap
  - Knowledge Base
  - RAG
  - Governance
  - Qualitätsmanagement
related_documents:
  - index.md
  - ../README.md
  - services.md
  - usecases.md
  - glossary.md
  - faq.md
---

# Roadmap der mniConsult Knowledge Base

## 1. Zusammenfassung

Die Roadmap beschreibt die schrittweise Entwicklung der mniConsult Knowledge Base von einem dokumentierten Fundament zu einer gepflegten, zitierbaren und KI-gestützten Wissensplattform. Sie nennt Richtungen und Qualitätsbedingungen, aber keine festen Termine oder Lieferverpflichtungen.

## 2. Zweck der Roadmap

Die Roadmap schafft Transparenz über vorhandene Inhalte, nächste Ausbaustufen, Abhängigkeiten und Qualitätsanforderungen. Sie unterstützt Priorisierung und verhindert, dass Automatisierung vor Quellenqualität, Struktur und Verantwortung eingeführt wird.

## 3. Aktueller Stand

Phase 1 bis Phase 5 sind in diesem lokalen Repository inhaltlich abgeschlossen. Phase 5 gilt erst nach Review, Commit und gewünschter Veröffentlichung als freigegeben. Die späteren Phasen sind geplant und noch nicht als umgesetzt zu verstehen.

## 4. Phase 1 – Fundament

**Status: abgeschlossen.** Erstellt wurden Repository-Dokumentation, KI-Einstiegspunkt, zentraler Index, [Unternehmensprofil](company.md) und [Zielgruppen](avatar.md). Einheitliches Frontmatter und relative Links bilden die Basis.

## 5. Phase 2 – Fachwissen

**Status: abgeschlossen.** Die Fachtexte zu [KI und Innovation](ki-innovation.md), [Cloud Computing](cloud.md), [Cyber Security](cyber-security.md), [Projektmanagement](projektmanagement.md) und [Microsoft Project](microsoft-project.md) wurden aufgebaut.

## 6. Phase 3 – NewLifeVision

**Status: abgeschlossen.** [NewLifeVision](newlifevision.md) dokumentiert Persönlichkeitsentwicklung, Fokus, Regeneration, Resilienz, Selbstführung und Zukunftsgestaltung mit klarer medizinischer Abgrenzung.

## 7. Phase 4 – Academy und Content

**Status: abgeschlossen.** Die [mniConsult Academy](academy.md), [Podcasts](podcasts.md) und der [Blog](blog.md) beschreiben Lern-, Audio- und redaktionelle Inhaltswelten ohne erfundene Veröffentlichungen oder Preise.

## 8. Phase 5 – Referenzwissen

**Status: abgeschlossen, Review ausstehend.** [Services](services.md), [Use Cases](usecases.md), [Glossar](glossary.md), [FAQ](faq.md) und diese Roadmap schaffen zentrale Referenz- und Umsetzungshilfen.

## 9. Phase 6 – Quellen und Content-Import

Geplant sind `sources/` für Originalquellen sowie geordnete Bereiche wie `courses/`, `podcasts/`, `blog/`, `faq/` und `glossary/`. Ein Quellen- und Zitationskonzept soll Herkunft, Rechte, Aktualität, Extraktion und Rückverfolgbarkeit festlegen.

Importe benötigen Dublettenprüfung, Metadaten, Rechteklärung, Qualitätsreview und eine Zuordnung zum kanonischen Knowledge-Dokument. Originalquelle und redaktionelle Ableitung bleiben unterscheidbar.

## 10. Phase 7 – Strukturierte Daten

Geplant sind `schema/`, strukturierte JSON-LD-Dateien und kontrollierte Vokabulare. Sie können Organisation, Themen, Lernangebote, Beiträge und Beziehungen maschinenlesbar abbilden.

Schemata werden versioniert und gegen Beispiele validiert. Strukturierte Daten dürfen keine Aussagen ergänzen, die in der kanonischen Quelle fehlen.

## 11. Phase 8 – Automatisierung

Mögliche Automatisierungen sind Linkprüfung, Markdown-Linting, YAML-Validierung, Versionsmanagement, Markenschreibweisen, Wort- und Elementzählung sowie Hinweise auf veraltete Inhalte. `prompts/` und `examples/` können überprüfbare Arbeitsabläufe und Sollausgaben dokumentieren.

Automatisierung meldet Abweichungen; inhaltliche Freigabe bleibt eine verantwortete menschliche Entscheidung.

## 12. Phase 9 – RAG und KI-Assistent

Retrieval-Augmented Generation (RAG) verbindet eine KI-Antwort mit abgerufenen Quellen. Eine spätere RAG-Integration und ein eigener mniConsult-KI-Assistent sollen nur auf freigegebene, segmentierte und zitierbare Inhalte zugreifen.

Benötigt werden Berechtigungen, Quellenzitate, Schutz vertraulicher Daten, Qualitätssets, Halluzinationskontrollen, Protokollierung, Feedback und eine sichere Eskalation zu Menschen.

## 13. Phase 10 – Governance und Qualität

Geplant sind festgelegte Owner, Review-Rollen, Freigabestatus, Änderungsprotokolle, Archivierung und Regeln für zeitkritische Inhalte. Governance umfasst ausserdem Datenschutz, Informationssicherheit, Markenführung, Quellenrechte und den Umgang mit Widersprüchen.

## 14. Prioritäten

1. Korrekte, kanonische Inhalte und klare Verantwortlichkeiten
2. Quellen, Rechte und Aktualität
3. Verlässliche Navigation und maschinenlesbare Metadaten
4. Automatisierte Basisprüfungen
5. Strukturierte Daten und Content-Import
6. RAG und Assistent erst auf der geprüften Grundlage

Prioritäten können anhand von Risiko, Nutzung und verfügbarem Aufwand angepasst werden.

## 15. Wartungsrhythmus

Es wird kein fixer Kalender behauptet. Sinnvoll sind ereignisbezogene Reviews bei Produkt-, Angebots-, Rechts- oder Strategieänderungen sowie periodische Kontrollen stark genutzter oder zeitkritischer Dokumente.

Jede Änderung prüft mindestens Inhalt, Datum, Version, Links, verwandte Dokumente und mögliche Folgewirkungen.

## 16. Qualitätsmetriken

- Anteil gültiger interner und externer Links
- Vollständigkeit des Frontmatters
- Anteil dokumentierter Quellen bei zeitabhängigen Aussagen
- Anzahl erkannter Widersprüche und offene Review-Punkte
- Aktualität nach definierter Inhaltsklasse
- Such- und Antwortabdeckung anhand repräsentativer Fragen
- Zitiergenauigkeit und Quellenübereinstimmung eines späteren RAG-Systems
- Nutzung, Feedback und Korrekturzeit

Metriken unterstützen Entscheidungen und sind keine alleinige Qualitätsdefinition.

## 17. Änderungsmanagement

Änderungen sollen einen fachlichen Grund, verantwortliche Person, Review und nachvollziehbare Versionsanpassung erhalten. Grössere Strukturänderungen benötigen Linkmigration und Prüfung nachgelagerter Systeme.

Widersprüchliche Aussagen werden an der sachlich zuständigen Quelle gelöst. Veraltete Inhalte werden aktualisiert oder mit Status archiviert, nicht stillschweigend als aktuelle Wahrheit belassen.

## 18. Offene Punkte

- Verbindliches Quellen- und Zitationsschema festlegen
- Inhaltsowner und Review-Rollen je Kategorie bestimmen
- Freigabe- und Archivstatus definieren
- Lizenz- und Nutzungsrechte importierter Inhalte dokumentieren
- Linting-, Link- und Schemawerkzeuge auswählen
- Qualitätsfragen und Testdatensätze für RAG entwickeln
- Datenschutz- und Sicherheitskonzept für den KI-Assistenten erstellen
- Veröffentlichungsweg und öffentliche Ziel-URLs festlegen

## 19. Verwandte Dokumente

- [Repository-Dokumentation](../README.md)
- [Knowledge-Index](index.md)
- [Services](services.md)
- [Use Cases](usecases.md)
- [Glossar](glossary.md)
- [FAQ](faq.md)
- [Unternehmensprofil](company.md)
