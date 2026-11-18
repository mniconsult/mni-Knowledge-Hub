# mniConsult Knowledge Hub in n8n

Die Workflows erzeugen `llms.txt` und `llms-full.txt` aus einem einzelnen GitHub-Commit und können das geprüfte Dateipaar über SFTP bereitstellen. Die Zielversion ist n8n **2.47.7**. Der [Installationsleitfaden](INSTALLATION.md) beschreibt Testlauf, Freigabe und Wiederherstellung. Der [Abschlussbericht](abschlussbericht.md) erfasst den Teststand und die offene Betreiberabnahme.

## Ablauf und Vertrauensgrenzen

1. Der Workflow liest den Commit von `main` und seinen vollständigen Git-Baum über die GitHub-API. Für Konfiguration und freigegebene Dokumente sind nur reguläre Git-Dateien zulässig. Der Workflow prüft die Bytezahl anhand des Baums und bei einer Base64-Antwort zusätzlich die Blob-SHA aus den Antwortmetadaten. Das Header-Auth-Credential braucht Leserechte für den Repository-Inhalt.
2. [Die Konfiguration](../../config/llms-config.json) katalogisiert alle 17 Knowledge-Dateien. Sie startet mit 0 Freigaben. `avatar.md`, `roadmap.md` und der interne Repository-Index bleiben auch bei fehlerhaften Konfigurationsänderungen gesperrt.
3. Nur ausdrücklich freigegebene Dokumente werden abgerufen. Die Verarbeitung benötigt ein valides YAML-Frontmatter und eine H1 am Dokumentanfang. Sie erhält Listen, Tabellen und Codeblöcke, vereinheitlicht ATX-Überschriften und behandelt erschlossene Querverweise als Anker, öffentliche Links oder ausgelassene Links. Technische Kommentare ausserhalb von Codeblöcken werden entfernt. Interne Textpassagen können mit `<!-- mni:internal:start -->` und `<!-- mni:internal:end -->` auf eigenen Zeilen begrenzt werden. Die redaktionelle Freigabe umfasst auch unmarkierte Passagen und Codebeispiele.
4. Ein `publicUrl`-Wert ist ein von der Redaktion bestätigtes, öffentliches Pendant desselben Dokuments. `null` schliesst den Eintrag aus dem Linkindex aus. Der Volltext kann ohne öffentliche Einzel-URL freigegeben werden. Publiziert werden nur ein nutzbarer Linkindex und mindestens ein vollständiges Dokument. Die URL-Prüfung deckt HTTPS, erlaubte Hosts und vor der Übertragung eine direkte HTTP-200-Antwort ab. Die inhaltliche Übereinstimmung bestätigt die Redaktion.
5. Die Qualitätssicherung prüft beide Dateien und liefert ein JSON-Ergebnis. Der Vergleich verwendet den vollständigen öffentlichen UTF-8-Text sowie die Bytezahl. Bei zwei 404-Antworten ist eine ausdrücklich freigegebene Erstinstallation nötig. Ein gemischter Bestand aus 200 und 404 sowie ein Unterschreiten der Grössengrenze sperren das Deployment.
6. Der Schreibpfad prüft den SFTP-Bestand und liest Sicherungen, separate Rollback-Kopien, Staging und Transaktionsmarker zurück. Der Workflow meldet Erfolg nach Verifikation beider öffentlichen Dateien und Entfernen des Markers. Nach einem Aktivierungs- oder Auslieferungsfehler bleiben die `.bak`-Dateien erhalten. Die Rollback-Prüfung umfasst beide Dateien am SFTP-Ursprung und an den öffentlichen URLs. Ein verbliebener Marker sperrt weitere Läufe.

