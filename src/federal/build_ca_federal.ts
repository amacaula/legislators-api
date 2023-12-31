import {
    LegislatorData, LegislatorURLs, TypedAddress, AddressType, ConstituencyData,
    GovernmentBuilderFactory, GovernmentData, GovernmentMetadata, GovernmentLevel, Legislature
} from '../types';
import {
    Government, makeNameId, makeConstituencyNameId, defaultLegislator,
    defaultConstituency, standardizeName
} from '../models';
import { MPlookupProvider } from './lookups';

// For reading/parsing data in various formats
import { parse, HTMLElement, Node, TextNode } from 'node-html-parser';
const fs = require("fs");
const { XMLParser } = require("fast-xml-parser");

// Caching version of node-fetch
import { fetchBuilder, FileSystemCache } from 'node-fetch-cache';

// TODO later separate data capture and API consume types

// ------------------------- types and globals -------------------------

const DEFAULT_CONFIG: any = {
    cacheTTLhours: 24 * 7, // 7 days
    delay: 2 * 1000, // ms between fetches
    maxLegislators: 0, // 0 means no limit
    pruneUnusedConstituencies: false, // remove any constituencies without a legislator
    logEvery: 5 // log progress every N legislators
};

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// For iterating over children nodes of an HTMLElement
type HTMLDocumentCursor = {
    nodes: Array<Node>,
    index: number
}

const HOUSE_OF_COMMONS_PHYSICAL_ADDRESS = "House of Commons\nOttawa, Ontario\nCanada\nK1A 0A6";

const governmentMetadata: GovernmentMetadata = {
    id: "ca.federal.houseOfCommons",
    level: GovernmentLevel.Federal,
    name: "House of Commons",
    country: "Canada",
    region: null,
    legislature: {
        name: "Parliament Building",
        address: {
            type: AddressType.Central,
            physical: HOUSE_OF_COMMONS_PHYSICAL_ADDRESS,
            phone: "1-866-599-4999",
            fax: null
        } as TypedAddress,
        urls: {
            website: "https://www.parl.ca/",
            contact: "https://www.ourcommons.ca/en/contact-us"
        },
        email: "info@parl.gc.ca"
    } as Legislature,
    expectedConstituencies: 338,
}

const STOP_TAGS = ["H3", "DIV", "P"];

// ----------------------- Main GovernmentBuilder -----------------------

export class CanadaGovernmentProvider implements GovernmentBuilderFactory {
    constructor() {
    }

    static availableGovernments(): Array<GovernmentMetadata> {
        return [governmentMetadata];
    }

    static defaultConfig: any = DEFAULT_CONFIG;

