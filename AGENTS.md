# AGENTS.md

## Zweck

Dieses Repository ist der offizielle mniConsult Knowledge Hub.

Es bildet die zentrale, strukturierte Wissensbasis der mniConsult GmbH für:

- Menschen
- Large Language Models
- KI-gestützte Suchsysteme
- Retrieval-Augmented Generation
- Dokumentationssysteme
- Website-Inhalte
- Kurse
- Podcasts
- Blogbeiträge
- zukünftige mniConsult-KI-Assistenten

Alle Agenten und automatisierten Werkzeuge müssen die Regeln dieser Datei beachten.

## Geltungsbereich

Diese Datei gilt für das gesamte Repository.

Untergeordnete AGENTS.md-Dateien dürfen für einzelne Verzeichnisse zusätzliche Regeln definieren. Sie dürfen die grundlegenden Marken-, Sicherheits- und Qualitätsvorgaben dieser Datei nicht aufheben.

## Projektidentität

Unternehmen:

mniConsult GmbH

Leitsatz:

Transform. Innovate. Live.

Zentrale Marken:

- mniConsult
- mniConsult GmbH
- mniConsult Academy
- TIVIVA
- TIVIVA InnoCircle
- NewLifeVision

## Verbindliche Markenschreibweisen

Folgende Schreibweisen sind verbindlich:

- mniConsult
- mniConsult GmbH
- mniConsult Academy
- TIVIVA
- TIVIVA InnoCircle
- NewLifeVision
- Transform. Innovate. Live.

Nicht verwenden:

- MNE Consult
- MNI Consult als Markenbezeichnung
- MniConsult
- TViva
- TiViva
- New Life Vision
- NewLife Vision
- frei erfundene Markenvarianten

Ausnahme:

In rein technischen Kontexten dürfen Dateinamen, URLs oder externe Bezeichnungen ihre technisch erforderliche Schreibweise behalten.

## Positionierung

mniConsult verbindet technologische Kompetenz mit erfolgreicher Umsetzung und persönlicher Entwicklung.

Die Wissensbasis umfasst insbesondere:

1. Künstliche Intelligenz und Innovation
2. Cloud Computing
3. Cyber Security
4. Projektmanagement
5. Microsoft Project
6. Persönlichkeitsentwicklung mit NewLifeVision
7. Kurse, Mentoring und Weiterbildung über die mniConsult Academy
8. Podcasts, Blogbeiträge, Fachliteratur und Praxisimpulse

## Zielgruppen

Die primären Zielgruppen sind:

- KMU-Inhaberinnen und KMU-Inhaber
- Unternehmerinnen und Unternehmer
- Geschäftsführerinnen und Geschäftsführer
- Projektleiterinnen und Projektleiter
- Teamleiterinnen und Teamleiter
- IT-Verantwortliche
- Fach- und Führungskräfte
- Professionals
- Menschen mit hoher beruflicher Verantwortung
- Menschen in beruflichen oder persönlichen Veränderungsphasen

Geografischer Schwerpunkt:

- Schweiz
- Deutschland
- Österreich

## Bedürfnisse der Zielgruppen

Inhalte sollen insbesondere folgende Bedürfnisse berücksichtigen:

- weniger Komplexität
- mehr Orientierung
- weniger Overload
- mehr Zeit
- mehr Wirkung
- sichere Technologieentscheidungen
- verständliche KI-Anwendungen
- bessere Projektsteuerung
- reduzierte Cyber-Risiken
- mehr Fokus
- mehr innere Ruhe
- nachhaltige persönliche Entwicklung
- konkrete und direkt umsetzbare nächste Schritte

## Sprache

Standardsprache:

Deutsch

Sprachvariante:

de-CH

Regeln:

- Schweizer Schreibweise verwenden.
- `ss` statt `ß` verwenden.
- Klar und verständlich formulieren.
- Unnötigen Fachjargon vermeiden.
- Fachbegriffe beim ersten Auftreten erklären.
- Englische Fachbegriffe verwenden, wenn sie im jeweiligen Fachgebiet üblich sind.
- Keine künstlich komplizierten Satzkonstruktionen.
- Keine aggressive oder übertriebene Verkaufssprache.
- Keine leeren Motivationsfloskeln.
- Keine unnötigen Wiederholungen.

