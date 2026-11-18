# Abschlussbericht zur Knowledge-Automation

**Stand** 18. November 2026 · **Zielversion** n8n 2.47.7 · **Ausgangsrevision** `dd90f738945358139471aa574a1a60bc85e46ceb`

Die Implementierung liegt im Cloud-Checkout `work` von `mniconsult/mni-Knowledge-Hub`. Der Katalog enthält **17 vorhandene Knowledge-Dokumente**, **0 freigegebene** und **17 ausstehende**. Alle öffentlichen Dokument-URLs sind vor der redaktionellen Zuordnung auf `null` gesetzt. Der Standardlauf endet ohne Dateikandidaten, solange der Katalog keine Freigaben enthält.

## Dateien

| Pfad | Ergebnis |
| --- | --- |
| [`config/llms-config.json`](../../config/llms-config.json) | Zentrale Konfiguration und vollständiger Dokumentkatalog |
| [`automation/n8n/build-llms-workflow.json`](build-llms-workflow.json) | Build, Vergleich, SFTP-Deployment und Rollback |
| [`automation/n8n/error-workflow.json`](error-workflow.json) | Fehlerereignisse bereinigen und optional per SMTP melden |
| [`automation/n8n/build-workflows.js`](build-workflows.js) | Reproduzierbare Workflow-Exporte, eingebetteter Node-Code und Node-Katalog |
| [`automation/n8n/modules/parse-config.js`](modules/parse-config.js) | Katalog, Freigaben, Pfade und Schutzgrenzen |
| [`automation/n8n/modules/github-content.js`](modules/github-content.js) | HTTP-Status, Backoff und strikte UTF-8-/Base64-Dekodierung |
| [`automation/n8n/modules/process-markdown.js`](modules/process-markdown.js) | YAML-Frontmatter, Markdown-Struktur, interne Abschnitte und Querverweise |
| [`automation/n8n/modules/build-llms.js`](modules/build-llms.js) | Deterministische Generierung beider Dateien und Manifest |
| [`automation/n8n/modules/validate-output.js`](modules/validate-output.js) | Ausgaben, Dokumentgrenzen, URLs, Grössen und öffentlicher Vergleich |
| [`automation/n8n/modules/deployment.js`](modules/deployment.js) | Deployment-Entscheid, SFTP-Pfade und Wiederherstellungsstatus |
| [`automation/n8n/modules/monitoring.js`](modules/monitoring.js) | Bereinigtes Fehlerformat für Betreiber |
| [`automation/n8n/modules/vendor/js-yaml.cjs`](modules/vendor/js-yaml.cjs) | Laufzeitbundle aus Loader und Core-Schema von js-yaml 4.2.0 |
| [`automation/n8n/modules/vendor/js-yaml-license.txt`](modules/vendor/js-yaml-license.txt) | MIT-Lizenz des YAML-Parsers |
| [`automation/n8n/tests/modules.test.js`](tests/modules.test.js) | Modultests an synthetischen und vorhandenen Knowledge-Daten |
| [`automation/n8n/tests/workflows.test.js`](tests/workflows.test.js) | Workflow-Graph, Sicherheitsentscheidungen und Rollback-Simulation |
| [`automation/n8n/README.md`](README.md) | Technischer Ablauf mit Katalog aller Nodes |
| [`automation/n8n/INSTALLATION.md`](INSTALLATION.md) | Einrichtung, Tests auf der Zielinstanz und Wiederherstellung |
| `automation/n8n/abschlussbericht.md` | Dieser Bericht |

Ergänzt wurden [`README.md`](../../README.md) und [`AGENTS.md`](../../AGENTS.md). Die 17 Fach- und Navigationsdokumente, bestehenden LLM-Dateien und Discovery-Dateien liegen in ihrer bisherigen Fassung vor. Der Aufgaben-Diff enthält keine Löschungen, Commits oder Pushes.

## Korrekturen aus der Nachprüfung