    async build(metadata: GovernmentMetadata = CanadaGovernmentProvider.availableGovernments()[0],
        config: any = {}): Promise<Government> {
        let cfg = { ...CanadaGovernmentProvider.defaultConfig, ...config }
        let government = new Government(metadata, MPlookupProvider);
        const fetch = fetchBuilder.withCache(new FileSystemCache({
            cacheDirectory: 'cache', // Specify where to keep the cache. 
            ttl: 1000 * 60 * 60 * cfg.cacheTTLhours, // Time to live in ms (7 days)
        }));

        let legByNameId = government.legislatorsByNameId;
        await addLegislators(legByNameId);
        await addContactLinks(legByNameId);
        await processContactData(legByNameId);

        let conByNameId = government.constituenciesByNameId;
        await addConstituencies(conByNameId, legByNameId);
        await addConstituencyIds(conByNameId, legByNameId);

        government.finish(cfg.pruneUnusedConstituencies);
        return government;

        // ------- Builder steps in closure -------

        // Process the HTML file containing the list of all legislators addresses
        async function addLegislators(legislatorsByNameId: Map<string, LegislatorData>) {
            const addressesHTML = fs.readFileSync("data/addresses-members-of-parliament.html", "utf8"); // TODO soon fetch live
            const root = parse(addressesHTML);
            let count = 0;

            let blocks = root.querySelectorAll("div.col-lg-4")
                .filter(div => (div.childNodes[1] as HTMLElement)?.tagName === "H2");
            if (cfg.maxLegislators > 0) {
                console.warn(`Max legislators to process: ${cfg.maxLegislators}`);
                blocks = blocks.slice(0, cfg.maxLegislators);
            }
            console.log("HTML blocks to process: " + blocks.length);
            blocks.map(htmlBlockToLegislator).forEach((l: LegislatorData, index: number) => {
                legislatorsByNameId.set(l.nameId, l);
            });
            console.info(`Number of legislators collected: ${legislatorsByNameId.size}`);

            function htmlBlockToLegislator(b: HTMLElement): LegislatorData {
                let name = standardizeName(b.childNodes[1].text);
                if (count % cfg.logEvery == 0) console.log(`htmlBlockToLegislator: processed: ${count} at name = ${name}`);
                let [last, first] = name.split(", ");

                let leg: LegislatorData = defaultLegislator(first, last);
                try {
                    let cursor: HTMLDocumentCursor = { nodes: b.childNodes, index: 0 };
                    while (cursor.index < cursor.nodes.length) {
                        let addressType = extractAddressType(cursor);
                        if (addressType === null) break; // no more addresses

                        if (addressType === AddressType.Local) {
                            // Recursively process any P elements
                            let isFirst = true;
                            cursor.nodes.filter(n => (n as HTMLElement).tagName === "P").forEach(p => {
                                let inner: HTMLDocumentCursor = { nodes: p.childNodes, index: 0 };
                                let a: TypedAddress = { type: AddressType.Local, physical: null, phone: "missing", fax: null };

                                let addr = extractMultilineAddress(inner);
                                if (addr.length > 0) {
                                    a.physical = addr;
                                }
                                let otherProperties = extractNamedAttributes(inner);
                                a = { ...a, ...otherProperties };
                                leg.addresses.push(a);
                                isFirst = false;
                            });
                        } else {
                            let a: TypedAddress = { type: AddressType.Central, physical: null, phone: "missing", fax: null };
                            a.physical = HOUSE_OF_COMMONS_PHYSICAL_ADDRESS;
                            let otherProperties = extractNamedAttributes(cursor);
                            a = { ...a, ...otherProperties };
                            leg.addresses.push(a);
                        }
                    }
                } catch (e) {
                    console.error(`htmlBlockToLegislator: ${b.toString()}\n -> ${e}`);
                }
                // identify main local address
                const locals = leg.addresses.filter(a => a.type === AddressType.Local);
                if (locals.length == 1) {
                    locals[0].type = AddressType.MainLocal;
                } else if (locals.length > 1) {
                    const main = locals.find(a => a.physical?.includes("(Main"));
                    if (main) main.type = AddressType.MainLocal;
                }
                count++;
                return leg;
            }
        }

        // Process XML file containing constituency data
        function addConstituencies(constituenciesByNameId: Map<string, ConstituencyData>, legislatorsByNameId: Map<string, LegislatorData>) {
            const xml = fs.readFileSync("data/parliament-members.xml", "utf8");
            const parser = new XMLParser();
            let xmlData = parser.parse(xml);
            let mps = xmlData.ArrayOfMemberOfParliament.MemberOfParliament;
            if (cfg.maxLegislators > 0) mps = mps.slice(0, cfg.maxLegislators);
            mps.forEach((mp: XMLMemberOfParliament) => {
                mergeInConstituencyData(constituenciesByNameId, legislatorsByNameId, mp);
            });
        }

        // Process the search HTML to get links to contact data (for email, website, etc)
        function addContactLinks(legislatorsByNameId: Map<string, LegislatorData>) {
            const searchHTML = fs.readFileSync("data/Current-Members-of-Parliament-Search.html", "utf8"); // TODO soon fetch live
            const searchRoot = parse(searchHTML);
            let tiles = searchRoot.querySelectorAll("div.ce-mip-mp-tile-container");
            if (cfg.maxLegislators > 0) {
                tiles = tiles.slice(0, cfg.maxLegislators);
            }
            console.log(`Number of tiles to process: ${tiles.length}`);
            tiles.forEach(tile => {
                let href = tile.querySelector("a")?.getAttribute("href") as string;
                let name = tile.querySelectorAll("div.ce-mip-mp-name")[0]?.text;
                if (href && name) {
                    mergeInContactLink(standardizeName(name), href, legislatorsByNameId);
                } else {
                    console.warn(`getAllLegislators: MISSING name ${name} or contact link ${href}`);
                }
            });
        }

        // fetch contact data for each legislator in parallel
        async function processContactData(legislatorsByNameId: Map<string, LegislatorData>) {
            let promises = Array<Promise<void>>();
            let count = 0;
            let failures = 0;
            for (let [nameId, leg] of legislatorsByNameId) {
                if (count % cfg.logEvery == 0) console.log(`fetchAndMergeDataFromContactLink: processed ${count} failures ${failures}...`);
                await fetchAndMergeDataFromContactLink(leg);
                await delay(cfg.delay);
            }
            // Originally was going to do this in parallel but ran into issues with source shedding load
            // legislatorsByNameId.forEach((leg, nameId) => {
            // promises.push(await fetchAndMergeDataFromContactLink(leg);
            // });
            // let results = await Promise.allSettled(promises);
            // console.log(`contact data fetch: ${results.length} attempts with ${results.filter(r => r.status === "rejected").length} failures`);

            async function fetchAndMergeDataFromContactLink(leg: LegislatorData): Promise<void> {
                let contactURL = leg.urls["contact"];
                if (!contactURL) return Promise.resolve();

                return fetch(contactURL) // , { insecureHTTPParser: false }) not needed TODO remove
                    .then((res: any) => {
                        if (res.ok) {
                            return res.text();
                        } else {
                            failures++;
                            return Promise.reject(`fetchAndMergeDataFromContactLink: ${contactURL} -> HTTP error: ${res.status}`);
                        }
                    })
                    .then((body: any) => {
                        count++;
                        const root = parse(body);
                        const blocks = root.querySelectorAll("div").filter(a => {
                            // div contains h4 element with text "Email"
                            return a.querySelector("h4")?.text.includes("Email")
                        }).forEach(block => {
                            // then extract the contents of the two links in the div
                            block.querySelectorAll("a").forEach(a => {
                                const href = a.getAttribute("href");
                                if (!href) return;
                                if (href.includes("mailto")) {
                                    leg.email = href.substring(7); // drop the mailto:
                                } else if (href.includes("http")) {
                                    leg.urls["website"] = href;
                                }
                            });
                        });
                    })
                    .catch((err: any) => console.warn(
                        `fetchAndMergeDataFromContactLink: ${contactURL} -> ${err}\n${err.stack}`));
            }
        }

        async function addConstituencyIds(constituenciesByNameId: Map<string, ConstituencyData>, legislatorsByNameId: Map<string, LegislatorData>) {
            const conListHTML = fs.readFileSync("data/Current Constituencies.html", "utf8"); // TODO soon fetch live
            const searchRoot = parse(conListHTML);
            const tiles = searchRoot.querySelectorAll("a.mip-constituency-tile");
            console.log(`Number of tiles to process: ${tiles.length}`);
            tiles.forEach(tile => {
                let href = tile.getAttribute("href") as string;
                let lastSlash = href.lastIndexOf("/");
                let [nameId, id] = href.substring(lastSlash + 1).split("(");
                id = id.substring(0, id.length - 1); // drop trailing ")"
                nameId = makeConstituencyNameId(nameId); // cleanup weird dashes etc
                let name = tile.querySelector("div.mip-constituency-name")?.text.trim() as string;
                let legName = tile.querySelector("span.mip-mp-name")?.text as string;

                let cons = constituenciesByNameId.get(nameId)
                if (cons !== undefined) {
                    cons.id = id;
                } else {
                    if (cfg.maxLegislators <= 0)
                        console.warn(`NOT FOUND constituency ${name} with id: ${nameId}`);
                }
            });
        }
    }
}


