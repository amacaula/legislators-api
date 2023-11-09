export type Legislator = {
    firstName: string,
    lastName: string,
    isCurrent: boolean,
    addresses: Array<TypedAddress>
}
export type TypedAddress = {
    type: string,
    address: string | null,
    phone: string,
    fax: string
}