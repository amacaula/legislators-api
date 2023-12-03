import {
    AddressType, GovernmentLevel, GovernmentData, Constituency,
    Legislature, Legislator, LegislatorURLs, LegislatorLookupProvider
} from "./types";

export class Government {
    readonly id!: string;
    readonly level!: GovernmentLevel;
    readonly name!: string;
    readonly country!: string;
    readonly region: string | null;
    readonly legislature: Legislature;
    readonly expectedConstituencies: number;
    constituencies: Array<Constituency>;
    constituenciesByNameId: Map<string, Constituency>;
    legislators: Array<Legislator>;
    legislatorsByNameId: Map<string, Legislator>;
    lookupProvider!: LegislatorLookupProvider;

    constructor(data: GovernmentData) {
        this.id = data.id;
        this.level = data.level;
        this.name = data.name;
        this.country = data.country;
        this.region = data.region;
        this.legislature = data.legislature;
        this.expectedConstituencies = data.expectedConstituencies;
        // TODO use optimized data structures below
        this.constituencies = data.constituencies;
        this.constituenciesByNameId = new Map<string, Constituency>();
        this.legislators = data.legislators;
        this.legislatorsByNameId = new Map<string, Legislator>();
        this.lookupProvider = data.lookupProvider;
    }

    asGovernmentData(): GovernmentData {
        return (({ id, level, name, country, region, legislature, expectedConstituencies, constituencies, legislators, lookupProvider }) =>
            ({ id, level, name, country, region, legislature, expectedConstituencies, constituencies, legislators, lookupProvider }))(this);
    }

    async getConsitituencyByPostal(postal: string) {
        let [legName, conName] = await this.lookupProvider
            .lookupLegislatorAndConsitituencyNamesByPostal(postal);
        return this.constituencies.find(c => c.name === conName) as Constituency;
    }
    getLegislatorByFullName(first: string, last: string) {
        let nameId = makeNameId(first, last);
        return this.legislators.find(l => l.nameId === nameId) as Legislator;
    }
    searchLegistlatorsByPartialNames(partial: string) {
        return new Array<Legislator>(); // TODO implement
    }
}

// ------------------------- functions -------------------------

// TODO create separate legislators.ts file and leave only federal code here

export function defaultLegislator(first: string, last: string): Legislator {
    return {
        id: "", nameId: makeNameId(first, last), firstName: first, lastName: last, honorific: "",
        isCurrent: true, fromDate: "",
        party: "", email: "",
        addresses: [], urls: {} as LegislatorURLs,
        constituencyNameId: "UNKNOWN",
    } as Legislator;
}

export function defaultConstituency(name: string): Constituency {
    return {
        id: "",
        nameId: makeConstituencyNameId(name),
        name: name,
        country: "Canada",
        region: "",
        municipality: null,
        legislatorNameId: "VACANT"
    }
}

export function standardizeName(name: string): string {
    // Remove any trailing initials
    if (name.endsWith(".")) return name.substring(0, name.length - 3);
    // TODO replace accented letters with unaccented
    // TODO replace double spaces with one space
    // TODO generalize for any order of first and last names
    return name;
}

export function makeNameId(first: string, last: string): string {
    let firstNames = first.split(" ");
    if (firstNames.length > 1) first = firstNames[0]; // use only first name in key
    let lastNames = last.split(" ");
    if (lastNames.length > 1) last = lastNames[1]; // use only last word of last name in key
    return removeAccents(`${last.toLowerCase()}, ${first.toLowerCase()}`);
}

export function makeConstituencyNameId(name: string): string {
    return removeSpecialChars(removeAccents(name.trim().toLowerCase()));
}

function removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function removeSpecialChars(str: string): string {
    return str.replace(/\.|\'/g, '').replace(/\s|—|—'/g, '-') // many dash types
}
