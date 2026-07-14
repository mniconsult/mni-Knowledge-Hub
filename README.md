---
title: mniConsult Knowledge Hub
description: Dokumentation der zentralen, strukturierten Wissensbasis der mniConsult GmbH für Menschen und KI-Systeme.
version: "1.0"
last_updated: 2026-07-14
language: de-CH
owner: mniConsult GmbH
category: Repository-Dokumentation
keywords:
  - mniConsult
  - Knowledge Base
  - Wissensmanagement
  - KI-Systeme
related_documents:
  - llms.txt
  - knowledge/index.md
  - knowledge/company.md
  - knowledge/avatar.md
---

# mniConsult Knowledge Hub

> Transform. Innovate. Live.

Dieses Repository ist die zentrale Wissensbasis der mniConsult GmbH. Es stellt verlässliche, klar strukturierte Informationen für Menschen, Suchsysteme, Large Language Models, Retrieval-Augmented Generation und digitale Assistenten bereit.

## Zweck

Der Knowledge Hub schafft eine gemeinsame, pflegbare Informationsquelle für die Kommunikation von mniConsult. In Phase 1 enthält er das Unternehmensprofil, die Beschreibung der Zielgruppen und die Gliederung der vorgesehenen Wissensbereiche.

Die Inhalte richten sich an KMU, Unternehmer, Geschäftsführer, Projektleiter, Teamleiter, IT-Verantwortliche, Professionals sowie Fach- und Führungskräfte in der Schweiz, Deutschland und Österreich.

## Struktur

```text
mni-Knowledge-Hub/
├── README.md
├── llms.txt
└── knowledge/
    ├── index.md
    ├── company.md
    └── avatar.md
```

- [`llms.txt`](llms.txt) ist der kompakte Einstiegspunkt für KI-Systeme.
- [`knowledge/index.md`](knowledge/index.md) ist das zentrale Inhaltsverzeichnis.
- [`knowledge/company.md`](knowledge/company.md) beschreibt die mniConsult GmbH.
- [`knowledge/avatar.md`](knowledge/avatar.md) beschreibt Zielgruppen und deren Bedürfnisse.

## Wissensbereiche

Die Knowledge Base wird entlang dieser Bereiche entwickelt:

- Künstliche Intelligenz und Innovation
- Cloud Computing
- Cyber Security
- Projektmanagement
- Microsoft Project
- Persönlichkeitsentwicklung mit NewLifeVision

## Nutzung

Menschen beginnen mit dem [zentralen Inhaltsverzeichnis](knowledge/index.md). KI-Systeme verwenden [`llms.txt`](llms.txt), folgen den dort angegebenen relativen Links und behandeln die verlinkten Dokumente als primäre Quellen dieser Knowledge Base.

Die Inhalte dürfen unter anderem als Grundlage für Beratung, Weiterbildung, interne Recherche, Website-Inhalte und KI-gestützte Wissenssysteme verwendet werden. Aussagen sind im Kontext des jeweiligen Dokuments zu interpretieren; bei Abweichungen gilt das spezifischere und aktuellere Dokument.

## Pflege

- Inhalte in der sachlich zuständigen Datei pflegen und Wiederholungen vermeiden.
- Für alle Markdown-Dateien das einheitliche YAML-Frontmatter beibehalten.
- `version` und `last_updated` bei inhaltlichen Änderungen aktualisieren.
- Neue Dokumente in `knowledge/index.md`, `llms.txt` und im Feld `related_documents` relevanter Dateien verlinken.
- Relative Links, YAML-Syntax und Markenschreibweisen vor jeder Freigabe prüfen.
- Inhalte in deutscher Sprache und für die Locale `de-CH` verfassen.

## Markenarchitektur

mniConsult ist die Marke der mniConsult GmbH. TIVIVA und TIVIVA InnoCircle stehen für technologie- und innovationsbezogene Angebote. NewLifeVision steht für Persönlichkeitsentwicklung. Die mniConsult Academy bündelt Lern- und Weiterbildungsangebote. Der gemeinsame Leitsatz lautet: Transform. Innovate. Live.