## Tonalität

Die Tonalität ist:

- professionell
- fachlich fundiert
- praxisorientiert
- inspirierend
- motivierend
- klar
- verantwortungsvoll
- lösungsorientiert
- bodenständig

Die Tonalität ist nicht:

- übertrieben werblich
- reisserisch
- belehrend
- angstmachend
- pseudowissenschaftlich
- unnötig esoterisch
- medizinisch diagnostizierend

## Grundprinzipien

Alle Inhalte sollen folgenden Prinzipien entsprechen:

- Praxis vor Theorie
- Klarheit statt Komplexität
- Umsetzung statt Informationsüberlastung
- Verantwortung statt blinder Technologiebegeisterung
- nachhaltiger Nutzen statt kurzfristiger Effekte
- realistische Aussagen statt garantierter Resultate
- Transparenz über Chancen, Risiken und Grenzen
- Verbindung von beruflicher Wirkung und persönlicher Freiheit

## Verzeichnisstruktur

Die zentrale Struktur ist:

- README.md
- AGENTS.md
- llms.txt
- knowledge/
- sources/
- schema/
- prompts/
- examples/
- courses/
- podcasts/
- blog/
- faq/
- glossary/
- services/
- usecases/
- images/

Nicht vorhandene Verzeichnisse dürfen nur angelegt werden, wenn sie zum Auftrag oder zur dokumentierten Roadmap passen.

Keine parallelen oder fast identischen Verzeichnisstrukturen ohne sachlichen Grund erstellen.

## Knowledge-Dokumente

Die zentralen Dokumente unter knowledge/ sind:

- index.md
- company.md
- avatar.md
- ki-innovation.md
- cloud.md
- cyber-security.md
- projektmanagement.md
- microsoft-project.md
- newlifevision.md
- academy.md
- podcasts.md
- blog.md
- services.md
- usecases.md
- glossary.md
- faq.md
- roadmap.md

Neue zentrale Knowledge-Dateien müssen:

1. einen eindeutigen Zweck haben,
2. in knowledge/index.md aufgenommen werden,
3. in README.md berücksichtigt werden,
4. bei hoher Relevanz in llms.txt verlinkt werden,
5. mit verwandten Dokumenten verknüpft werden.

## YAML-Frontmatter

Neue Knowledge-Dokumente verwenden grundsätzlich:

---
title:
description:
version:
last_updated:
language: de-CH
owner: mniConsult GmbH
category:
keywords:
related_documents:
---

Regeln:

- Datum im Format YYYY-MM-DD.
- Titel präzise und eindeutig formulieren.
- Beschreibung als kurze inhaltliche Zusammenfassung.
- Keywords als YAML-Liste.
- related_documents als YAML-Liste mit relativen Dateipfaden.
- Keine leeren Pflichtfelder in fertigen Dokumenten.
- Bestehende Frontmatter-Konventionen nicht ohne Not verändern.

## Markdown-Struktur

Grundsätzlich verwenden:

- genau eine H1-Überschrift pro Dokument
- H2 für Hauptkapitel
- H3 für Unterkapitel
- kurze Absätze
- Listen nur, wenn sie die Lesbarkeit verbessern
- Tabellen nur bei echtem Vergleichs- oder Strukturierungsnutzen
- relative Links für Repository-Dokumente
- aussagekräftige Linktexte
- keine Links mit Formulierungen wie „hier klicken“

Beispiel:

[KI und Innovation](knowledge/ki-innovation.md)

Nicht bevorzugt:

[Hier klicken](knowledge/ki-innovation.md)

## Typische Dokumentstruktur

Fachliche Knowledge-Dokumente sollen, soweit sinnvoll, enthalten:

1. Zusammenfassung
2. Bedeutung für die Zielgruppe
3. typische Herausforderungen
4. Ziele und Nutzen
5. Grundlagen und zentrale Begriffe
6. Vorgehensweisen oder Modelle
7. konkrete Anwendungsfälle
8. Best Practices
9. Risiken und Grenzen
10. Unterstützung durch mniConsult
11. häufig gestellte Fragen
12. verwandte Dokumente
13. offizielle Webseiten

