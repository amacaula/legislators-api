import { type } from "os"

export type Legislator = {
    id: string
    honorific: string
    firstName: string
    lastName: string
    nameId: string
    isCurrent: boolean
    addresses: Array<TypedAddress>
    province: string
    constituency: string
    party: string
    fromDate: string
    email: string
    urls: LegislatorURLs
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