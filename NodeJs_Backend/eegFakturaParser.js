module.exports = {
    sumUpAllSmartMeters: function (eegFakturaJsonObj, debug) {     
        let nrConsumption = 0;      // Anzahl Verbrauchszaehlpunkte
        let nrGeneration = 0;       // Anzahl Erzeugungszaehlpunkte

        let eegSumMapCons = new Map();     // Summe ueber alle Verbrauchszaehlpunkte; key...timestamp, value...value-Array
        let eegSumMapGen = new Map();     // Summe ueber alle Erzeugungszaehlpunkte; key...timestamp, value...value-Array

        // ----------------- iterieren ueber Zaehlpunkte --------------------
        for (const key in eegFakturaJsonObj) {      // key...Daten eines Zaehlpunkts

            if (eegFakturaJsonObj[key].hasOwnProperty('direction') && eegFakturaJsonObj[key].hasOwnProperty('data')) {
                let isGeneration = (eegFakturaJsonObj[key].direction == "GENERATION");

                if (isGeneration) {
                    nrGeneration++;
                } else {
                    nrConsumption++;
                }

                // ----------- Energiedaten EINES einzelnen Zaehlpunkts lesen -----------  
                let arrData = eegFakturaJsonObj[key].data;


                // ------ Zum Aufsummieren in temporaere Map schreiben -------
                // -- iterieren ueber Timestamps eines Zaehlpunkts
                for (let i = 0; i < arrData.length; i++) {
                    let eegSumMap;
                    if (isGeneration) {      // ist ERZEUGUNGSZAEHLPUNKT
                        eegSumMap = eegSumMapGen;
                    } else {    // ist VERBAUCHSZAEHLPUNKT
                        eegSumMap = eegSumMapCons;
                    }

                    // -- Sind Daten Level 1 oder 2?
                    let dataValid = true;       // true, wenn alle 3 Werte dieses Timestamps Level 2, 1 oder 0 (=Zaehlpunkt nicht aktiv)
                    for (let j = 0; j < arrData[i].qov.length; j++) {        // iterieren ueber qov-Array (2 bis 3 Elemente)
                        if (arrData[i].qov[j] > 2) {      // Ein Wert des value-Arrays ist nicht Level 1 oder 2
                            dataValid = false;
                            if(debug)
                                console.log(arrData[i]);
                        }
                    }

                    // -- Vorige Zwischensumme aus Map lesen
                    let mapVal = eegSumMap.get(arrData[i].ts);  // lese von Map

                    if (mapVal == undefined) {       // timestamp existiert noch nicht in map
                        let newVal = { value: [...arrData[i].value], dataValid };
                        eegSumMap.set(arrData[i].ts, newVal);
                    } else {
                        for (let j = 0; j < arrData[i].value.length; j++) {        // iterieren ueber value-Array (2 bis 3 Elemente)
                            mapVal.value[j] += arrData[i].value[j];     // Wert auf Zwischensumme aufsummieren

                            if (mapVal.dataValid && !dataValid)      // Wenn Daten dieses Zaehlpunkts nicht L1/L2 -> gesamte Summe des aktuellen Timestamps falsch
                                mapVal.dataValid = false;
                        }
                    }

                }

            }
        }

        let eegSumArrCons = [];
        eegSumMapCons.forEach((value, key) => {
            eegSumArrCons.push({ ts: key, data: value });
        });

        let eegSumArrGen = [];
        eegSumMapGen.forEach((value, key) => {
            eegSumArrGen.push({ ts: key, data: value });
        })

        let retObj = { dataCons: eegSumArrCons, dataGen: eegSumArrGen, nrConsumption: nrConsumption, nrGeneration: nrGeneration };

        return retObj;
    }
}