Die Struktur darf sachgerecht angepasst werden. Kapitel dürfen nicht nur erstellt werden, um ein Schema formal zu erfüllen.

## Interne Verlinkung

Relative Links innerhalb von knowledge/ verwenden.

Beispiele:

- [Unternehmensprofil](knowledge/company.md)
- [Zielgruppen](knowledge/avatar.md)
- [KI und Innovation](knowledge/ki-innovation.md)
- [Cloud Computing](knowledge/cloud.md)
- [Cyber Security](knowledge/cyber-security.md)
- [Projektmanagement](knowledge/projektmanagement.md)
- [Microsoft Project](knowledge/microsoft-project.md)
- [NewLifeVision](knowledge/newlifevision.md)
- [mniConsult Academy](knowledge/academy.md)
- [Podcasts](knowledge/podcasts.md)
- [Blog](knowledge/blog.md)
- [Services](knowledge/services.md)
- [Use Cases](knowledge/usecases.md)
- [Glossar](knowledge/glossary.md)
- [FAQ](knowledge/faq.md)
- [Roadmap](knowledge/roadmap.md)

Keine Links auf Dateien erzeugen, die weder vorhanden noch als geplante Datei eindeutig dokumentiert sind.

## llms.txt

Die Datei llms.txt ist der kompakte Einstiegspunkt für KI-Systeme.

Regeln:

- nur wichtige und öffentlich erreichbare Inhalte aufnehmen
- klare Kurzbeschreibungen verwenden
- keine Keyword-Ansammlungen
- keine übertriebenen Ranking-Versprechen
- keine falschen oder noch nicht veröffentlichten öffentlichen URLs
- neue zentrale Knowledge-Dateien nur aufnehmen, wenn sie fachlich relevant und zur Veröffentlichung vorgesehen sind
- bestehende Formatkonventionen beibehalten

Die Datei llms.txt garantiert keine Platzierung in Suchsystemen. Entsprechende Aussagen dürfen nicht gemacht werden.

## SEO- und Discovery-Dateien

Für `robots.txt`, `sitemap.xml`, `sitemap.rss`, `humans.txt` und `security.txt` gelten folgende Regeln:

- nur bekannte, verifizierte und zur Veröffentlichung geeignete URLs aufnehmen
- bestehende Einträge konsolidieren und keine Duplikate erzeugen
- XML und RSS als valides UTF-8 ausgeben
- unbekannte Veröffentlichungsdaten, Kontakte oder Ziel-URLs nicht erfinden
- zukünftige Knowledge-URLs nur als nicht aktive Kommentare dokumentieren
- `robots.txt` nicht ohne ausdrücklichen Auftrag zur Sperrung öffentlich vorgesehener Inhalte verwenden
- RSS-Veröffentlichungsdaten nur setzen, wenn sie dokumentiert sind; `lastBuildDate` darf den tatsächlichen Erstellungszeitpunkt verwenden
- in `humans.txt` keine privaten oder personenbezogenen Kontaktdaten aufnehmen
- `security.txt` nach RFC 9116 pflegen und unter `/.well-known/security.txt` veröffentlichen
- eine dedizierte Security-Kontaktadresse ergänzen, sobald sie offiziell dokumentiert und verifiziert ist

Bei strukturellen Änderungen ist zu prüfen, ob README.md und die Discovery-Dateien angepasst werden müssen.

## README.md

README.md beschreibt:

- Zweck des Repositories
- Marken und Fachbereiche
- Repository-Struktur
- Nutzung der Knowledge Base
- Pflege- und Qualitätsprinzipien
- zentrale Navigation

Bei strukturellen Änderungen ist zu prüfen, ob README.md aktualisiert werden muss.

## Knowledge-Automation

- Die Freigaben für die automatisierte Veröffentlichung werden ausschliesslich in `config/llms-config.json` gepflegt. Neue Dokumente erhalten standardmässig `approved: false`. Öffentliche URLs brauchen eine ausdrückliche redaktionelle Prüfung und müssen zum jeweiligen Dokument gehören.
- Änderungen an der Workflow-Logik in `automation/n8n/modules/` und `automation/n8n/build-workflows.js` pflegen. Die importierbaren JSON-Dateien und den Node-Katalog mit `node automation/n8n/build-workflows.js` neu erzeugen und mit `--check` sowie `node --test automation/n8n/tests/*.test.js` prüfen.
- Standard-Nodes und JavaScript für n8n 2.47.7 verwenden. Credentials erst auf der n8n-Instanz zuordnen. Für Entwicklung und Repository-Prüfung Deployment deaktiviert lassen und ausschliesslich isolierte Testpfade verwenden.