Alle Produktionsschritte laufen in Standard-Nodes. Der Workflow benötigt weder Community-Nodes noch npm-Installationen, Code-Freigaben für externe Module oder eigene Services. Der Markdown-Node enthält den Loader und das Core-Schema aus [js-yaml 4.2.0](https://www.npmjs.com/package/js-yaml/v/4.2.0) als CommonJS-Bundle. Für die gehärtete n8n-Code-Sandbox wurde dieses Bundle aus `lib/loader.js` und `lib/schema/core.js` mit esbuild 0.28.2 erzeugt. Die [MIT-Lizenz](modules/vendor/js-yaml-license.txt) liegt bei. Die Node-Definitionen wurden mit den Abhängigkeiten `n8n-nodes-base@2.47.5`, `n8n-workflow@2.47.2` und `n8n-core@2.47.4` des Zielrelease abgeglichen.

Der HTTP-Node verwendet je Dokument ein eigenes Request-Item. Der nachfolgende Code-Node führt die Antworten zusammen, prüft Anzahl und Zuordnung und liefert erst dann den vollständigen Satz. Dadurch braucht der Workflow keinen zusätzlichen Loop Over Items-, Aggregate- oder Merge-Node.

## Wartung und Offline-Prüfung

Die Dateien unter [modules](modules/) sind die einzige Quelle der eingebetteten Geschäftslogik. `build-workflows.js` erzeugt die beiden Workflow-Exporte und den Node-Katalog reproduzierbar. Mit Node.js 24 in der Codex-Cloud:

```sh
node automation/n8n/build-workflows.js
node automation/n8n/build-workflows.js --check
node --test automation/n8n/tests/*.test.js
git diff --check
```

Die Ausgaben enthalten keine dynamischen Zeitangaben. Neue Markdown-Syntax, neue Hostnamen und Änderungen an der öffentlichen Zuordnung müssen vor einer Freigabe geprüft werden. Bei mehreren Dateien taktet der HTTP-Node die Request-Starts um 300 ms. Bei einem transienten Fehler kann der Workflow die gepinnte Gruppe wiederholen. `Retry-After` und der Zeitpunkt der Kontingent-Freigabe werden bis zur Wartegrenze von 30 Sekunden berücksichtigt. Das Workflow-Limit für Konfigurationsdaten beträgt 256 KiB. Der Katalog begrenzt Markdown-Quellen auf standardmässig 2 MB und jede Ausgabe auf 10 MB. Die Dateigrössenprüfung erfolgt nach Empfang der Antwort.

Normale Testläufe behalten die Kandidaten im manuellen n8n-Ausführungsprotokoll. Gespeicherte Produktionsdaten sind im Export deaktiviert. Die bereinigten Statusmeldungen lassen sich über die optionalen SMTP-Meldungen oder mit `CODE_ENABLE_STDOUT=true` über das Server-Log erfassen. n8n 2.47.7 übernimmt die Einstellung für alle Code-Nodes der Instanz. Ein n8n-Ausführungsabbruch oder Prozessausfall nach dem Marker erfordert die dokumentierte Wiederherstellung, auch wenn der Error Workflow nicht ausgelöst wird.

## Node-Katalog

<!-- node-catalogue:start -->

### Build und Deployment

| Node | Typ | Eingabe | Ausgabe | Credential | Parameter und Fehlerverhalten |
| --- | --- | --- | --- | --- | --- |
| Manueller Start | manualTrigger | Manueller Start | Testlauf | — | SFTP bleibt für diesen Startpfad gesperrt. |
| Täglicher Zeitplan | scheduleTrigger | Trigger nach Veröffentlichung | Geplanter Lauf | — | Täglich 04:15 Uhr Europe/Zurich. Deaktiviert ausgeliefert. |
| Testlauf kennzeichnen | code | Startsignal | GitHub-URL und Laufmodus | — | Produktiver Zeitplan plus Produktionsmodus für die SFTP-Freigabe erforderlich. |
| Zeitplan kennzeichnen | code | Startsignal | GitHub-URL und Laufmodus | — | Produktiver Zeitplan plus Produktionsmodus für die SFTP-Freigabe erforderlich. |
| GitHub-Commit vorbereiten | code | Modus und Ref-URL | Ein Request-Item | — | Ein Startpfad pro Ausführung. |
| GitHub-Baum vorbereiten | code | Commit-Antwort für main | Unveränderlicher Commit und Baum-URL | — | Prüft Commit-SHA und zugehörige Baum-SHA. |
| GitHub-Commit abrufen · 1 | httpRequest | GitHub-URL je Item | HTTP-Status, Header und Antwort | GitHub Header Auth | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| GitHub-Commit prüfen · 1 | code | Komplette HTTP-Antworten | UTF-8-Quellen oder Retry-Signal | — | Maximal drei Versuche. Limitierte transiente Fehler warten 1/2 s oder gemäss GitHub-Header. Permanente Fehler stoppen. |
| GitHub-Commit erneut versuchen? · 1 | if | Status und Wartezeit | Retry oder bestätigte Quellen | — | Nur transiente Fehler wiederholen. |
| GitHub-Commit Backoff · 1 | wait | Wartezeit | Retry-Signal | — | Maximal 30 s vor dem nächsten Versuch. |
| GitHub-Commit Anfragen wiederholen · 1 | code | Retry-Signal | Unveränderte Anfragen | — | Behält die ursprünglichen URLs und den Commit bei. |
| GitHub-Commit abrufen · 2 | httpRequest | GitHub-URL je Item | HTTP-Status, Header und Antwort | GitHub Header Auth | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| GitHub-Commit prüfen · 2 | code | Komplette HTTP-Antworten | UTF-8-Quellen oder Retry-Signal | — | Maximal drei Versuche. Limitierte transiente Fehler warten 1/2 s oder gemäss GitHub-Header. Permanente Fehler stoppen. |
| GitHub-Commit erneut versuchen? · 2 | if | Status und Wartezeit | Retry oder bestätigte Quellen | — | Nur transiente Fehler wiederholen. |
| GitHub-Commit Backoff · 2 | wait | Wartezeit | Retry-Signal | — | Maximal 30 s vor dem nächsten Versuch. |
| GitHub-Commit Anfragen wiederholen · 2 | code | Retry-Signal | Unveränderte Anfragen | — | Behält die ursprünglichen URLs und den Commit bei. |
| GitHub-Commit abrufen · 3 | httpRequest | GitHub-URL je Item | HTTP-Status, Header und Antwort | GitHub Header Auth | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| GitHub-Commit prüfen · 3 | code | Komplette HTTP-Antworten | UTF-8-Quellen oder Retry-Signal | — | Maximal drei Versuche. Limitierte transiente Fehler warten 1/2 s oder gemäss GitHub-Header. Permanente Fehler stoppen. |
| GitHub-Konfiguration vorbereiten | code | Vollständiger Baum des gepinnten Commits | Bestätigte reguläre Datei und Config-URL | — | Fehlende Einträge, Symlinks, Submodule und abgeschnittene Bäume sperren den Abruf. |
| GitHub-Baum abrufen · 1 | httpRequest | GitHub-URL je Item | HTTP-Status, Header und Antwort | GitHub Header Auth | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| GitHub-Baum prüfen · 1 | code | Komplette HTTP-Antworten | UTF-8-Quellen oder Retry-Signal | — | Maximal drei Versuche. Limitierte transiente Fehler warten 1/2 s oder gemäss GitHub-Header. Permanente Fehler stoppen. |
| GitHub-Baum erneut versuchen? · 1 | if | Status und Wartezeit | Retry oder bestätigte Quellen | — | Nur transiente Fehler wiederholen. |
| GitHub-Baum Backoff · 1 | wait | Wartezeit | Retry-Signal | — | Maximal 30 s vor dem nächsten Versuch. |
| GitHub-Baum Anfragen wiederholen · 1 | code | Retry-Signal | Unveränderte Anfragen | — | Behält die ursprünglichen URLs und den Commit bei. |
| GitHub-Baum abrufen · 2 | httpRequest | GitHub-URL je Item | HTTP-Status, Header und Antwort | GitHub Header Auth | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| GitHub-Baum prüfen · 2 | code | Komplette HTTP-Antworten | UTF-8-Quellen oder Retry-Signal | — | Maximal drei Versuche. Limitierte transiente Fehler warten 1/2 s oder gemäss GitHub-Header. Permanente Fehler stoppen. |
| GitHub-Baum erneut versuchen? · 2 | if | Status und Wartezeit | Retry oder bestätigte Quellen | — | Nur transiente Fehler wiederholen. |
| GitHub-Baum Backoff · 2 | wait | Wartezeit | Retry-Signal | — | Maximal 30 s vor dem nächsten Versuch. |
| GitHub-Baum Anfragen wiederholen · 2 | code | Retry-Signal | Unveränderte Anfragen | — | Behält die ursprünglichen URLs und den Commit bei. |
| GitHub-Baum abrufen · 3 | httpRequest | GitHub-URL je Item | HTTP-Status, Header und Antwort | GitHub Header Auth | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| GitHub-Baum prüfen · 3 | code | Komplette HTTP-Antworten | UTF-8-Quellen oder Retry-Signal | — | Maximal drei Versuche. Limitierte transiente Fehler warten 1/2 s oder gemäss GitHub-Header. Permanente Fehler stoppen. |
| Konfiguration validieren | code | Konfigurationsinhalt am gepinnten Commit | Validierte Konfiguration und sortierte Freigaben | — | Fehlende, doppelte oder unzulässige Einträge stoppen den Lauf. |
| GitHub-Konfiguration abrufen · 1 | httpRequest | GitHub-URL je Item | HTTP-Status, Header und Antwort | GitHub Header Auth | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| GitHub-Konfiguration prüfen · 1 | code | Komplette HTTP-Antworten | UTF-8-Quellen oder Retry-Signal | — | Maximal drei Versuche. Limitierte transiente Fehler warten 1/2 s oder gemäss GitHub-Header. Permanente Fehler stoppen. |
| GitHub-Konfiguration erneut versuchen? · 1 | if | Status und Wartezeit | Retry oder bestätigte Quellen | — | Nur transiente Fehler wiederholen. |
| GitHub-Konfiguration Backoff · 1 | wait | Wartezeit | Retry-Signal | — | Maximal 30 s vor dem nächsten Versuch. |
| GitHub-Konfiguration Anfragen wiederholen · 1 | code | Retry-Signal | Unveränderte Anfragen | — | Behält die ursprünglichen URLs und den Commit bei. |
| GitHub-Konfiguration abrufen · 2 | httpRequest | GitHub-URL je Item | HTTP-Status, Header und Antwort | GitHub Header Auth | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| GitHub-Konfiguration prüfen · 2 | code | Komplette HTTP-Antworten | UTF-8-Quellen oder Retry-Signal | — | Maximal drei Versuche. Limitierte transiente Fehler warten 1/2 s oder gemäss GitHub-Header. Permanente Fehler stoppen. |
| GitHub-Konfiguration erneut versuchen? · 2 | if | Status und Wartezeit | Retry oder bestätigte Quellen | — | Nur transiente Fehler wiederholen. |
| GitHub-Konfiguration Backoff · 2 | wait | Wartezeit | Retry-Signal | — | Maximal 30 s vor dem nächsten Versuch. |
| GitHub-Konfiguration Anfragen wiederholen · 2 | code | Retry-Signal | Unveränderte Anfragen | — | Behält die ursprünglichen URLs und den Commit bei. |
| GitHub-Konfiguration abrufen · 3 | httpRequest | GitHub-URL je Item | HTTP-Status, Header und Antwort | GitHub Header Auth | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| GitHub-Konfiguration prüfen · 3 | code | Komplette HTTP-Antworten | UTF-8-Quellen oder Retry-Signal | — | Maximal drei Versuche. Limitierte transiente Fehler warten 1/2 s oder gemäss GitHub-Header. Permanente Fehler stoppen. |
| Freigegebene Dokumente vorhanden? | if | Sortierte Freigaben | Abruf oder Abschlussbericht | — | Ohne explizite Freigabe sind keine Dokumentabfragen und keine SFTP-Schritte erreichbar. |
| Ohne Freigabe beenden | code | Leere Freigabeliste | Strukturierter Status | — | Beendet den Lauf regulär ohne Dateien. |
| GitHub-Dokumente vorbereiten | code | Freigaben und bestätigte Baum-Einträge | Eine URL je regulärem freigegebenem Dokument | — | Prüft Dateityp und Grösse vor Abruf. Ausschliesslich gepinnte Quellen bis insgesamt 40 MB. |
| Markdown aufbereiten | code | Sämtliche dekodierten Quellen | Aufbereitete Dokumente und Linkhinweise | — | Striktes YAML, Markdown-Hierarchie, interne Bereiche und Querverweise. |
| GitHub-Dokumente abrufen · 1 | httpRequest | GitHub-URL je Item | HTTP-Status, Header und Antwort | GitHub Header Auth | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| GitHub-Dokumente prüfen · 1 | code | Komplette HTTP-Antworten | UTF-8-Quellen oder Retry-Signal | — | Maximal drei Versuche. Limitierte transiente Fehler warten 1/2 s oder gemäss GitHub-Header. Permanente Fehler stoppen. |
| GitHub-Dokumente erneut versuchen? · 1 | if | Status und Wartezeit | Retry oder bestätigte Quellen | — | Nur transiente Fehler wiederholen. |
| GitHub-Dokumente Backoff · 1 | wait | Wartezeit | Retry-Signal | — | Maximal 30 s vor dem nächsten Versuch. |
| GitHub-Dokumente Anfragen wiederholen · 1 | code | Retry-Signal | Unveränderte Anfragen | — | Behält die ursprünglichen URLs und den Commit bei. |
| GitHub-Dokumente abrufen · 2 | httpRequest | GitHub-URL je Item | HTTP-Status, Header und Antwort | GitHub Header Auth | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| GitHub-Dokumente prüfen · 2 | code | Komplette HTTP-Antworten | UTF-8-Quellen oder Retry-Signal | — | Maximal drei Versuche. Limitierte transiente Fehler warten 1/2 s oder gemäss GitHub-Header. Permanente Fehler stoppen. |
| GitHub-Dokumente erneut versuchen? · 2 | if | Status und Wartezeit | Retry oder bestätigte Quellen | — | Nur transiente Fehler wiederholen. |
| GitHub-Dokumente Backoff · 2 | wait | Wartezeit | Retry-Signal | — | Maximal 30 s vor dem nächsten Versuch. |
| GitHub-Dokumente Anfragen wiederholen · 2 | code | Retry-Signal | Unveränderte Anfragen | — | Behält die ursprünglichen URLs und den Commit bei. |
| GitHub-Dokumente abrufen · 3 | httpRequest | GitHub-URL je Item | HTTP-Status, Header und Antwort | GitHub Header Auth | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| GitHub-Dokumente prüfen · 3 | code | Komplette HTTP-Antworten | UTF-8-Quellen oder Retry-Signal | — | Maximal drei Versuche. Limitierte transiente Fehler warten 1/2 s oder gemäss GitHub-Header. Permanente Fehler stoppen. |
| Beide LLM-Dateien generieren | code | Geprüfte Dokumente und Konfiguration | Index, Volltext, Manifest | — | Reproduzierbare Reihenfolge und keine Laufzeitdaten in den Dateien. |
| Ausgaben validieren | code | Dateitexte und Manifest | JSON-Qualitätsbericht | — | Struktur, Grössen, URLs, Secrets, Freigaben und Vollständigkeit müssen stimmen. |
| Öffentliche Referenzen vorbereiten | code | Qualitätsbericht und Deployment-Konfiguration | Zwei öffentliche URLs | — | Feste Ziele mit Cache-Busting. |
| Öffentliche Referenzen abrufen | httpRequest | Zwei Referenz-URLs | HTTP-Status, Header und Antwort | — | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| Öffentliche Referenzen vergleichen | code | Öffentliche Antworten, Kandidaten und Qualitätsbericht | Grössenvergleich, Änderungsstatus und Freigabegründe | — | 404/200-Mix, geringe Grösse oder fehlende Freigabe blockieren den Upload. |
| Deployment freigegeben? | if | Sicherheitsentscheid | SFTP-Vorprüfung oder Trockenlauf | — | Handstarts bleiben auch bei aktiviertem Deployment trocken. |
| Trockenlauf oder Vergleich abschliessen | code | Vergleich und Freigabegründe | Strukturierter Laufbericht | — | Keine SFTP-Zugriffe. Aktive Schutzsperren bei geplantem Deployment werden gemeldet. |
| Öffentliche Indexlinks vorbereiten | code | Freigegebene Indexeinträge | Eine URL je Indexeintrag | — | Nur explizit bestätigte Katalog-URLs werden geprüft. |
| Öffentliche Indexlinks abrufen | httpRequest | Freigegebene öffentliche URLs | HTTP-Status, Header und Antwort | — | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| Deployment planen | code | Erreichbarkeit aller Indexlinks | Lauf-ID, Commit und Remote-Pfade | — | Nur direkte HTTP-200-Antworten und echte Trigger-Ausführungen. |
| Privates SFTP-Verzeichnis lesen | ftp | Festgelegtes Verzeichnis aus dem Plan | Direkte SFTP-Verzeichniseinträge | SFTP | Verzeichnis muss existieren. Verbindungsfehler als Daten. |
| SFTP-Wiederherstellungssperre prüfen | code | Inhalt des privaten Verzeichnisses | Freie Dateinamen und fehlende Sperrdateien | — | Offener Wiederherstellungsfall blockiert neue Veröffentlichungen. |
| Öffentliches SFTP-Verzeichnis lesen | ftp | Festgelegtes Verzeichnis aus dem Plan | Direkte SFTP-Verzeichniseinträge | SFTP | Verzeichnis muss existieren. Verbindungsfehler als Daten. |
| SFTP-Bestand prüfen | code | Öffentliches Verzeichnis und HTTP-Referenzstatus | Bestätigter Installationsmodus | — | Nur reguläre Dateien. Beide vorhanden oder beide ausdrücklich erwartet abwesend. |
| Erstinstallation? | if | Bestätigter Installationsmodus | Staging oder Backup | — | Bei Aktualisierung werden vorhandene Bytes gesichert. |
| SFTP-Bestand für Sicherung vorbereiten | code | Dateipfade | Zwei Original- und Sicherungspfade | — | Feste Dateireihenfolge. |
| SFTP-Originale herunterladen | ftp | Zwei SFTP-Pfade oder die gezielt zu prüfenden Pfade | Binärdatei je Item | SFTP | Vollständiges Lesen, parallele SFTP-Reads je Datei ausgeschaltet. |
| SFTP-Originale mit HTTP vergleichen | code | SFTP-Binärdateien und öffentliche Referenzen | Bestätigte Bytes beider Dateien | — | Geprüft werden sämtliche Bytes. Fehlende Dateien und Lese-/Übertragungsfehler blockieren. |
| SFTP-Sicherungen hochladen | ftp | Binärdatei und passender SFTP-Pfad | Übertragungsergebnis je Item | SFTP | Ziel im privaten Verzeichnis. Bei Fehlern kein automatischer Upload-Retry. |
| SFTP-Sicherungsprüfung vorbereiten | code | Zwei Upload-Ergebnisse | Zwei private Prüfpfade | — | Jeder Upload muss erfolgreich sein. Pfade stammen aus dem Laufplan. |
| SFTP-Sicherungen zurücklesen | ftp | Zwei SFTP-Pfade oder die gezielt zu prüfenden Pfade | Binärdatei je Item | SFTP | Vollständiges Lesen, parallele SFTP-Reads je Datei ausgeschaltet. |
| SFTP-Sicherungen bytegenau prüfen | code | SFTP-Binärdateien und öffentliche Referenzen | Bestätigte Bytes beider Dateien | — | Geprüft werden sämtliche Bytes. Fehlende Dateien und Lese-/Übertragungsfehler blockieren. |
| SFTP-Rollback-Kopien hochladen | ftp | Binärdatei und passender SFTP-Pfad | Übertragungsergebnis je Item | SFTP | Ziel im privaten Verzeichnis. Bei Fehlern kein automatischer Upload-Retry. |
| SFTP-Rollback-Kopien zum Rücklesen vorbereiten | code | Zwei Upload-Ergebnisse | Zwei private Prüfpfade | — | Jeder Upload muss erfolgreich sein. Pfade stammen aus dem Laufplan. |
| SFTP-Rollback-Kopien zurücklesen | ftp | Zwei SFTP-Pfade oder die gezielt zu prüfenden Pfade | Binärdatei je Item | SFTP | Vollständiges Lesen, parallele SFTP-Reads je Datei ausgeschaltet. |
| SFTP-Rollback-Kopien bytegenau prüfen | code | SFTP-Binärdateien und öffentliche Referenzen | Bestätigte Bytes beider Dateien | — | Geprüft werden sämtliche Bytes. Fehlende Dateien und Lese-/Übertragungsfehler blockieren. |
| Staging-Dateien vorbereiten | code | Validierte Dateien und private Staging-Pfade | Zwei Text-Items | — | Erstinstallation oder vollständig gesicherte Aktualisierung. |
| Textdateien in Binärdaten umwandeln | convertToFile | Text-Items | Zwei UTF-8-Binärdateien | — | Ohne BOM, mit festen Dateinamen. |
| SFTP-Staging hochladen | ftp | Binärdatei und passender SFTP-Pfad | Übertragungsergebnis je Item | SFTP | Ziel im privaten Verzeichnis. Bei Fehlern kein automatischer Upload-Retry. |
| SFTP-Staging-Prüfung vorbereiten | code | Zwei Upload-Ergebnisse | Zwei private Prüfpfade | — | Jeder Upload muss erfolgreich sein. Pfade stammen aus dem Laufplan. |
| SFTP-Staging zurücklesen | ftp | Zwei SFTP-Pfade oder die gezielt zu prüfenden Pfade | Binärdatei je Item | SFTP | Vollständiges Lesen, parallele SFTP-Reads je Datei ausgeschaltet. |
| SFTP-Staging bytegenau prüfen | code | SFTP-Binärdateien und generierte Dateien | Bestätigte Bytes beider Dateien | — | Geprüft werden sämtliche Bytes. Fehlende Dateien und Lese-/Übertragungsfehler blockieren. |
| SFTP-Transaktionsmarker vorbereiten | code | Bestätigte Sicherungen und Staging-Dateien | Marker mit Commit und Pfaden | — | Marker bleibt bei Aktivierungs- oder Wiederherstellungsfehlern stehen. |
| SFTP-Transaktionsmarker schreiben | ftp | Marker als UTF-8-Text | SFTP-Schreibstatus | SFTP | Persistente Wiederherstellungssperre im privaten Verzeichnis. |
| SFTP-Transaktionsmarker zurücklesen | ftp | Zwei SFTP-Pfade oder die gezielt zu prüfenden Pfade | Binärdatei je Item | SFTP | Vollständiges Lesen, parallele SFTP-Reads je Datei ausgeschaltet. |
| SFTP-Marker-Upload prüfen | code | Upload-Status des Markers | Freigabe zum Rücklesen | — | Fehler verhindern jede Live-Änderung. |
| SFTP-Aktivierung vorbereiten | code | Zurückgelesener Marker und Pfade | Zwei Rename-Items | — | Erst nach Bytegleichheit des persistenten Markers erfolgt die Aktivierung. |
| Beide SFTP-Dateien aktivieren | ftp | Quell- und Zielpfad je Datei | Rename-Ergebnis je Datei | SFTP | SFTP-Rename ohne Create Directories. Unsichere Antworten werden als mögliche Teilaktivierung behandelt. |
| SFTP-Rename-Ergebnisse prüfen | code | Rename-Ergebnis je Datei | Erfolg oder Rollback-Grund | — | Bei einem Fehler oder unvollständiger Antwort können bereits Änderungen wirksam sein. |
| Beide SFTP-Renames bestätigt? | if | Rename-Status | Öffentliche Prüfung oder Rollback | — | Teilaktivierungen gehen direkt in den Rollback. |
| Öffentliche Verifikation vorbereiten | code | Bestätigte Renames und feste URLs | Zwei neue HTTP-Requests | — | Eindeutige URL-Abfrage pro Phase. |
| Beide öffentlich ausgelieferten Dateien abrufen | httpRequest | Zwei öffentliche Prüf-URLs | HTTP-Status, Header und Antwort | — | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| Öffentliche Dateien bytegenau prüfen | code | Tatsächliche öffentliche Antworten und Kandidaten | Vergleich für beide Dateien | — | Erfolg nur bei HTTP 200 und exakter UTF-8-Übereinstimmung beider Dateien. |
| Beide öffentlichen Dateien bestätigt? | if | Öffentliche Byteprüfung | Erfolgspfad oder Rollback | — | Auch fehlende oder veraltete CDN-Antworten lösen den Rollback aus. |
| SFTP-Transaktionsmarker entfernen | ftp | Exakte SFTP-Dateipfade | Löschstatus je Datei | SFTP | Einzeldatei, keine Verzeichnisse oder rekursiven Löschungen. |
| Veröffentlichung protokollieren | code | Status des letzten SFTP-Schritts | Strukturierter Erfolgsbericht | — | Erfolg nach Verifikation beider URLs und bestätigtem Entfernen des Markers. |
| Erfolgsbenachrichtigung konfigurieren | code | Bereinigter Ergebnisbericht und Versandwunsch | Entscheid und SMTP-Adressen | — | Standardmässig aus. Manuelle Tests senden keine E-Mails. |
| Erfolgsmeldung senden? | if | Freigabewert | SMTP oder Abschlussbericht | — | Versand nur bei ausdrücklicher Konfiguration und passendem Ausführungsmodus. |
| Erfolg per E-Mail melden | emailSend | Bereinigter JSON-Bericht | SMTP-Zustellstatus | SMTP | Deaktiviert ausgeliefert. Nur bereinigte Meldungen. SMTP-Fehler bleiben erkennbar. |
| Erfolgsbericht ausgeben | code | Bericht und optionaler SMTP-Status | Bereinigter Abschlussbericht | — | Fehler beim SMTP-Versand werden im Ergebnis ausgewiesen. Der Deployment-Status bleibt erhalten. |
| Rollback-Ursache erfassen | code | Aktivierungs- oder HTTP-Fehler | Sanitisierter Grund und Installationsmodus | — | Bei Fehlern nach einem ersten Rename erfolgt eine Wiederherstellung beider Dateien. |
| Erstinstallation zurücksetzen? | if | Installationsmodus | Neu angelegte Dateien erfassen oder Backup wiederherstellen | — | Bestehende Dateien werden aus geprüften Rollback-Kopien wiederhergestellt. Sicherungen bleiben erhalten. |
| SFTP-Rollback-Renames vorbereiten | code | Dateiplan und verifizierte Rollback-Kopien | Zwei Wiederherstellungs- und Live-Pfade | — | Verwendet die separate .restore-Datei. Die .bak-Datei bleibt als Sicherung verfügbar. |
| SFTP-Rollback-Kopien aktivieren | ftp | Quell- und Zielpfad je Datei | Rename-Ergebnis je Datei | SFTP | SFTP-Rename ohne Create Directories. Unsichere Antworten werden als mögliche Teilaktivierung behandelt. |
| SFTP-Bestand nach Erstinstallation lesen | ftp | Festgelegtes Verzeichnis aus dem Plan | Direkte SFTP-Verzeichniseinträge | SFTP | Verzeichnis muss existieren. Verbindungsfehler als Daten. |
| Neu angelegte Dateien für Rollback prüfen | code | Live-Verzeichnis nach fehlgeschlagener Erstinstallation | Liste neu vorhandener regulärer Zieldateien | — | Unerwartete Dateitypen oder List-Fehler verlangen manuelle Prüfung. |
| Neu angelegte Dateien vorhanden? | if | Zu löschende Pfade | Gezielte Löschung oder Verifikation | — | Löschung ausschliesslich für bestätigte und vor dem Lauf fehlende Zieldateien. |
| Neu angelegte Dateien zum Rücklesen vorbereiten | code | Reguläre neu vorhandene Zieldateien | SFTP-Lesepfade | — | Liest bei Wiederherstellung nur betroffene Dateinamen. |
| Neu angelegte SFTP-Dateien zurücklesen | ftp | Zwei SFTP-Pfade oder die gezielt zu prüfenden Pfade | Binärdatei je Item | SFTP | Vollständiges Lesen, parallele SFTP-Reads je Datei ausgeschaltet. |
| Eigentum der neuen Dateien prüfen | code | Live-Bytes und Kandidaten des laufenden Deployments | Löschfreigabe für eigene Dateien | — | Bei abweichenden Bytes ist keine automatische Löschung erlaubt. |
| Nur eigene Dateien zum Löschen? | if | Vergleich mit den übertragenen Kandidaten | Löschen oder Prüfung ohne Löschung | — | Fremde und unlesbare Dateien bleiben erhalten. |
| Rollback-Löschpfade vorbereiten | code | Bestätigte eigene Zieldateien | Löschpfade je Datei | — | Menge wurde per Bytevergleich geprüft. |
| Neue Dateien nach fehlgeschlagener Erstinstallation entfernen | ftp | Exakte SFTP-Dateipfade | Löschstatus je Datei | SFTP | Einzeldatei, keine Verzeichnisse oder rekursiven Löschungen. |
| SFTP-Rollback-Ergebnisse auswerten | code | Wiederherstellung, Löschung oder Sperre | Operationsergebnis und Installationsmodus | — | Auch bei Fehlern werden die SFTP- und HTTP-Zustände geprüft. |
| Abwesenheit nach Rollback prüfen? | if | Installationsmodus und Operationsergebnis | Live-Verzeichnis oder Dateien prüfen | — | Erstinstallation erwartet beide Dateien abwesend. Aktualisierung erwartet beide Originale. |
| SFTP-Verzeichnis nach Rollback prüfen | ftp | Festgelegtes Verzeichnis aus dem Plan | Direkte SFTP-Verzeichniseinträge | SFTP | Verzeichnis muss existieren. Verbindungsfehler als Daten. |
| SFTP-Abwesenheit nach Rollback bestätigen | code | Aktuelles SFTP-Verzeichnis | Abwesenheit beider Zieldateien | — | Eine HTTP-404-Antwort alleine reicht für eine bestätigte Wiederherstellung nicht aus. |
| SFTP-Rollback-Volltexte vorbereiten | code | Dateiplan | Zwei Live-Pfade | — | Prüft beide Zieldateien unabhängig vom HTTP-Cache. |
| SFTP-Live-Dateien nach Rollback herunterladen | ftp | Zwei SFTP-Pfade oder die gezielt zu prüfenden Pfade | Binärdatei je Item | SFTP | Vollständiges Lesen, parallele SFTP-Reads je Datei ausgeschaltet. |
| SFTP-Originale nach Rollback bytegenau prüfen | code | Wiederhergestellte Live-Bytes und ursprüngliche Referenz | Bytevergleich beider Originale | — | SFTP-Lesefehler oder abweichende Originale verwerfen die Verifikation. |
| Öffentliche Rollback-Prüfung vorbereiten | code | Verifikation am SFTP-Ursprung und feste URLs | Zwei öffentliche HTTP-Requests | — | Prüft auch uneindeutige Rename- und Delete-Antworten. |
| Öffentlichen Rollback-Zustand abrufen | httpRequest | Zwei Rollback-Prüf-URLs | HTTP-Status, Header und Antwort | — | 15 s je Request, Starts im Abstand von 300 ms, keine Redirects. Fehler gehen als Daten an die Prüfung. |
| Rollback verifizieren und Fehler melden | code | Beide öffentlichen Ergebnisse und der Stand vor dem Lauf | Sanitisierter Fehler einschliesslich Rollback-Ergebnis | — | Marker bleibt zur Betreiberprüfung erhalten. Der Lauf schlägt auch nach erfolgreichem Rollback fehl. |

### Fehlerüberwachung

| Node | Typ | Eingabe | Ausgabe | Credential | Parameter und Fehlerverhalten |
| --- | --- | --- | --- | --- | --- |
| Workflow-Fehler empfangen | errorTrigger | n8n-Fehlerereignis | Ausführung und Workflow-Kontext | — | In den Einstellungen des Build-Workflows zuordnen. n8n löst ihn bei automatischen Fehlern aus. |
| Fehlermeldung bereinigen | code | n8n-Ereignis | Zeitpunkt, Workflow, Schritt, Fehlertyp, Datei, SHA, Deployment und Rollback | — | Verarbeitet nur erwartete Felder und verzichtet auf Rohfehler, Stacktraces und Quellinhalte. |
| Fehlerbenachrichtigung konfigurieren | code | Bereinigter Ergebnisbericht und Versandwunsch | Entscheid und SMTP-Adressen | — | Standardmässig aus. Manuelle Tests senden keine E-Mails. |
| Fehlermeldung senden? | if | Freigabewert | SMTP oder Abschlussbericht | — | Versand nur bei ausdrücklicher Konfiguration und passendem Ausführungsmodus. |
| Fehler per E-Mail melden | emailSend | Bereinigter JSON-Bericht | SMTP-Zustellstatus | SMTP | Deaktiviert ausgeliefert. Nur bereinigte Meldungen. SMTP-Fehler bleiben erkennbar. |
| Fehlerbericht ausgeben | code | Bericht und optionaler SMTP-Status | Bereinigter Abschlussbericht | — | Fehler beim SMTP-Versand werden im Ergebnis ausgewiesen. Der Deployment-Status bleibt erhalten. |

<!-- node-catalogue:end -->

## Referenzen

- [n8n Workflow-Import und -Export](https://docs.n8n.io/workflows/export-import/)
- [n8n HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [n8n Code Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/)
- [n8n FTP und SFTP](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.ftp/)
- [n8n Schedule Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/)
- [n8n Fehlerbehandlung](https://docs.n8n.io/flow-logic/error-handling/)
- [n8n Concurrency Control](https://docs.n8n.io/hosting/scaling/concurrency-control/)
- [GitHub Contents API](https://docs.github.com/en/rest/repos/contents)
- [GitHub REST API Rate Limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
