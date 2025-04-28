/**
 * author: Simon Angleitner, 2025-04
 * EEG Regiostrom Hohenzell (https://regiostrom.hohenzell.at/)
 * 
 * This little NodeJs-App runs on a server, which is accessible from the website of your EEG.
 * It hosts a HTTP JSON-Rest-API. Every GET-Request of the website is transferred to a POST-Request to EEG-Faktura API (see https://eegfaktura.gitbook.io/eegfaktura-dokumentation/product-guides/api)
 * 
 * With the public api-key apiKeySumData only the summed up data of the EEG is sent to the website -> So, no sensitive information gets published to the website
 */

const express = require('express');
const axios = require('axios');

const eegFakturaParser = require('./eegFakturaParser.js');

const apiKeySumData = "5929a3a8-cbdf-4660-99a4-015919869ebf";       // details-parameter gets ignored; API-Key for client on public website -> allows getting sumed up data only
const apikeyDetails = "a451bb38-4768-4f21-a700-914aa2aad546";       // details-parameter is evaluated; API-Key for detailed information (data of every meter point seperately)

const app = express();
const PORT = 3000;
const DEBUG = true;

const AUTH_LEVEL = {     // authorization-level (depending on api-key)
    permitted : 0,
    sumData : 1,
    details : 2
}

app.use((req, res, next) => {
  res.header('Content-Type', 'application/json');
  next();
});

app.use(express.json());


/*
Response of EEGFaktura-API:

--- Consumption: ---
{
  "ts": 1742943600000,      // timestamp of data in ms (UNIX-Time)
  "value": [
    5.644,                  // Gesamtverbrauch
    3.0441170000000004,     // aus EEG verbraucht
    1.2889639999999998
  ],
  "qov": [
    1,
    1,
    1
  ]
}

--- Generation: ---
{
  "ts": 1742684400000,
  "value": [
    44.354,         // Gesamterzeugung
    34.969281
  ],
  "qov": [
    1,
    1
  ]
}
*/


// TEST-url
// summed data
// http://localhost:3000/?agg=1d&start=1742489233000&end=1742921233000&details=false&apiKey=5929a3a8-cbdf-4660-99a4-015919869ebf

// detailed data
// http://localhost:3000/?agg=1d&start=1742489233000&end=1742921233000&details=true&apiKey=a451bb38-4768-4f21-a700-914aa2aad546

app.get('/', async (req, res) => {
	
    let agg = req.query?.agg;           // aggregator-string (1h, 1d,...)
    let start = req.query?.start;       // start-timestamp in ms
    let end = req.query?.end;           // end-timestamp in ms
    let details = req.query?.details;   // true...get data of every meter point seperately
    let apiKey = req.query?.apiKey;     // api-key

    if(DEBUG) {
        console.log("agg=" + agg);
        console.log("start=" + start);
        console.log("end=" + end);
        console.log("details=" + details);
        console.log("apiKey=" + apiKey);
        console.log("checkQueryParams()=" + checkQueryParams(agg, start, end, details));
        console.log("checkAuthLevel()=" + checkAuthLevel(apiKey));
    }

    try {

        if (!checkQueryParams(agg, start, end, details)) {      // check url-query-parameter
            let errObj = { error: { origin: "error parsing url-query-params" } };
            console.log(errObj);
            res.status(500).json({ error: errObj });
        } else {
            let authLevel = checkAuthLevel(apiKey);
            details = details === "true";

            switch(authLevel) {        // check authorization-level depending on api-key
                case AUTH_LEVEL.details:
                    break;
                case AUTH_LEVEL.sumData:
                    if (details == true) {      // requested details with unauthorized api-key
                        let errObj = { error: { origin: "no detailed-view allowed with this apiKey ('details'-parameter must be false)" } };
                        console.log(errObj);
                        res.status(500).json({ error: errObj });
                        return;
                    }
                    break;
                default:        // invalid api-key
                    let errObj = { error: { origin: "invalid api-key" } };
                    console.log(errObj);
                    res.status(500).json({ error: errObj });
                    return;
            }
            // ====== here, authLevel is AUTH_LEVEL.details or AUTH_LEVEL.sumData -> So, api-request to EEGFaktura is allowed ======


            if(agg == "15m")
                agg = "";       // no aggregator needed for 15min-values
            else
                agg = "?f=agg(" + agg + ")";

            const eegFakturaApiUrl = 'https://eegfaktura.at/energystore/query/rawdata' + agg;

            if(DEBUG)
                console.log("URL=" + eegFakturaApiUrl);

            const body = { "ecId": "*******EC_ID*******", "start": Number(start), "end": Number(end) };
            const response = await axios.post(eegFakturaApiUrl, body, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant': '*******X-TENANT*******'
                },
                auth: {
                    username: '*******EEG-Faktura USERNAME*******',
                    password: '*******EEG-Faktura PASSWORD*******'
                }
            });

            if(!checkEEGFakturaResponse(response.data)) {       // check response from EEGFaktura
                let errObj = { error: { origin: "invalid response from EEGFaktura" }, eegFakturaResponse: response.data };
                console.log(errObj);
                res.status(500).json({ error: errObj });
                return;
            }
            
            if(authLevel == AUTH_LEVEL.details && details == true) {
                res.json(response.data); // send response from EEGFaktura directly to client
            } else {        // authLevel is AUTH_LEVEL.sumData OR details == false
                let sumData = eegFakturaParser.sumUpAllSmartMeters(response.data, DEBUG);      // send sumed data to client
                res.json(sumData);
            }
            
        }


    } catch (error) {
        //console.error('Fehler beim Abrufen der externen API:', JSON.stringify(error));
        let errObj = httpErrorHandler(error);
        console.log({ error: { origin: "axios-Request", error: errObj } });
        res.status(500).json({ error: errObj });
    }
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});

