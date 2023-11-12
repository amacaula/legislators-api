import { parse, HTMLElement, Node, TextNode } from 'node-html-parser';
const fs = require("fs");
import { Legislator, TypedAddress } from '../types';
const { XMLParser } = require("fast-xml-parser");

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

const STOP_TAGS = ["H3", "DIV", "P"];

// TODO replace with proper logging
const logger = {
    log: (s: string) => console.log(s),
    warn: (s: string) => console.warn(s),
    error: (s: string) => console.error(s)
}

/**
 * Reads all general data about legislators from the following sources:
 * - data/addresses-members-of-parliament.html
 * - data/parliament-members.html
 * @returns 
 */
export function getAllLegislators(): Array<Legislator> {

    // Process the HTML file containing the list of all legislators addresses
    const html = fs.readFileSync("data/addresses-members-of-parliament.html", "utf8");
    const root = parse(html);
    const blocks = root.querySelectorAll("div").filter(a => a.childNodes.length === 13);
    let legislatorsById = new Map<string, Legislator>();
    blocks.map(htmlBlockToLegislator).forEach((l: Legislator) => legislatorsById.set(l.id, l));

    // Process XML file containing 
    const xml = fs.readFileSync("data/parliament-members.xml", "utf8");
    const parser = new XMLParser();
    let xmlData = parser.parse(xml);
    xmlData.ArrayOfMemberOfParliament.MemberOfParliament.forEach((mp: XMLMemberOfParliament) => {
        mergeInConstituencyData(legislatorsById, mp);
    });

    return Array.from(legislatorsById.values());
}

function mergeInConstituencyData(legislatorsById: Map<string, Legislator>, xmlData: XMLMemberOfParliament) {
    let id = `${xmlData.PersonOfficialLastName}, ${xmlData.PersonOfficialFirstName}`;
    let leg = legislatorsById.get(id);
    if (leg) {
        let leg = legislatorsById.get(id) as Legislator;
        leg.constituency = xmlData.ConstituencyName;
        leg.party = xmlData.CaucusShortName;
        leg.province = xmlData.ConstituencyProvinceTerritoryName;
        leg.fromDate = xmlData.FromDateTime.substring(0, 10);
    } else {
        logger.warn(`mergeInConstituencyData: UNKNOWN legislator id = ${id}`)
    }
}

function defaultLegislator(first: string, last: string) {
    return {
        id: `${last}, ${first}`, firstName: first, lastName: last,
        isCurrent: true, fromDate: "",
        province: "", constituency: "", party: "",
        addresses: [],
    };
}

/**
 * Process extracted HTML file from 
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
        if (addr.length > 0) a.physical = addr;;

        let otherProperties = extractNamedAttributes(cursor);
        a = { ...a, ...otherProperties };

        rtn.addresses.push(a);
    }
    return rtn;
}

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


