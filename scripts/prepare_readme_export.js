const slugify = require("slugify");
fs = require('fs');

function getFrontMatterProperty(file, property) {
    let content = fs.readFileSync(file, 'utf8')
    const re = new RegExp(`${property}: "?([^"$\n]+)("|$)`, "gm");

    return re.exec(content)[1];
}

let category = getFrontMatterProperty('./docs/README.md', "category");
let hidden = getFrontMatterProperty('./docs/README.md', "hidden");

function addFrontMatterProperty(file, property) {
    let content = fs.readFileSync(file, 'utf8')
    let updatedContent = content.replace(/---\n/, `---\n${property}\n`);

    fs.writeFileSync(file, updatedContent);
}

function removeFrontMatterProperty(file, property) {
    let content = fs.readFileSync(file, 'utf8')
    let updatedContent = content.replace(/title: .*\n/, ``);

    fs.writeFileSync(file, updatedContent);
}

function createFolderAndMoveDocs(folderName, title) {
    let files = fs.readdirSync('./docs/' + folderName, { withFileTypes: true });
    let parentDocSlug = slugify(`app-sdk API reference ${title}`, {lower: true});

    let header = `---
title: "${title}"
category: "${category}"
slug: "${parentDocSlug}"
hidden: ${hidden}
---

### ${title}

`;

    let toc = files
    .filter(f => f.isFile())
    .map(f => {
        const titleRe = /title: "(.+)".*/g;
        let title = titleRe.exec(fs.readFileSync('./docs/' + folderName + "/" + f.name, 'utf8'))[1];
        return "- [" + title + "](" + folderName + "/" + f.name + ")"
    })
    .join('\n')

    fs.writeFileSync(
        './docs/' + folderName+'.md',
        header + toc
    );

    // add slug parameter to frontmatter in every file in folder
    files.filter(f => f.isFile()).forEach(f => {
        let file = './docs/' + folderName + "/" + f.name;

        let childTitle = getFrontMatterProperty(file, 'title')
        let slug = slugify(`app-sdk API reference ${title} ${childTitle}`, {lower: true})

        addFrontMatterProperty(file, `slug: "${slug}"`);
        addFrontMatterProperty(file, `parentDocSlug: "${parentDocSlug}"`);
    });
}

function mergeReadmeAndModules() {
    let toc = fs.readFileSync('./docs/modules.md', 'utf8')
    fs.rmSync('./docs/modules.md');

    toc = toc.replace(/.*## Index/s, '');

    let readme = fs.readFileSync('./docs/README.md', 'utf8') + "\n## Index" + toc;
    fs.writeFileSync('./docs/README.md', readme);
}

mergeReadmeAndModules();
addFrontMatterProperty('./docs/README.md', `order: 10`);
removeFrontMatterProperty('./docs/README.md', 'title');
addFrontMatterProperty('./docs/README.md', 'title: "Overview"');
let overviewSlug = slugify(`app-sdk API reference overview`, {lower: true, strict: true});
addFrontMatterProperty('./docs/README.md', `slug: "${overviewSlug}"`);

createFolderAndMoveDocs('classes', 'Classes');
createFolderAndMoveDocs('enums', 'Enums');
createFolderAndMoveDocs('functions', 'Functions');
createFolderAndMoveDocs('interfaces', 'Interfaces');
createFolderAndMoveDocs('types', 'Types');
createFolderAndMoveDocs('variables', 'Variables');

const formFile = './docs/Form/Form.md';
removeFrontMatterProperty(formFile, 'title');
addFrontMatterProperty(formFile, 'title: "namespace: Form"');

let formDocSlug = slugify(`app-sdk API reference namespace form`, {lower: true, strict: true});
addFrontMatterProperty(formFile, `slug: "${formDocSlug}"`);

fs.readdirSync('./docs/Form/functions/', { withFileTypes: true })
    .forEach(f => {
        let file = './docs/Form/functions/' + f.name;
        let title = getFrontMatterProperty(file, 'title')
        let slug = slugify(`app-sdk API reference namespace form ${title}`, {lower: true, strict: true})

        addFrontMatterProperty(file, `slug: "${slug}"`);
        addFrontMatterProperty(file, `parentDocSlug: "${formDocSlug}"`);
    });

function fixLinks(folder) {
    fs.readdirSync(folder, { withFileTypes: true })
        .forEach(f => {
            if (f.isDirectory()) {
                fixLinks(folder + '/' + f.name);
            } else {
                console.log(`file: ${folder}/${f.name}`);
                //[success](LiquidExtensionResult.md#success)
                let content = fs.readFileSync(`${folder}/${f.name}`, 'utf8')
                content = content.replaceAll("modules.md", "README.md");

                let linkRe = /\]\(([^\)]*\.md)/g;
                let m;
                do {
                    m = linkRe.exec(content);
                    if (m) {
                        let link = m[1];
                        let targetSlug = getFrontMatterProperty(folder + "/" + link, "slug");
                        console.log(`Replacing ${link} with ${targetSlug}`);
                        content = content.replaceAll(m[1], targetSlug);
                    }
                } while (m);

                fs.writeFileSync(`${folder}/${f.name}`, content);
            }
        });
}

fixLinks('docs');