## knowledge/index.md

knowledge/index.md ist das zentrale Inhaltsverzeichnis der Knowledge Base.

Jede neue zentrale Knowledge-Datei muss dort unter einem logisch passenden Abschnitt aufgenommen werden.

Keine doppelten Navigationseinträge erzeugen.

## Fakten und Quellen

Agenten dürfen keine Fakten erfinden.

Insbesondere nicht erfinden:

- Preise
- Kundenzahlen
- Umsätze
- Marktanteile
- Zertifizierungen
- Partnerschaften
- Kundenreferenzen
- Studien
- wissenschaftliche Belege
- Kursbestandteile
- Veröffentlichungstermine
- Produktfunktionen
- Lizenzbedingungen
- technische Spezifikationen
- rechtliche Anforderungen

Bei zeitabhängigen oder unsicheren Fakten:

1. vorhandene Quellen prüfen,
2. Unsicherheit transparent kennzeichnen,
3. keine scheinpräzisen Angaben formulieren,
4. gegebenenfalls einen offenen Punkt dokumentieren.

## URLs

Nur bekannte und verifizierte URLs verwenden.

Bekannte Basis-URLs:

- https://mniconsult.ch
- https://mniconsult.ch/academy/
- https://mniconsult.ch/tiviva/
- https://mniconsult.ch/tiviva-inno-circle/
- https://mniconsult.ch/newlifevision
- https://mniconsult.ch/tiviva-newlife/
- https://mniconsult.ch/impulse/
- https://tiviva.blog

Vor der Aufnahme weiterer URLs vorhandene Repository-Quellen prüfen.

Keine URLs anhand vermuteter Seitennamen erfinden.

## Künstliche Intelligenz

Bei KI-Themen:

- Chancen und Grenzen darstellen
- menschliche Kontrolle betonen
- Datenschutz berücksichtigen
- Halluzinationen und Fehlerquellen erklären
- keine vollständige Automatisierung ohne Kontrolle empfehlen
- keine sensiblen oder vertraulichen Daten ungeprüft in externe Systeme geben
- Responsible AI und Governance berücksichtigen
- aktuelle Produktdetails nur mit verifizierter Quelle nennen

## Cloud Computing

Bei Cloud-Themen:

- Shared Responsibility erklären
- Sicherheit, Governance und Kosten berücksichtigen
- Vendor Lock-in und Exit-Strategien einordnen
- keine Cloud-Plattform pauschal als immer beste Lösung darstellen
- keine aktuellen Preise ohne Prüfung nennen
- Datenschutz und Datenstandort differenziert behandeln

## Cyber Security

Bei Cyber-Security-Themen:

- keine absolute Sicherheit versprechen
- risikobasiert priorisieren
- organisatorische und technische Massnahmen verbinden
- menschliche Faktoren berücksichtigen
- Incident Response, Backup und Business Continuity einordnen
- keine offensiven oder missbräuchlichen Anleitungen erstellen
- keine rechtlichen Garantien geben

## Projektmanagement

Bei Projektmanagement-Themen:

- klassische, agile und hybride Ansätze differenziert darstellen
- Methode anhand des Kontextes auswählen
- keine Methode als universelle Lösung darstellen
- Termine, Ressourcen, Kosten, Risiken und Stakeholder gemeinsam betrachten
- praktische Umsetzung und Führung berücksichtigen

## Microsoft Project

Bei Microsoft-Project-Themen:

- Produkt- und Lizenzdetails vorsichtig formulieren
- keine aktuellen Preise ohne Verifikation nennen
- Rolle von Dauer, Arbeit und Einheiten korrekt unterscheiden
- Basisplan, kritischen Pfad, Ressourcen und Fortschrittskontrolle sachlich erklären
- Microsoft Project nicht mit einfachen Aufgabenlisten gleichsetzen
- Grenzen des Werkzeugs transparent machen

