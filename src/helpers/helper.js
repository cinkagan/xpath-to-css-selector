var sub_regexes = {
    "tag": "([a-zA-Z][a-zA-Z0-9]{0,10}|\\*)",
    "attribute": "[.a-zA-Z_:][-\\w:.]*(\\(\\))?)",
    "value": "\\s*[\\w/:][-/\\w\\s,:;.]*"
};

var validation_re =
    "(?P<node>" +
    "(" +
    "^id\\([\"\\']?(?P<idvalue>%(value)s)[\"\\']?\\)" + 
    "|" +
    "(?P<nav>//?(?:following-sibling::)?)(?P<tag>%(tag)s)" + 
    "(\\[(" +
    "(?P<matched>(?P<mattr>@?%(attribute)s=[\"\\'](?P<mvalue>%(value)s))[\"\\']" + 
    "|" +
    "(?P<contained>contains\\((?P<cattr>@?%(attribute)s,\\s*[\"\\'](?P<cvalue>%(value)s)[\"\\']\\))" +
    ")\\])?" +
    "(\\[\\s*(?P<nth>\\d|last\\(\\s*\\))\\s*\\])?" +
    ")" +
    ")";

for (var prop in sub_regexes)
    validation_re = validation_re.replace(new RegExp('%\\(' + prop + '\\)s', 'gi'), sub_regexes[prop]);
validation_re = validation_re.replace(/\?P<node>|\?P<idvalue>|\?P<nav>|\?P<tag>|\?P<matched>|\?P<mattr>|\?P<mvalue>|\?P<contained>|\?P<cattr>|\?P<cvalue>|\?P<nth>/gi, '');

function XPathException(message) {
    this.message = message;
    this.name = "[XPathException]";
}

var log = window.console.log.bind(console);

module.exports.cssify = (xpath) => {
    var prog, match, result, nav, tag, attr, nth, nodes, css, node_css = '',
        csses = [],
        xindex = 0,
        position = 0;

    xpath = xpath.replace(/contains\s*\(\s*concat\(["']\s+["']\s*,\s*@class\s*,\s*["']\s+["']\)\s*,\s*["']\s+([a-zA-Z0-9-_]+)\s+["']\)/gi, '@class="$1"');

    if (typeof xpath == 'undefined' || (
            xpath.replace(/[\s-_=]/g, '') === '' ||
            xpath.length !== xpath.replace(/[-_\w:.]+\(\)\s*=|=\s*[-_\w:.]+\(\)|\sor\s|\sand\s|\[(?:[^\/\]]+[\/\[]\/?.+)+\]|starts-with\(|\[.*last\(\)\s*[-\+<>=].+\]|number\(\)|not\(|count\(|text\(|first\(|normalize-space|[^\/]following-sibling|concat\(|descendant::|parent::|self::|child::|/gi, '').length)) {
        throw new XPathException('Invalid or unsupported XPath: ' + xpath);
    }

    var xpatharr = xpath.split('|');
    while (xpatharr[xindex]) {
        prog = new RegExp(validation_re, 'gi');
        css = [];
        log('working with xpath: ' + xpatharr[xindex]);
        while (nodes = prog.exec(xpatharr[xindex])) {
            if (!nodes && position === 0) {
                throw new XPathException('Invalid or unsupported XPath: ' + xpath);
            }

            log('node found: ' + JSON.stringify(nodes));
            match = {
                node: nodes[5],
                idvalue: nodes[12] || nodes[3],
                nav: nodes[4],
                tag: nodes[5],
                matched: nodes[7],
                mattr: nodes[10] || nodes[14],
                mvalue: nodes[12] || nodes[16],
                contained: nodes[13],
                cattr: nodes[14],
                cvalue: nodes[16],
                nth: nodes[18]
            };
            log('broke node down to: ' + JSON.stringify(match));

            if (position !== 0 && match['nav']) {
                if (~match['nav'].indexOf('following-sibling::')) nav = ' + ';
                else nav = (match['nav'] === '//') ? ' ' : ' > ';
            } else {
                nav = '';
            }
            tag = (match['tag'] === '*') ? '' : (match['tag'] || '');

            if (match['contained']) {
                if (match['cattr'].indexOf('@') === 0) {
                    attr = '[' + match['cattr'].replace(/^@/, '') + '*=' + match['cvalue'] + ']';
                } else { //if(match['cattr'] === 'text()')
                    throw new XPathException('Invalid or unsupported XPath attribute: ' + match['cattr']);
                }
            } else if (match['matched']) {
                switch (match['mattr']) {
                    case '@id':
                        attr = '#' + match['mvalue'].replace(/^\s+|\s+$/, '').replace(/\s/g, '#');
                        break;
                    case '@class':
                        attr = '.' + match['mvalue'].replace(/^\s+|\s+$/, '').replace(/\s/g, '.');
                        break;
                    case 'text()':
                    case '.':
                        throw new XPathException('Invalid or unsupported XPath attribute: ' + match['mattr']);
                    default:
                        if (match['mattr'].indexOf('@') !== 0) {
                            throw new XPathException('Invalid or unsupported XPath attribute: ' + match['mattr']);
                        }
                        if (match['mvalue'].indexOf(' ') !== -1) {
                            match['mvalue'] = '\"' + match['mvalue'].replace(/^\s+|\s+$/, '') + '\"';
                        }
                        attr = '[' + match['mattr'].replace('@', '') + '=' + match['mvalue'] + ']';
                        break;
                }
            } else if (match['idvalue'])
                attr = '#' + match['idvalue'].replace(/\s/, '#');
            else
                attr = '';

            if (match['nth']) {
                if (match['nth'].indexOf('last') === -1) {
                    if (isNaN(parseInt(match['nth'], 10))) {
                        throw new XPathException('Invalid or unsupported XPath attribute: ' + match['nth']);
                    }
                    nth = parseInt(match['nth'], 10) !== 1 ? ':nth-of-type(' + match['nth'] + ')' : ':first-of-type';
                } else {
                    nth = ':last-of-type';
                }
            } else {
                nth = '';
            }
            node_css = nav + tag + attr + nth;

            log('final node css: ' + node_css);
            css.push(node_css);
            position++;
        } 

        result = css.join('');
        if (result === '') {
            throw new XPathException('Invalid or unsupported XPath: ' + match['node']);
        }
        csses.push(result);
        xindex++;

    } 

    return csses.join(', ');
}