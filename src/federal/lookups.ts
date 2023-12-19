import { LegislatorLookupProvider } from "../types";
import fetch from "node-fetch";

export async function lookupLegislatorAndConsitituencyNamesByPostal(postal: string): Promise<[string, string]> {
    // Verify postal code format
    let upper = postal.toUpperCase();
    if (!upper.match(/^[A-Z]\d[A-Z].\d[A-Z]\d$/)) {
        return Promise.reject(`lookupLegislatorAndConsitituencyNamesByPostal: ${postal} -> invalid format`);
    }

    let url: string = `https://www.ourcommons.ca/Members/en/search/csv?searchText=${encodeURI(postal)}&parliament=all`;
    // This URL returns search result as CSV of format:
    // Honorific Title,First Name,Last Name,Constituency,Province / Territory,Political Affiliation,Start Date,End Date
    // ,Don,Davies,Vancouver Kingsway,British Columbia,NDP,2021-09-20 12:00:00 AM,

    return fetch(url, {})
        .then((res: any) => {
            if (res.ok) {
                return res.text();
            } else {
                return Promise.reject(`lookupLegislatorAndConsitituencyNamesByPostal: ${url} -> HTTP error: ${res.status}`);
            }
        })
        .then((body: any) => {
            if (!body) return Promise.reject(`lookupLegislatorAndConsitituencyNamesByPostal: ${url} -> no body`);
            let [_1, first, last, constituencyName] = body.split("\n")[1]?.split(",");
            if (!first || !last || !constituencyName) {
                return Promise.reject(`lookupLegislatorAndConsitituencyNamesByPostal: ${url} -> failed processing body: ${body}`);
            }
            return [`${first} ${last}`, constituencyName];
        });
}

export const MPlookupProvider: LegislatorLookupProvider = {
    lookupLegislatorAndConsitituencyNamesByPostal: lookupLegislatorAndConsitituencyNamesByPostal
}