## NewLifeVision

Bei NewLifeVision-Themen:

- persönliche Entwicklung verantwortungsvoll darstellen
- keine Heilungsversprechen
- keine medizinischen Diagnosen
- keine Therapieempfehlungen
- Meditation nicht als Ersatz für medizinische oder psychotherapeutische Hilfe darstellen
- Manifestation als Zielklarheit, Aufmerksamkeit, Visualisierung und konkretes Handeln einordnen
- keine Behauptung, Gedanken allein würden äussere Ereignisse garantieren
- Resilienz nicht als Pflicht darstellen, jede Belastung allein auszuhalten
- professionelle Unterstützung bei starken oder anhaltenden Beschwerden empfehlen

## Angebote und Marketing

Bei Angebotsbeschreibungen:

- Nutzen klar herausstellen
- Zielgruppe benennen
- Problem und Lösung verbinden
- sachlich und glaubwürdig bleiben
- keine künstliche Verknappung erfinden
- keine garantierten Resultate
- keine Preise oder Rabatte ohne aktuelle Quelle
- keine noch nicht existierenden Angebote als verfügbar darstellen
- Information und Werbung klar unterscheiden

## Datenschutz und vertrauliche Daten

Nicht in das Repository aufnehmen:

- personenbezogene Kundendaten
- private Kontaktinformationen
- Passwörter
- API-Schlüssel
- Tokens
- Zugangsdaten
- vertrauliche Vertragsdaten
- nicht freigegebene interne Informationen
- Gesundheitsdaten
- Zahlungsdaten

Verdächtige Geheimnisse oder Zugangsdaten nicht kopieren oder wiederholen.

Bei einem möglichen Geheimnisfund:

1. Änderung stoppen,
2. Fund sachlich melden,
3. Entfernung oder Rotation empfehlen,
4. den Wert nicht unnötig wiedergeben.

## Quellenverzeichnis

Originalinhalte sollen langfristig unter sources/ abgelegt werden.

Geeignete Unterverzeichnisse:

- sources/landingpages/
- sources/courses/
- sources/podcasts/
- sources/blog/
- sources/ebooks/
- sources/workshops/
- sources/research/

Knowledge-Dokumente sollen Inhalte aus Quellen strukturieren und zusammenführen, nicht ungeprüft duplizieren.

## Änderungen an bestehenden Dateien

Vor Änderungen:

1. Datei vollständig lesen.
2. verwandte Dateien prüfen.
3. Auftrag gegen bestehende Inhalte abgleichen.
4. mögliche Konflikte identifizieren.
5. `git status` prüfen.

Bei Änderungen:

- nur auftragsrelevante Abschnitte ändern
- keine funktionierenden Inhalte unnötig neu schreiben
- keine Informationen stillschweigend löschen
- Stil und Struktur beibehalten
- interne Links aktualisieren
- Navigationsdateien berücksichtigen

## Neue Dateien

Vor dem Anlegen einer neuen Datei:

1. prüfen, ob der Inhalt bereits existiert,
2. prüfen, ob eine Erweiterung einer vorhandenen Datei besser wäre,
3. Dateinamen in Kleinbuchstaben verwenden,
4. Wörter mit Bindestrichen trennen,
5. Datei in das fachlich passende Verzeichnis legen,
6. Navigation und Querverweise aktualisieren.

Ausnahmen:

- README.md
- AGENTS.md
- LICENSE
- CONTRIBUTING.md
- STYLEGUIDE.md

## Dateinamen

Bevorzugt:

- ki-innovation.md
- cyber-security.md
- microsoft-project.md

Nicht bevorzugt:

- KIInnovationNeu.md
- Cyber Security.md
- microsoft_project_final_v2.md

Keine Versionsnummern in Dateinamen, wenn Git die Versionierung übernimmt.

## Qualitätsprüfung

Nach relevanten Änderungen mindestens prüfen:

1. `git status`
2. `git diff`
3. `git diff --check`
4. Markdown-Links
5. YAML-Frontmatter
6. Markenschreibweisen
7. leere Überschriften
8. Platzhalter
9. doppelte Inhalte
10. widersprüchliche Aussagen
11. erfundene oder unbestätigte Fakten
12. nicht verifizierte URLs
13. sensible Informationen

