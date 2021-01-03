const $ = require('cheerio');
const puppeteer = require('puppeteer');
const yargs = require('yargs');
const url = 'https://app.brandmentions.com/research/hashtag-tracker/#page/search';
const keywordInputSelector = '#ext-xbasecontainer-3';
const listSelector = '#mentions_list';
const locationSelectSelector = '.location.search-items'
const countrySelector = '.item[title="Libya"]';
const timeRangeSelector = '.timerange.search-items'
const timeSelector = '.item[title="Last Month"]';
const fse = require('fs-extra');
const path = require('path');

process.stdout.clearScreenDown();

const argv = yargs
    .option('query', {
        alias: 'q',
        description: 'Query',
        type: 'string',
        demandOption: true,
    })
    .option('output', {
        alias: 'o',
        description: 'Output directory',
        type: 'string',
        default: 'results/',
    })
    .option('type', {
        alias: 't',
        description: 'Output file type',
        type: 'string',
        choices: ['json', 'csv'],
        default: 'json',
    })
    .option('collection-time', {
        alias: 'ct',
        description: 'Time to wait for result to load and collect',
        type: 'number',
        default: 60,
    })
    .argv;



if (!argv.query) {
    process.exit();
}

let page;

const delay = (time) => new Promise(async (res) => setTimeout(res, time));


const saveJSON = (filePath, data) => {
    return fse.outputFile(filePath, JSON.stringify(data));
}

const saveCSV= (filePath, data) => {

    return fse.outputFile(filePath, data.reduce((pre, d) => pre + Object.values(d).join(',') + '\n', ''));
}

const init = async () => {
    console.log('Initalising browser...')
    const browser = await puppeteer.launch();
    console.log('Opening url...');
    page = await browser.newPage();
    await page.goto(url, {timeout: 0});
    await page.content();
    await delay(10000);
    page.on('load', async () => {
        let i = 0;
        let data = {};
        console.log('waiting fo results...');
        while (i++ < argv.ct) {
            let eta = (argv.ct - i + 1);
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(`Collected ${Object.values(data).length} posts, ETA: ${eta % 60} seconds ${Math.floor(eta / 60)} minutes`);


            //  await page.waitForSelector(listSelector, {visible: true});

            const newData = await page.$$eval('.mention-list-item-container', (elements) => {
            // const newData =    await (await page.waitForSelector(listSelector + ' .mention-list-item-container', {visible: true})).evaluate(elements => {
                const data = {};
                const metrics = ['performance', 'favorites', 'comments', 'shares'];
                for (const element of elements) {
                    const url = $('.article-url' ,element).first().text();
                    if (/https:\/\//.test(url)) {
                        data[url] = {
                            url,
                        };

                        for (const metric of metrics) {
                            const metricElement = $(`.article-metric.${metric} .count` ,element).first();
                            if (metricElement) {
                                data[url][metric] = metricElement.text();
                            }
                        }
                        const date = $('.date.column' ,element).first().text();
                        data[url].date = date;

                        const contentText = $('.article-content', element).first().text();
                        data[url].content_text = contentText;

                        const contentHTML = $('.article-content', element).first().html();
                        data[url].content_html = contentHTML;

                        const images = $('.article-image', element).toArray();
                        // console.log(images);
                        data[url].images = [];
                        for (let i = 0; i < images.length; i++) {
                            // console.log(image.css('background-image'));
                            data[url].images[i] = $(images[i]).css('background-image')
                                .replace(/^url\("/, '')
                                .replace(/"\)$/, '')
                                .replace(/^none$/, '');
                        }

                    }
                }
                return data;
            });

            data = {...newData, ...data};
            await page.evaluate(() => window.scroll({top: document.body.scrollHeight}));
            await delay(1000);
        }

        let filename = path.resolve(argv.output) + '/' + argv.query + ' ' + (new Date()).toISOString() + '.' + argv.type;
        switch (argv.type) {
            case 'json': 
                await saveJSON(filename, Object.values(data));
                break;
            case 'csv': 
                await saveCSV(filename, Object.values(data));
                break;
        }

        console.log('');
        console.log('Output file: ' + filename);
        // console.log(Object.values(data));
        // console.log('done');
        process.exit();
    });

    // const locationSelect = await page.waitForSelector(locationSelectSelector);
    // locationSelect.click();

    // const country = await page.waitForSelector(countrySelector);
    // country.click();

    const timeRange = await page.waitForSelector(timeRangeSelector, {visible: true});
    timeRange.click();

    const time = await page.waitForSelector(timeSelector, {visible: true});
    time.click();

    const keywordInput = await page.waitForSelector(keywordInputSelector, {visible: true});
    console.log('Searching for "' + argv.query + '" from last month...');
    await delay(4000);
    await keywordInput.type(argv.query + '\r');
    return true;
}

init();