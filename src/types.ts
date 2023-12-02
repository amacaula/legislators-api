import { Government } from "./models";

// TODO next allow navigation from Constituency to Legislator and vice versa

// --- Government and Legislature ---

export enum GovernmentLevel {
    Federal = "federal",
    Regional = "regional",
    Municipal = "municipal"
}

export type LegislatorLookupProvider = {
    lookupLegislatorAndConsitituencyNamesByPostal: (postal: string) => Promise<[string, string]>
}

export type GovernmentData = {
    id: string
    level: GovernmentLevel
    name: string
    country: string
    region: string | null
    legislature: Legislature
    expectedConstituencies: number
    constituencies: Array<Constituency>
    legislators: Array<Legislator>
    lookupProvider: LegislatorLookupProvider // TODO next remove this from here, pass it to Government constructor
}

export type Legislature = {
    name: string
    address: TypedAddress
    urls: LegislatureURLs
    email: string
}

export type LegislatureURLs = {
    website: string
}

// --- Legislators ---

export type Legislator = {
    id: string
    honorific: string | null
    firstName: string
    lastName: string
    nameId: string
    isCurrent: boolean
    party: string
    fromDate: string
    email: string
    addresses: Array<TypedAddress>
    urls: LegislatorURLs
    constituencyNameId: string
}

export type Constituency = {
    id: string
    nameId: string
    name: string
    country: string
    region: string
    municipality: string | null
    legislatorNameId: string
}

export type TypedAddress = {
    type: AddressType
    physical: string | null
    phone: string
    fax: string | null
}

export enum AddressType {
    Central = "central",
    Local = "local",
    MainLocal = "main-local",
}

export type LegislatorURLs = {
    contact: string
    website: string
}