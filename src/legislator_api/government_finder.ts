import { GovernmentData } from "../types";
import { Government } from "../models";
import { MPlookupProvider } from "../federal/lookups";

// ------------------- Build up data structure of all known governments -------------------------

let ca_federal = new Government(require("../../data/ca-federal-government.json") as GovernmentData);
ca_federal.lookupProvider = MPlookupProvider;

// TODO update so that files are read in only as needed and not all up front

const governmentsById = new Map<string, Government>([
    ["ca.federal", ca_federal],
    //"ca.bc": require("../data/bc-government.json"),
    //"ca.bc.vancouver": require("../data/vancouver-government.json")
]);

// ------------------- Construct GovernmentProvider -------------------------

export async function getGovernmentbyId(id: string) {
    if (governmentsById.has(id)) {
        return Promise.resolve(governmentsById.get(id) as Government);
    } else {
        return Promise.reject(`governmentFinder.getGovernmentbyId: ${id} -> not found`);
    }
}

// TODO finish GetGovernmentProvider implementation below

/*
export type GovernmentProvider = {
    // getGovernmentsByGeoLocation: (lat: number, lon: number) => Promise<Array<Government>>
    getGovernmentbyId: (id: string) => Promise<Government>
    //getGovernmentsByCountryCity: (countryCode: string, cityName: string) => Promise<Government>
}
export const governmentFinder = {
    getGovernmentbyId: getGovernmentbyId
}
*/




