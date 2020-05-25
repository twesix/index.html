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
    // console.log(context)
    const domString = fs.readFileSync(absPath)
    const $dom = cheerio.load(domString)
    await processJS($dom, context)
    await processLink($dom, context)
    await processIMG($dom, context)
    fs.writeFileSync(path.resolve(path.join(dirPath, 'single.html')), $dom.html())
}

async function getBody(url) {
    return (await util.promisify(request)(url)).body
}

function getBodyBuffer(url) {
    const stream = request(url)
    return new Promise(function(resolve, reject) {
        const bufs = []
        stream.on('data', function(d){ bufs.push(d) })
        stream.on('end', function(){
            const buf = Buffer.concat(bufs)
            resolve(buf)
        })
        stream.on('error', function(error) {
            reject(error)
        })
    })
}

// ;(async function() {
//     console.log(await getBodyBuffer("https://www.twesix.cn/favicon.ico"))
// })()

async function file2base64(absPath) {
    absPath = path.resolve(absPath)
    let base64String
    if (absPath.startsWith('http')) {
        base64String = (await getBodyBuffer(absPath)).toString('base64')
    } else {
        const buffer = fs.readFileSync(absPath)
        base64String = buffer.toString('base64')
    }
    // console.log(path.extname(absPath))
    const ext = path.extname(absPath).toLowerCase()
    if (ext === '.ico') {
        base64String = 'data:image/x-icon;base64,' + base64String
        return base64String
    }
    if (ext === '.jpg' || ext === '.jpeg') {
        base64String = 'data:image/jpg;base64,' + base64String
        return base64String
    }
    if (ext === '.png') {
        base64String = 'data:image/png;base64,' + base64String
        return base64String
    }
    if (ext === '.bmp') {
        base64String = 'data:image/bmp;base64,' + base64String
        return base64String
    }
    return 'file type not supported yet !!!'
}

async function processJS($dom, context) {
    const scripts = $dom('script')
    const scriptsList = []
    scripts.each(function(index, element) {
        const $script = $dom(element)
        scriptsList.push($script)
    })
    for (let $script of scriptsList) {
        const src = $script.attr('src')
        if (!src) continue
        if (src.startsWith('http')) {
            const text = await getBody(src)
            $script.text(text)
            $script.removeAttr('src')
        } else {
            const text = fs.readFileSync(path.resolve(path.join(context.dirPath, src))).toString()
            $script.text(text)
            $script.removeAttr('src')
        }
    }
}

async function processIMG($dom, context) {
    const imgs = $dom('img')
    const imgList = []
    imgs.each(function(index, element) {
        const $img = $dom(element)
        imgList.push($img)
    })
    for (let $img of imgList) {
        let src = $img.attr('src')
        if (!src) continue

        if (!src.startsWith('http')) {
            src = path.resolve(path.join(context.dirPath, src))
        }
        const text = await file2base64(src)
        $img.attr('src', text)
    }
}

async function processLink($dom, context) {
    const links = $dom('link')
    const linkList = []
    links.each(function(index, element) {
        const $link = $dom(element)
        linkList.push($link)
    })

    for (let $link of linkList) {
        if ($link.attr('rel') === 'preload') {
            $link.remove()
        }
        if ($link.attr('rel') === 'stylesheet') {
            const href = $link.attr('href')
            if (href.startsWith('http')) {
                const text = await getBody(href)
                $link.after('<style>' + text + '</style>')
                $link.remove()
            } else {
                const text = fs.readFileSync(path.resolve(path.join(context.dirPath, href))).toString()
                $link.after('<style>' + text + '</style>')
                $link.remove()
            }
        }
        if ($link.attr('rel') === 'icon') {
            const href = $link.attr('href')
            const dataUrl = await file2base64(path.resolve(path.join(context.dirPath, href)))
            // console.log(dataUrl)
            $link.attr('href', dataUrl)
        }
    }
}

loadAndParseDOM()