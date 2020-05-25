const path = require('path')
const fs = require('fs')
const cheerio = require('cheerio')
const jsdom = require('jsdom')
const request = require('request')
const util = require('util')

async function loadAndParseDOM(absPath = 'dist/index.html') {
    const dirPath = path.dirname(path.resolve(absPath))
    const context = {
        htmlPath: path.resolve(absPath),
        dirPath: dirPath
    }
    console.log(context)
    const domString = fs.readFileSync(absPath)
    const $dom = cheerio.load(domString)
    await processJS($dom, context)
    fs.writeFileSync(path.resolve(path.join(dirPath, 'single.html')), $dom.html())
}

async function getBody(url) {
    return (await util.promisify(request)(url)).body
}

async function processJS($dom, context) {
    const scripts = $dom('script')
    const scriptsList = []
    scripts.each(function(index, element) {
        $script = $dom(element)
        scriptsList.push($script)
    })
    for (let $script of scriptsList) {
        const src = $script.attr('src')
        if (src.startsWith('http')) {
            const text = await getBody(src)
            console.log(text)
            $script.text(text)
            $script.removeAttr('src')
        } else {
            const text = fs.readFileSync(path.resolve(path.join(context.dirPath, src))).toString()
            console.log(text)
            $script.text(text)
            $script.removeAttr('src')
        }
    }
}

loadAndParseDOM()