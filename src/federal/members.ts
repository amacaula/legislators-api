import { parse, HTMLElement, Node, TextNode } from 'node-html-parser';
const fs = require("fs");
import { Legislator, TypedAddress } from '../types';

type DocumentCursor = {
    nodes: Array<Node>,
    index: number
}

const STOP_TAGS = ["H3", "DIV", "P"];
const logger = {
    log: (s: string) => console.log(s),
    warn: (s: string) => console.warn(s),
    error: (s: string) => console.error(s)
}

export function getAllLegislators(): Array<Legislator> {
    const html = fs.readFileSync("data/addresses-members-of-parliament.html", "utf8");
    const root = parse(html);
    const blocks = root.querySelectorAll("div").filter(a => a.childNodes.length === 13);

    const addrs = blocks.map(htmlBlockToLegislator);
    return addrs;
}

/**
 * Process extracted HTML file from 
 * @param b 
 * @returns 
 */
function htmlBlockToLegislator(b: HTMLElement): Legislator {
    let name = b.childNodes[1].text;
    logger.log(`processing name = ${name}`);
    let rtn: Legislator = { name: name, addresses: [] };
    let cursor: DocumentCursor = { nodes: b.childNodes, index: 0 };
    while (cursor.index < cursor.nodes.length) {
        let type = extractAddressType(cursor);
        if (type === null) break; // no more addresses

        // Recursively process any P elements
        if ((cursor.nodes[cursor.index] as HTMLElement).tagName === "P") {
            cursor = { nodes: cursor.nodes[cursor.index].childNodes, index: 0 };
        }

        let a: TypedAddress = { type: type, address: null, phone: "", fax: "" };

        let addr = extractMultilineAddress(cursor);
        if (addr.length > 0) a.address = addr;;

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
function extractAddressType(cursor: DocumentCursor): string | null {
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
function extractNamedAttributes(cursor: DocumentCursor): any {
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
function extractMultilineAddress(cursor: DocumentCursor): string {
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
function eatWhitespace(cursor: DocumentCursor) {
    while (true) {
        let n = cursor.nodes[cursor.index];
        if (n.toString().trim().length != 0) break;
        cursor.index++;
    }
    return;
}


