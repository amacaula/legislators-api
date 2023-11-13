import { parse, HTMLElement, Node, TextNode } from 'node-html-parser';
const fs = require("fs");
import { Legislator, LegislatorURLs, TypedAddress } from '../types';
const { XMLParser } = require("fast-xml-parser");
const fetch = require('node-fetch');

// ------------------------- types and globals -------------------------

// For iterating over children nodes of an HTMLElement
type HTMLDocumentCursor = {
    nodes: Array<Node>,
    index: number
}

type XMLMemberOfParliament = {
    CaucusShortName: string // example 'Conservative'
    ConstituencyName: string // example 'Edmonton Manning'
    ConstituencyProvinceTerritoryName: string // example 'Alberta'
    FromDateTime: string // example '2021-09-20T00:00:00'
    PersonOfficialFirstName: string // example 'Ziad'
    PersonOfficialLastName: string // example 'Aboultaif'
    PersonShortHonorific: string // usually empty
}

const HOUSE_OF_COMMONS_PHYSICAL_ADDRESS = "House of Commons\nOttawa, Ontario\nCanada\nK1A 0A6";

const STOP_TAGS = ["H3", "DIV", "P"];

// TODO replace with proper logging
const logger = {
    log: (s: string) => console.log(s),
    warn: (s: string) => console.warn(s),
    error: (s: string) => console.error(s)
}

// ------------------------- functions -------------------------

function defaultLegislator(first: string, last: string): Legislator {
    return {
        id: "", nameId: makeNameId(first, last), firstName: first, lastName: last, honorific: "",
        isCurrent: true, fromDate: "",
        province: "", constituency: "", party: "",
        addresses: [], urls: {} as LegislatorURLs
    } as Legislator;
}

function makeNameId(first: string, last: string): string {
    return `${last.toLowerCase()}, ${first.toLowerCase()}`;
}

/**
 * Reads all general data about legislators from the following sources:
 * - data/addresses-members-of-parliament.html
 * - data/parliament-members.html
 * @returns 
 */
export async function getAllLegislators(): Promise<Array<Legislator>> {

    // Process the HTML file containing the list of all legislators addresses
    const addressesHTML = fs.readFileSync("data/addresses-members-of-parliament.html", "utf8"); // TODO fetch
    const root = parse(addressesHTML);
    const blocks = root.querySelectorAll("div").filter(a => a.childNodes.length === 13);
    let legislatorsByNameId = new Map<string, Legislator>();
    blocks.map(htmlBlockToLegislator).forEach((l: Legislator) => legislatorsByNameId.set(l.nameId, l));

    // Process XML file containing 
    const xml = fs.readFileSync("data/parliament-members.xml", "utf8");
    const parser = new XMLParser();
    let xmlData = parser.parse(xml);
    xmlData.ArrayOfMemberOfParliament.MemberOfParliament.forEach((mp: XMLMemberOfParliament) => {
        mergeInConstituencyData(legislatorsByNameId, mp);
    });

    // Process the search HTML to get links to contact data (for email, website, etc)
    const searchHTML = fs.readFileSync("data/Current-Members-of-Parliament-Search.html", "utf8"); // TODO fetch
    const searchRoot = parse(searchHTML);
    const anchors = searchRoot.querySelectorAll("a");
    // const promises = Array<Promise<string>>();
    anchors.filter(a => a.classNames === "ce-mip-mp-tile").forEach(a => {
        if (a.getAttribute("href")) mergeInContactLink(a.getAttribute("href") as string, legislatorsByNameId)
    });

    await Promise.all([fetchAndMergeDataFromContactLink(legislatorsByNameId.get("aboultaif, ziad") as Legislator)]);

    return Array.from(legislatorsByNameId.values());
}

/**
 * Process extracted HTML file from 
 * TODO rename to "merge" style name?
 * @param b 
 * @returns 
 */
function htmlBlockToLegislator(b: HTMLElement): Legislator {
    let name = b.childNodes[1].text;
    logger.log(`processing name = ${name}`);
    let [last, first] = name.split(", ");

    let rtn: Legislator = defaultLegislator(first, last);
    let cursor: HTMLDocumentCursor = { nodes: b.childNodes, index: 0 };
    while (cursor.index < cursor.nodes.length) {
        let type = extractAddressType(cursor);
        if (type === null) break; // no more addresses

        // Recursively process any P elements
        if ((cursor.nodes[cursor.index] as HTMLElement).tagName === "P") {
            cursor = { nodes: cursor.nodes[cursor.index].childNodes, index: 0 };
        }

        let a: TypedAddress = { type: type, physical: null, phone: "missing", fax: null };

        let addr = extractMultilineAddress(cursor);
        if (addr.length > 0) {
            a.physical = addr;
        } else if (type === "central") {
            a.physical = HOUSE_OF_COMMONS_PHYSICAL_ADDRESS;
        }

        let otherProperties = extractNamedAttributes(cursor);
        a = { ...a, ...otherProperties };

        rtn.addresses.push(a);
    }
    return rtn;
}

