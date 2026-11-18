# Installation der Knowledge-Automation in n8n

## 1. Voraussetzungen

Verwende die vorhandene selbst gehostete Installation **n8n 2.47.7**. Die beiden Workflows laufen dort mit Standard-Nodes und der bestehenden Binary-Data-Konfiguration. Erforderlich sind ausgehender HTTPS-Zugriff auf `api.github.com` und die freigegebenen Websites, später ein SFTP-Zugang zum Provider und optional SMTP. GitHub bleibt Quelle der Knowledge-Dateien. Die Automatisierung schreibt ausschliesslich die zwei LLM-Textdateien und ihre privaten SFTP-Artefakte.

Prüfe vor der Produktionsfreigabe die Betriebsart der vorhandenen Instanz. Der unterstützte Schreibbetrieb erfordert eine einzige bestehende n8n-Instanz im regulären Modus mit folgenden Werten:

```dotenv
EXECUTIONS_MODE=regular
N8N_CONCURRENCY_PRODUCTION_LIMIT=1
```

Diese Grenze gilt instanzweit auch für andere produktive Ausführungen. n8n 2.47.7 schliesst manuelle Läufe und Ausführungswiederholungen von dieser Produktionsgrenze aus. Der vorliegende Schreibpfad verlangt den tatsächlichen Modus `trigger` und bindet SFTP-Pfade an die geplante Ausführungs-ID. Verwende einen einzigen aktivierten Zeitplan und genau einen Schreiber für diese Dateipfade. Bestätige dies erst danach mit `monitoring.singleWriterVerified: true`. Der Transaktionsmarker ist ein persistentes Wiederherstellungssignal. Die Serialisierung selbst übernimmt die Betriebsart von n8n. Wenn sich diese Betriebsart oder die exklusive Schreibzuständigkeit nicht sicher einrichten lässt, bleibt das Deployment aus. Verwende in diesem Fall einen Betreiberprozess mit einem persistenten exklusiven Lock und der Freigabefunktion des Providers.

## 2. GitHub-Credential und Konfiguration

1. Erstelle ein auf `mniconsult/mni-Knowledge-Hub` begrenztes GitHub-Token mit **Repository Contents: Read** und verwalte dessen Ablauf und Rotation. GitHub erteilt bei einem Fine-grained Token zusätzlich die technisch erforderliche Leseberechtigung auf Repository-Metadaten.
2. Lege in n8n ein **Header Auth** Credential mit Header `Authorization` und Wert `Bearer <Token>` an. Der Token bleibt ausschliesslich im Credential.
3. Stelle [die zentrale JSON-Konfiguration](../../config/llms-config.json) über den normalen Reviewprozess auf `main` bereit. Der erste Workflow-Lauf ohne die Datei auf `main` stoppt mit HTTP 404. Änderungen an der Konfiguration und die einzubeziehenden Markdown-Dateien müssen im Repository-Review geprüft werden.
4. Führe den ersten manuellen Lauf mit unveränderter Konfiguration aus. Erwarte `no-approved-documents`, 17 katalogisierte und 0 freigegebene Dokumente.
5. Für einen vollständigen Trockenlauf setze bei redaktionell geprüften Dateien `approved: true` und die gewünschten `includeInIndex`- beziehungsweise `includeFullText`-Werte. Behandle `publicUrl` getrennt. Trage eine bestätigte direkte HTTPS-URL des gleichen Dokuments ein oder behalte `null`. Prüfe Titel, Beschreibung und alle im Volltext verbleibenden Links. Die geschützten Dokumente im Katalog dürfen nicht freigegeben werden.

`generation.maximumSourceBytes` und `generation.maximumOutputBytes` begrenzen Quellen und Ausgaben. `monitoring.minimumSizeRatio` startet bei `0.5`. Eine Änderung dieser Grenze erfordert einen fachlichen Vergleich beider Dateien mit der öffentlichen Referenz. Das Ersetzen eines alten, deutlich grösseren Bestands wird dadurch bewusst gesperrt. `deployment.enabled`, `allowFirstInstallation`, `providerRenameVerified` und `monitoring.singleWriterVerified` starten mit `false`.

## 3. Import und manuelle Tests