function checkQueryParams(agg, start, end, details) {
    if (agg == undefined || start == undefined || end == undefined || details == undefined || isNaN(start) || isNaN(end)) {
        console.log("query parameter undefined or start/end not a number");
        return false;
    }

    // check agg
    const validAggs = ["15m", "1h", "2h", "6h", "12h", "1d", "1M"];       // valid aggregators
    if (!validAggs.includes(String(agg))) {
        console.log("invalid aggregator");
        return false;
    }

    // check start > end
    if (start/1000 > end/1000) {      // divide by 1000, as otherwise the numbers would get too big
        console.log("start-time > end-time");
        return false;
    }

    // check start
    const minStart = new Date("08/01/2024 00:00:00").getTime();     // millis of Aug 1st, 2024
    if (start < minStart) {
        console.log("start-time too low");
        return false;
    }

    // check end
    if (end > Date.now()) {
        console.log("end-time is in the future");
        return false;
    }

    // check details
    if (details != "true" && details != "false") {
        console.log("details-parameter is not boolean");
        return false;
    }

    return true;
}

function checkAuthLevel(apikey) {
    if(apikey == undefined)
        return AUTH_LEVEL.permitted;

    if(apikey == apikeyDetails)
        return AUTH_LEVEL.details;

    if(apikey == apiKeySumData)
        return AUTH_LEVEL.sumData;

    return AUTH_LEVEL.permitted;
}

function checkEEGFakturaResponse(response) {
    if(response == undefined || response == {})
        return false;

    for( var key in response ) {      // iterate over all meter points
        if(!response[key].hasOwnProperty('data') || !Array.isArray(response[key].data))
            return false;

        if(!key.startsWith("AT003000"))     // meter number of NetzOOE
            return false;
    }

    return true;
}

function httpErrorHandler(error) {
    let errObj = {};
    if (error === null)
        errObj.message = 'undefined Error';
    else if (axios.isAxiosError(error)) {
        //here we have a type guard check, error inside this if will be treated as AxiosError
        const response = error?.response
        const request = error?.request

        errObj.code = error.code;


        if (response) {
            //The request was made and the server responded with a status code that falls out of the range of 2xx the http status code mentioned above
            const statusCode = response?.status
            errObj.status = statusCode;
        } else if (request) {
            //The request was made but no response was received, `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in Node.js
        }

        errObj.message = error.message;
    }

    //Something happened in setting up the request and triggered an Error
    return errObj;
}
