import { parse, HTMLElement, Node, TextNode } from 'node-html-parser';
import { fetchBuilder, FileSystemCache } from 'node-fetch-cache';
let performanceNow = require('performance-now');
const cache = new FileSystemCache({
    cacheDirectory: 'cache', // Specify where to keep the cache. 
    ttl: 1000 * 60 * 60 * 4, // Time to live in ms (4 hrs)
});
const fetch = fetchBuilder.withCache(cache);

function fetchContact(contactURL: string): Promise<Array<string>> {
    let email = "", website = "";
    return fetch(contactURL)
        .then((res: any) => {
            if (res.ok) {
                return res.text();
            } else {
                return Promise.reject(`fetchContact: ${contactURL} -> HTTP error: ${res.status}`)
            }
        })
        .then((body: any) => {
            const root = parse(body);
            const blocks = root.querySelectorAll("div.container").filter(div => {
                // div contains h4 element with text "Email"
                return div.querySelector("h4")?.text.includes("Email")
            }).forEach(block => {
                // then extract the contents of the two links in the div
                block.querySelectorAll("a").forEach(a => {
                    const href = a.getAttribute("href");
                    if (!href) return [email, website];
                    if (href.includes("mailto")) {
                        email = href.substring(7); // drop the mailto:
                    } else if (href.includes("http")) {
                        website = href;
                    }
                });
            });
            return [email, website];
        })
}

(async () => {
    const contactURL = "https://www.ourcommons.ca/members/en/rachael-thomas(89200)";

    const before = performanceNow();
    const [email, website] = await fetchContact(contactURL);
    console.log(`elapsed: ${performanceNow() - before} ms`);

    console.log(`email: ${email}, website: ${website}`);
    // email: rachael.thomas@parl.gc.ca, website: http://www.rachaelthomas.ca


})();