// ----------------------- Building or merging in data for single Legislator -----------------------

type XMLMemberOfParliament = {
    CaucusShortName: string // example 'Conservative'
    ConstituencyName: string // example 'Edmonton Manning'
    ConstituencyProvinceTerritoryName: string // example 'Alberta'
    FromDateTime: string // example '2021-09-20T00:00:00'
    PersonOfficialFirstName: string // example 'Ziad'
    PersonOfficialLastName: string // example 'Aboultaif'
    PersonShortHonorific: string // usually empty
}

function mergeInConstituencyData(constituenciesByNameId: Map<string, ConstituencyData>, legislatorsByNameId: Map<string, LegislatorData>, xmlData: XMLMemberOfParliament) {
    let consNameId = makeConstituencyNameId(xmlData.ConstituencyName
        .replaceAll("'", "").replaceAll(".", ""));
    let constituency = constituenciesByNameId.get(consNameId);
    if (constituency === undefined) constituency = defaultConstituency(xmlData.ConstituencyName);
    constituenciesByNameId.set(consNameId, constituency);
    constituency.region = xmlData.ConstituencyProvinceTerritoryName;

    let nameId = makeNameId(xmlData.PersonOfficialFirstName, xmlData.PersonOfficialLastName);
    let leg = legislatorsByNameId.get(nameId);
    if (leg !== undefined) {
        leg.honorific = xmlData.PersonShortHonorific;
        leg.party = xmlData.CaucusShortName;
        leg.fromDate = xmlData.FromDateTime.substring(0, 10);
        leg.constituencyNameId = consNameId;
        constituency.legislatorNameId = nameId;
    } else {
        console.warn(`mergeInConstituencyData: UNKNOWN legislator id = ${nameId} for ${consNameId}`);
    }
}


function mergeInContactLink(fullName: string, href: string, legislatorsByNameId: Map<string, LegislatorData>): void {
    let [nothing, members, en, rest] = href.split("/");
    let [_, id] = rest.split("(") as string[];
    id = id.substring(0, id.length - 1); // drop trailing ")"
    const names = fullName.split(" ");
    const first = names[0];
    const last = names[names.length - 1]; // in case there is a middle name to ignore

    let leg: LegislatorData = legislatorsByNameId.get(makeNameId(first, last)) as LegislatorData;
    if (leg !== undefined) {
        leg.id = id;
        leg.urls["contact"] = `https://www.ourcommons.ca${href}`;
    } else {
        console.warn(`mergeInContactLink: UNKNOWN legislator nameId = ${last}, ${first}`)
    }

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
                console.error(`findAddressType: UNKNOWN raw type = ${rawType}`);
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
                console.warn(`ILLEGAL attribute name: ${rawName}`);
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
    while (cursor.index < cursor.nodes.length) {
        let n = cursor.nodes[cursor.index];
        if (n.toString().trim().length != 0) break;
        cursor.index++;
    }
    return;
}


