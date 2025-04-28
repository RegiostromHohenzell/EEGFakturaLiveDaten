# EEG-Faktura Live-Daten für Website

Autor: Simon Angleitner, April 2025\
EEG RegioStrom Hohenzell (https://regiostrom.hohenzell.at/)

Der NodeJs-Server muss auf einem Server laufen, welcher von der Website aus erreichbar ist. Die Website lädt die Daten vom NodeJs-Server via einem HTTP-GET fetch()-Request. Auf dem Server wird dieser GET-Request dann in einen POST-Request für die API von EEG-Faktura umgewandelt (siehe https://eegfaktura.gitbook.io/eegfaktura-dokumentation/product-guides/api). Die EEG-Faktura-Zugangsdaten verlassen somit den Server nie!\
Mit dem öffentlichen API-Key `apiKeySumData`, welchen die Website verwendet, können auch nur die aufsummierten Gesamt-Daten der gesamten EEG geladen werden. Es werden also keine persönlichen Daten einzelner Zählpunkte veröffentlicht.

## Nötige Anpassungen in `index.js`:

* Die Konstanten `apiKeySumData` und `apikeyDetails` unbedingt abändern (ca. Zeile 16/17)!
Generator z.B. https://codepen.io/corenominal/pen/rxOmMJ
* EC-ID eintragen (ca. Zeile 134)
* X-Tenant eintragen (ca. Zeile 138)
* Username/Passwort des EEG-Faktura-Zugangs eintragen (ca. Zeile 141/142)
* minStart anpassen (ca. Zeile 196): kleinster möglicher Timestamp [ms] = Gründungsdatum der EEG
* Beginn der Zählpunktnummer bei Bedarf je nach Netzbetreiber anpassen (ca. Zeile 238)

## Nötige Anpassungen in `Website.html`:
* URL/IP zum NodeJs-Server eintragen (ca. Zeile 102)


## Es sind beim HTTP-GET-Request der Website verpflichtend folgende URL-Query-Parameter mit anzuführen: 

    agg (String) 
    Aggregator-String für EEG-Faktura-API. Wie Daten aggregiert werden (1h,  15min, 1d,...) 

    start (Number) 
    Start-Timestamp der Energiedaten (UNIX-Timestamp in ms) 

    end (Number) 
    End-Timestamp der Energiedaten (UNIX-Timestamp in ms), Darf nicht in der Zukunft liegen und muss größer als start sein 

    details (Bool) 
    true…Es werden die Energiedaten für jeden Zählpunkt einzeln ausgegeben (nur möglich mit korrektem API-Key, siehe unten) 
    false…Die Energiedaten werden pro Zeitslot aufsummiert und als Summe der gesamten EEG ausgegeben 

    apiKey (String)
    Ein kleines zusätzliches „Security“-Feature. Es gibt 2 verschieden API-Keys für 2 Berechtigungsstufen:
    - Mit dem Key apiKeySumData sind nur die aufsummierten Daten abrufbar (Details muss false sein, ansonsten Fehler)
    - Mit dem Key apikeyDetails sind auch die Daten einzelner Zählpunkte abrufbar (Details darf auch true sein) 
