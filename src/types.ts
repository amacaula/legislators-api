import { type } from "os"

// TODO include source URLs
// TODO allow navigation from Constituency to Legislator (and configure JSON.stringify)

// --- Government and Legislature ---

export enum GovernmentLevel {
    Federal = "federal",
    Regional = "regional",
    Municipal = "municipal"
}

export type Government = {
    id: string
    level: GovernmentLevel
    name: string
    country: string
    region: string | null
    legislature: Legislature
    constituencies: Array<Constituency>
    legislators: Array<Legislator>
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
    constituency: Constituency
    addresses: Array<TypedAddress>
    urls: LegislatorURLs
}

export type Constituency = {
    id: string
    name: string
    country: string
    region: string
    municipality: string | null
    currentLegislatorId: string | null
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