1. Importiere zuerst [Error Monitoring](error-workflow.json) und danach [LLM Build & Publish](build-llms-workflow.json) über **Import from File**. Der Build-Workflow startet unveröffentlicht und der Zeitplan-Node deaktiviert.
2. Ordne in den zwölf GitHub-HTTP-Nodes das Header-Auth-Credential zu. Die öffentlichen HTTP-Nodes benötigen kein Credential.
3. Veröffentliche **Error Monitoring** in n8n und wähle ihn in den Workflow-Einstellungen des Build-Workflows aus. n8n 2.47.7 führt einen unveröffentlichten Error Workflow bei einem automatischen Fehler nicht aus. Der deaktivierte Mail-Node erlaubt die Veröffentlichung ohne SMTP-Credential.
4. Starte den manuellen Workflow mit **Execute Workflow**. Prüfe nach dem Freigabetest die Commit-SHA, das Manifest und die beiden Texte am Node **Beide LLM-Dateien generieren**. Kontrolliere am Node **Ausgaben validieren** die Dateigrössen, Querverweishinweise und Anzahl der freigegebenen Kapitel. Im letzten Bericht stehen Vergleichsstatus, `reasons` und `deployed: false`.
5. Prüfe das Referenzpaar. Beide vorhandenen Dateien müssen direkt per HTTPS als `text/plain` mit gültigem UTF-8 abrufbar sein. Zwei 404-Antworten sind für eine Erstinstallation zulässig, sofern diese genehmigt wird und SFTP bestätigt, dass beide Zielpfade frei sind. Bei einer 200/404-Mischung muss der Betreiber den Bestand zuerst klären.
6. Prüfe die Fehlerüberwachung mit einem bewusst fehlerhaften isolierten Test-Workflow und kontrollierter automatischer Ausführung. n8n startet den Error Workflow bei manuellen Fehlern nicht automatisch. Ein manueller Lauf des Error Workflows verwendet das n8n-Beispielereignis.

## 4. SFTP-Credential und Provider-Abnahme

1. Richte in n8n ein **SFTP**-Credential mit Provider-Host, Port, separatem Konto und bevorzugt Schlüssel, bei Bedarf Passphrase, ein. Begrenze den Zugang auf das benötigte Provider-Verzeichnis und den privaten Arbeitsbereich. Ordne das Credential sämtlichen FTP-Nodes im Modus SFTP zu.
2. Lass dir den SFTP-Pfad des Document Root für `mniconsult.ch` vom Provider bestätigen und trage ihn bei `deployment.remoteDirectory` ein. Er muss zum HTTPS-Virtual-Host passen. Richte `deployment.privateDirectory` vorab ein. Es muss ausserhalb des Webroots und auf demselben Dateisystem liegen. Kläre mit dem Provider, dass Staging-Dateien, Sicherungen und Marker dort nicht per HTTP erreichbar sind. Beide Werte beginnen mit `null` und erwarten absolute SFTP-Pfade ohne abschliessenden Schrägstrich.
3. Prüfe mit einer eigenen ungefährlichen Testdatei in einem vereinbarten Testverzeichnis das Schreiben, Byte-für-Byte-Rücklesen, Lesen des Verzeichnisses, Löschen und Umbenennen. Nutze dazu auf der vorhandenen Instanz einzelne FTP-Nodes im SFTP-Modus in einem temporären Test-Workflow. Prüfe den Rename sowohl auf ein neues Ziel als auch auf ein vorhandenes Testziel und jeweils über dieselbe Verzeichnisgrenze wie später beim Deployment. Prüfe, dass die Zielbytes vollständig ersetzt werden, ein fehlgeschlagener Rename das bisherige Ziel erhält und Backup-Rename die alten Bytes wiederherstellt. Simuliere getrennt einen Fehler nach dem ersten von zwei Renames. Verwende für diese Abnahme ausschliesslich Testpfade.
4. Der Standard-Node nutzt gewöhnliches SFTP `rename` und bietet keinen Schalter für die OpenSSH-Erweiterung `posix-rename@openssh.com`. Übliche SFTP-Server erlauben mit dem gewöhnlichen Rename kein Überschreiben eines bestehenden Ziels. Setze `providerRenameVerified: true` erst nach erfolgreicher Provider-Abnahme und Bestätigung atomaren Ersetzens je Datei. Der Standard-Node bietet auch kein Host-Key-Pinning. Kläre die gesicherte Verbindung zur Provider-Identität mit dem Betreiber. Solange diese Voraussetzungen ungeklärt sind, bleibt `deployment.enabled: false`.
5. Falls gewöhnliches Rename bestehende Dateien nicht sicher ersetzt, verwende die generierten Dateien mit dem versionierten Release- oder Dateifreigabeprozess des Providers. Ein Provider-Verfahren, das zuerst das gesamte Paar vorbereitet, atomar umschaltet und einen vorigen Stand wieder einsetzen kann, schützt auch vor gemischter öffentlicher Auslieferung. Plane den Betreiberprozess ohne zusätzliche Container auf der n8n-Installation.

## 5. WordPress, AIOSEO und Squirrly

Prüfe mit dem Website-Betreiber, ob WordPress, AIOSEO, Squirrly, eine Weiterleitung oder ein Cache bereits `/llms.txt` oder `/llms-full.txt` bedient. Prüfe pro URL, ob der Webserver die SFTP-Datei statisch ausliefert, ob der Content-Type `text/plain` und der Inhalt exakt sind und ob ein CDN die geänderten Bytes beim Verify-Request liefert. Verwende pro Pfad nur eine freigegebene Quelle. Falls ein Plugin diese Endpunkte erzeugt und der Betreiber auf statische Dateien wechselt, prüft und ändert er die entsprechende Funktion in der vorhandenen Plugin-Version selbst. Die Automatisierung nimmt keine WordPress- oder Plugin-Einstellungen vor.

## 6. Aktivierung und Monitoring

