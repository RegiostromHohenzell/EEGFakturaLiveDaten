Autor: Simon Angleitner, April 2025

Nötige Anpassungen in index.js:

-) Konstanten apiKeySumData und apikeyDetails unbedingt abändern!
Generator z.B. https://codepen.io/corenominal/pen/rxOmMJ

-) ED-ID eintragen (ca. Zeile 134)
-) X-Tenant eintragen (ca. Zeile 138)
-) Username/Passwort des EEG-Faktura-Zugangs eintragen (ca. Zeile 141/142)
-) minStart anpassen (ca. Zeile 196): kleinster möglicher Timestamp [ms] = Gründungsdatum der EEG
-) Beginn der Zählpunktnummer bei Bedarf je nach Netzbetreiber anpassen (ca. Zeile 238)


Nötige Anpassungen in Website.html

-) URL/IP zum NodeJs-Server eintragen (ca. Zeile 102)


Es sind beim HTTP-GET-Request der Website verpflichtend folgende URL-Query-Parameter mit anzuführen: 

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