- GitHub-Quellen werden vor dem Inhaltsabruf über den vollständigen Baum des gepinnten Commits geprüft. Der Workflow sperrt Symlinks, Submodule, fehlende Dateien, zu grosse Quellensätze und abgeschnittene Bäume. Er gleicht die Bytezahl jeder Raw-Antwort mit dem Git-Baumeintrag ab. Bei Base64 gleicht er zusätzlich die angegebene Blob-SHA ab. Unfreigegebene Inhalte bleiben vom Abruf ausgeschlossen.
- Mehrdeutige interne Frontmatter-Markierungen und HTML in Markdown-Linktexten sperren die Veröffentlichung. Der Workflow verwirft unvollständige oder mehrdeutige Zuordnungen von HTTP-Antworten.
- Beim SFTP-Rollback bleiben die geprüften `.bak`-Sicherungen erhalten. Der Workflow verwendet getrennte `.restore`-Kopien. Er bestätigt den Rollback erst nach unabhängiger Prüfung am SFTP-Ursprung und an beiden öffentlichen URLs. SFTP-Pfade sind an die geplante Ausführung und ihre ID gebunden.
- Beide optionalen SMTP-Nodes sind im Export deaktiviert. Dadurch lässt sich der Build-Workflow in n8n 2.47.7 bei eingerichteten GitHub- und SFTP-Zugängen auch ohne SMTP-Credential veröffentlichen. Ein positiver Versandstatus setzt eine SMTP-Annahmebestätigung voraus.
- Der Installationsleitfaden erklärt die für n8n 2.47.7 erforderliche Veröffentlichung des Error Workflows und die Einstellung für Code-Ausgaben im Server-Log.

## Workflow-Umfang

- **LLM Build & Publish** umfasst 133 Standard-Nodes. Dazu gehören Manual Trigger, Schedule Trigger, 16 HTTP Request-, 68 Code-, 18 IF-, 8 Wait- und 19 FTP-Nodes sowie je ein Convert to File- und Send Email-Node.
- **Error Monitoring** umfasst sechs Standard-Nodes. Error Trigger, drei Code-Nodes, ein IF-Node und ein Send Email-Node bilden den Fehlerpfad.
- Beide Exporte sind inaktiv. Der Schedule Trigger ist deaktiviert, die SFTP-Pfade sind leer und Timezone sowie Standardtermin sind auf 04:15 Uhr Europe/Zurich eingestellt. Das geplante Deployment ist zusätzlich in der Konfiguration gesperrt.
- Der gewöhnliche SFTP-Rename muss beim konkreten Provider bestehende Ziele pro Datei atomar ersetzen können. Beide Aktivierungen erfolgen nacheinander. Eine kurzzeitige gemischte Auslieferung bleibt möglich. Eine gemeinsame atomare Umschaltung erfordert eine geeignete Freigabefunktion des Providers.

## Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| `node --test automation/n8n/tests/*.test.js` | **28 bestanden.** Enthalten sind Katalog, Freigaben, Frontmatter aller 17 Dateien, Volltexte, Zeichenkodierung, Links, reproduzierbare Ausgaben, GitHub-Fehler, SFTP-Sperren, Erstinstallation und Rollback. Die Graphprüfung erreicht jeden Node von einem Trigger aus, prüft alle Ausgänge und schliesst Zyklen, doppelte Kanten und unerwartete Endpunkte aus. |
| `node automation/n8n/build-workflows.js --check` | Beide Workflow-JSONs und der Node-Katalog stimmen bytegenau mit dem Generator überein. |
| Versionen und Node-Parameter | Alle 139 Nodes der beiden Exporte gegen die mit n8n 2.47.7 installierten Definitionen einschliesslich der verschachtelten Parameter geprüft. Paketversionen sind Nodes 2.47.5, Workflow 2.47.2, Core 2.47.4 und JavaScript-Runner 2.47.4. |
| n8n-CLI 2.47.7 mit isolierter Cloud-Datenbank | Beide ausgelieferten JSON-Dateien importiert. |
| n8n-CLI 2.47.7 mit simulierten HTTP-Endpunkten | Lauf ohne Freigaben, vollständiger Trockenlauf mit zwei Testfreigaben und Wiederholung nach HTTP 503 erfolgreich. Raw und Base64 liefen im echten JavaScript-Runner. |
| n8n-CLI 2.47.7 mit isoliertem SFTP-Testserver | Aktualisierung, Rücksicherung nach Fehler beim zweiten Rename und Rücksetzen nach fehlgeschlagener Erstinstallation geprüft. Beide Sicherungen blieben bei der Rücksicherung vorhanden. Eine temporäre Testkopie liess für diese CLI-Tests den Ausführungsmodus `cli` zu. |
| Isolierte n8n-2.47.7-Instanz mit regulärem Zeitplan und Error Workflow | Beide Testworkflows ohne SMTP-Credentials veröffentlicht. Der echte Schedule Trigger startete die SFTP-Aktualisierung im Modus `trigger`. Nach einem erzwungenen Rename-Fehler wurden beide Originale wiederhergestellt. Der veröffentlichte Error Workflow meldete `activation_failed`, die Commit-SHA und den Status `restored`. Die Testkopie verwendete ein kurzes Intervall, gespeicherte Testausführungen und lokale HTTP- und SFTP-Endpunkte. |
| Repository-Qualität | Relative Markdown-Links und `git diff --check` inklusive der neu erstellten Dateien geprüft. |

Für die Wiederholung lief der JavaScript-Runner als separater Prozess in der isolierten Cloud-Umgebung. Damit entfiel die frühere Warnung zum fehlenden Python-Runner. Der isolierte SFTP-Testserver handelte SSH-Kompression `none` aus. Die SSH-Konfiguration und das Rename-Verhalten des produktiven Providers sind auf separaten Testpfaden abzunehmen.

## Zielinstanz und Freigabe

1. Konfiguration und Workflow-Dateien über den regulären Repository-Review bereitstellen. Die Laufzeit liest die Konfiguration erst, wenn sie auf `main` verfügbar ist.
2. Beide Workflows in n8n 2.47.7 importieren, GitHub Header Auth mit `Repository Contents: Read` in den zwölf GitHub-Nodes zuordnen, Error Monitoring veröffentlichen und in den Build-Einstellungen auswählen.
3. Ersten manuellen Lauf ohne Freigaben ausführen. Danach redaktionell geprüfte Freigaben und belegte öffentliche Dokument-URLs eintragen und beide Kandidaten, den Grössenvergleich sowie den Fehlerpfad prüfen.
4. Provider-Document-Root, privaten Arbeitsbereich, SFTP-Zugang, statische WordPress-Auslieferung, AIOSEO/Squirrly und Cache-Verhalten abnehmen. Rename, Restore und Teilfehler zunächst auf separaten SFTP-Testdateien prüfen. Die Betreiberinstanz im regulären Modus mit Produktionslimit 1 und exklusivem Schreiber bestätigen.
5. SMTP-Ziel einrichten und Fehlerzustellung testen. Erst nach der Abnahme die Deployment-Freigabe setzen, den Schedule Trigger aktivieren und die beiden öffentlichen Dateien nach dem ersten geplanten Lauf bestätigen. [Vollständige Installationsschritte](INSTALLATION.md)

Import und Betrieb auf der Zielinstanz, produktiver Provider, öffentliche Auslieferung zum vorgesehenen Termin und SMTP-Zustellung sind noch abzunehmen. Wenn sicherer Rename, geeignete SFTP-Verbindung oder der exklusive Schreiber beim Betreiber fehlen, bleibt das Deployment deaktiviert. Der [Installationsleitfaden](INSTALLATION.md#4-sftp-credential-und-provider-abnahme) beschreibt die Alternative über einen Release- oder Freigabeprozess des Providers.

**Empfohlene Commit-Nachricht** `Add n8n 2.47.7 Knowledge automation and LLM generator`
