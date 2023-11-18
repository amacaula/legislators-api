const Xray = require("x-ray");

const x = Xray();

function getPosts(url = "https://www.ourcommons.ca/members/en/sameer-zuberi(54157)") {
    return new Promise((resolve, reject) => {
        x(`${url}`, "body", {
            items: x("a.ce-mip-mp-tile", [
                {
                    link: "a@href",
                },
            ]),
        })((err: any, data: any) => {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
}

const main = async () => {
    const posts = await getPosts();
    console.log(posts);
};

main();