function mergeInContactLink(href: string, legislatorsByNameId: Map<string, Legislator>): void {
    let [nothing, members, en, rest] = href.split("/");
    let [names, id] = rest.split("(") as string[];
    id = id.substring(0, id.length - 1); // drop trailing ")"
    let [first, last] = names.split("-");

    let leg: Legislator = legislatorsByNameId.get(makeNameId(first, last)) as Legislator;
    if (leg !== undefined) {
        leg.id = id;
        leg.urls["contact"] = `https://www.ourcommons.ca${href}`;
    } else {
        logger.warn(`mergeInContactLink: UNKNOWN legislator id = ${last}, ${first}`)
    }

}

function mergeInConstituencyData(legislatorsByNameId: Map<string, Legislator>, xmlData: XMLMemberOfParliament) {
    let nameId = makeNameId(xmlData.PersonOfficialFirstName, xmlData.PersonOfficialLastName);
    let leg = legislatorsByNameId.get(nameId);
    if (leg !== undefined) {
        leg.honorific = xmlData.PersonShortHonorific;
        leg.constituency = xmlData.ConstituencyName;
        leg.party = xmlData.CaucusShortName;
        leg.province = xmlData.ConstituencyProvinceTerritoryName;
        leg.fromDate = xmlData.FromDateTime.substring(0, 10);
    } else {
        logger.warn(`mergeInConstituencyData: UNKNOWN legislator id = ${nameId}`)
    }
}

async function fetchAndMergeDataFromContactLink(leg: Legislator): Promise<void> {
    let contactURL = leg.urls["contact"];
    if (!contactURL) return Promise.resolve();
    return fetch(contactURL)
        .then((res: any) => {
            if (res.ok) {
                return res.text()
            } else {
                console.warn(`fetchAndMergeDataFromContactLink: ${contactURL} -> HTTP error: ${res.status}`);
                return
            }
        })
        .then((body: any) => {
            console.log(body)
        });
}

// ----------------------- Helper functions -----------------------

/**
 * Extract the type of an address while advancing cursor
 * Address types are included as the content of an <H3> tag
 * - keep going until an H3 tag is found
 * - extract its text content
 * @param cursor 
 * @returns 
 */
function extractAddressType(cursor: HTMLDocumentCursor): string | null {
    let nodes = cursor.nodes;
    let allowedTypes: any = { Hill: "central", Constituency: "local" };
    // iterate until we find the node were looking for or fail
    while (cursor.index < nodes.length) {
        let n: any = nodes[cursor.index++]; // get Node and advance cursor
        //console.log(cursor.index, n.tagName);
        if (n.tagName === "H3") {
            let rawType = n.text.trim().split(" ")[0]; // get first word
            if (allowedTypes[rawType]) { // whitelist checking
                eatWhitespace(cursor);
                return allowedTypes[rawType];
            } else {
                logger.error(`findAddressType: UNKNOWN raw type = ${rawType}`);
                return null;
            }
        }
    }
    return null;
}

/**
 * Extract all named attribures following Name: value pattern and verify
 * against whitelist of supported name while advancing cursor
 * - comes at the end of an address
 * - process any lines of format: <Name>: <Value>
 * - stop at any stop tag which is usually a <DIV>
 * @param cursor 
 * @returns 
 */
function extractNamedAttributes(cursor: HTMLDocumentCursor): any {
    // TODO make static
    let nameMap = new Map(Object.entries({ Telephone: "phone", Fax: "fax" }));
    const allowedNames = Array.from(nameMap.keys());

    let rtn: any = {}
    while (cursor.index < cursor.nodes.length) {
        let n = cursor.nodes[cursor.index];
        if (STOP_TAGS.includes((n as HTMLElement).tagName)) break; // start of new object
        cursor.index++;
        let [rawName, value] = n.text.trim().split(":");
        if (value) {
            if (allowedNames.includes(rawName)) {
                rtn[nameMap.get(rawName) as string] = value.trim();
            } else {
                logger.warn(`ILLEGAL attribute name: ${rawName}`);
            }
        }
    }
    return rtn;
}

/**
 * Extract a multiple line address (usually 3 or 4 lines) while advancing cursor
 * - starts with a <P> tag
 * - stops before a stop tag or a text Node containing a : (which is an attribute)
 * TODO stop on recognition of a postal code
 * @param cursor 
 * @returns 
 */
function extractMultilineAddress(cursor: HTMLDocumentCursor): string {
    let rtn = "";
    while (cursor.index < cursor.nodes.length) {
        let n = cursor.nodes[cursor.index];
        let t = n.text.trim();
        if (t.includes(":")) break; // stop for any Node containing a ":"
        let prefix = (t.length > 0 && rtn.length > 0) ? "\n" : ""; // add newline if not first line
        rtn += `${prefix}${t}` // add text content to address
        cursor.index++;
        if (STOP_TAGS.includes((n as HTMLElement).tagName)) break; // stop for any stop tag
    }
    eatWhitespace(cursor);
    return rtn;
}

/**
 * Advances cursor to next non-empty Node
 * @param cursor
 * @returns 
 */
function eatWhitespace(cursor: HTMLDocumentCursor) {
    while (true) {
        let n = cursor.nodes[cursor.index];
        if (n.toString().trim().length != 0) break;
        cursor.index++;
    }
    return;
}