1. Richte beim Error Workflow im Code-Node **Fehlerbenachrichtigung konfigurieren** die Betreiberadressen ein und setze `enabled: true`. Weise **Fehler per E-Mail melden** ein SMTP-Credential zu und aktiviere den Node. Optional kannst du im Build-Workflow die Erfolgsbenachrichtigung gleich konfigurieren, den Sende-Node aktivieren und in der JSON-Konfiguration `monitoring.notifyOnSuccess` freigeben. Verwende nur von der Organisation freigegebene Adressen. `monitoring.notifyOnError` ist für den Versand standardmässig aktiviert. Fehler vor dem Laden der Konfiguration werden standardmässig meldefähig behandelt.
2. Gib das Deployment erst nach erfolgreicher Abnahme frei. Dazu gehören die verifizierten SFTP-Pfade, geeignete direkte öffentliche URLs, ein sinnvoller Linkindex und Volltext, `providerRenameVerified`, `singleWriterVerified` sowie explizit `deployment.enabled: true`. Für zwei nachgewiesen fehlende Dateien kann zusätzlich einmalig `allowFirstInstallation: true` gesetzt werden.
3. Aktiviere **Täglicher Zeitplan**, prüfe `Europe/Zurich` und veröffentliche den Build-Workflow. Der vorgeschlagene tägliche Termin ist **04:15 Uhr**. Wähle bei Bedarf ein betreutes Zeitfenster für die erste geplante Ausführung und veröffentliche danach den endgültigen Zeitplan.
4. Prüfe nach dem ersten automatisch geplanten Lauf beide Remote-Dateien und beide öffentlichen URLs. Bei weiteren unveränderten Läufen erwarte `up-to-date`. Kontrolliere bei Fehlermeldungen Schritt, Datei, Commit, Deployment- und Rollback-Status. Für persistente Statusmeldungen stehen SMTP oder das Server-Log über `CODE_ENABLE_STDOUT=true` zur Verfügung. Prüfe vor dem instanzweiten Einschalten der Code-Ausgabe die übrigen Workflows auf vertrauliche Log-Inhalte. Prüfe die öffentlichen URLs und den privaten Marker auch über das bestehende Betriebsmonitoring.
5. Setze `allowFirstInstallation` nach erfolgreicher Erstinstallation wieder auf `false`.

## 7. Wiederherstellung

Die beiden Live-Dateien werden nacheinander umbenannt. Es kann daher kurz ein gemischter Stand sichtbar sein. Der n8n-Standard-Node bietet keine gemeinsame atomare Umschaltung für zwei Dateien. Sobald die Aktivierung beginnt, schützt ein privater `mni-llms-pending-*.json`-Marker vor einem Folgelauf nach Abbruch. Bei Fehlern bleiben Marker und verfügbare Sicherungen für die Betreiberprüfung erhalten.

1. Stoppe den Zeitplan, sobald ein Marker stehen bleibt, und prüfe, ob noch eine Ausführung läuft. Öffne den privaten Marker. Er enthält den Commit, den Installationsmodus und die exakten Pfade nach Datei. Der Provider kann ggf. seine eigene Sicherung verwenden.
2. Vergleiche die öffentlichen URLs sowie beide Live-Dateien im SFTP-Bestand mit der zuletzt bestätigten Version. Bei fehlgeschlagener Erstinstallation entferne nur bestätigte Kandidatendateien dieses Laufs. Bei einer Aktualisierung stelle die fehlenden oder abweichenden Originale aus den zum Marker gehörenden `.bak`-Sicherungen wieder her. Der automatische Rollback verwendet separate `.restore`-Kopien und erhält die Sicherungen. Wenn eine erwartete Sicherung fehlt oder Marker bzw. Dateizustand widersprüchlich sind, verwende den früheren bestätigten Provider-Stand.
3. Verifiziere das vollständige Paar über SFTP und öffentlich, bei einer zurückgesetzten Erstinstallation beide SFTP-Abwesenheiten und beide HTTP-404-Antworten. Entferne den Marker erst nach der Bestätigung. Aktiviere danach den Zeitplan erneut. Setze keine fehlgeschlagene Produktionsausführung über n8n **Retry** fort.
4. Halte private Staging-, Rollback- und Sicherungsdateien nach dem bestehenden Aufbewahrungsprozess. Entferne nur eindeutig zugeordnete, nicht mehr benötigte Artefakte ausserhalb laufender Veröffentlichungen.

## 8. Updates und Wartung

Wiederhole nach Änderungen die Offline-Prüfung aus der [Workflow-Dokumentation](README.md). Prüfe nach n8n- oder Provider-Updates erneut Node-Kompatibilität, Import, Dry Run, Test-Renames, Fehlerpfade und die Concurrency-Einstellung. Beim Ersetzen eines Workflows bleiben die bestehenden Credentials in n8n. Prüfe die Zuordnungen, den Error Workflow, Betreiberadressen, Zeitplan und Freigabestatus im neu importierten Workflow. Deaktiviere die frühere Version, bevor du die neue produktiv veröffentlichst.