Wenn entsprechende Werkzeuge vorhanden sind, zusätzlich ausführen:

- Markdown-Linter
- Link-Checker
- YAML-Parser
- Rechtschreibprüfung

Keine neuen Tools oder Abhängigkeiten ohne sachlichen Grund installieren.

## Platzhalter

Nicht in fertigen Dateien belassen:

- TODO
- TBD
- Lorem ipsum
- Beispieltext
- später ergänzen
- Platzhalter
- XX
- ungeklärte leere Tabellen
- leere Überschriften

Ungeklärte Punkte in der Abschlusszusammenfassung nennen oder in roadmap.md dokumentieren.

## Umfang

Qualität ist wichtiger als Länge.

Nicht:

- Texte durch Wiederholungen verlängern
- mehrere fast identische FAQs erstellen
- Definitionen mehrfach kopieren
- Keyword-Stuffing verwenden
- Themen ohne inhaltlichen Mehrwert aufblähen

Stattdessen:

- klare Definitionen
- konkrete Beispiele
- relevante Anwendungsfälle
- nachvollziehbare Grenzen
- sinnvolle Querverweise

## Git-Arbeitsweise

Standardmässig:

- keine Commits ohne ausdrücklichen Auftrag
- kein Push ohne ausdrücklichen Auftrag
- keine Branches ohne ausdrücklichen Auftrag
- keine Dateien löschen, wenn dies nicht erforderlich ist
- keine fremden Änderungen überschreiben
- keine grossflächigen Formatierungsänderungen nebenbei durchführen

Nach Abschluss einer Aufgabe:

1. geänderte Dateien nennen,
2. Inhalt der Änderungen zusammenfassen,
3. Prüfungen nennen,
4. Fehler oder Warnungen nennen,
5. offene Annahmen nennen,
6. Commit-Vorschlag geben, aber nicht automatisch committen.

## Umgang mit bestehenden Änderungen

Wenn `git status` bereits Änderungen zeigt:

- prüfen, welche Dateien betroffen sind
- bestehende Nutzeränderungen nicht überschreiben
- nur auftragsrelevante Dateien bearbeiten
- bei Konflikten Änderungen getrennt halten
- keine pauschalen Rücksetzungen durchführen
- kein `git reset --hard`
- kein `git clean -fd`
- kein Force-Push

## Sicherheitsregeln für Befehle

Nicht ohne ausdrücklichen Auftrag ausführen:

- `git reset --hard`
- `git clean -fd`
- `git push --force`
- rekursive Löschbefehle
- Änderungen ausserhalb des Repositorys
- Installation unbekannter Software
- Übertragung von Repository-Inhalten an externe Dienste
- Veröffentlichung vertraulicher Daten

## Abschlussbericht

Nach jeder grösseren Aufgabe ausgeben:

- erstellte Dateien
- geänderte Dateien
- gelöschte Dateien
- Wort- oder Zeilenzahl bei umfangreichen Dokumenten
- ausgeführte Prüfungen
- gefundene Warnungen
- offene Annahmen
- empfohlene Commit-Nachricht

## Priorität von Anweisungen

Bei Konflikten gilt:

1. ausdrücklicher aktueller Nutzerauftrag
2. Sicherheits- und Datenschutzanforderungen
3. diese AGENTS.md
4. untergeordnete AGENTS.md
5. README.md und weitere Projektdokumentation
6. bestehende lokale Konventionen

Bei unauflösbaren Konflikten nicht raten, sondern den Konflikt transparent dokumentieren.

## Definition of Done

Eine Aufgabe ist abgeschlossen, wenn:

- alle angeforderten Dateien erstellt oder aktualisiert wurden,
- Inhalte vollständig und sachlich korrekt sind,
- keine bekannten Platzhalter verbleiben,
- Frontmatter valide ist,
- interne Links geprüft wurden,
- Markenschreibweisen konsistent sind,
- keine vertraulichen Daten enthalten sind,
- `git diff --check` keine Fehler meldet,
- README.md, llms.txt und knowledge/index.md bei Bedarf aktualisiert wurden,
- Änderungen nachvollziehbar zusammengefasst wurden,
- kein Commit oder Push ohne Auftrag erfolgt ist.
