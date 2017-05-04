const CONFIG_ENTRY_RE      = /^([^=]+)(?:=(.*))?$/;
const RECURSIVE_CONFIG_RE  = /={((?:[^{}]|\\{|\\})+)};/g;
const ESCAPED_LEFT_CURLY   = /\\{/g;
const ESCAPED_RIGHT_CURLY  = /\\}/g;
const EXTRACT_RE           = /^%(\d+?)%$/;
const ESCAPING_RE          = /\\+$/;

const schema = Symbol();

export default class Config {
    constructor (configSchema, configString) {
        this[schema] = configSchema;

        this._createKeys();

        var nonRecursiveConfig = Config._extractRecursiveConfig(configString);

        this._parse(nonRecursiveConfig, '');
    }

    _createKeys () {
        Object.keys(this[schema]).forEach(key => this._init(key));
    }

    static _extractRecursiveConfig (configString) {
        var extracted = [];
        var refined   = configString;

        while (RECURSIVE_CONFIG_RE.test(refined)) {
            refined = refined.replace(RECURSIVE_CONFIG_RE, (match, inner) => {
                var i = extracted.length;

                extracted.push(inner).replace(ESCAPED_LEFT_CURLY, '{').replace(ESCAPED_RIGHT_CURLY, '}');
                return `=%${i}%;`;
            });
        }

        return { refined, extracted };
    }

    static _splitEntries (str) {
        var splitted = str.split(';');
        var result   = [splitted[0]];

        for (var i = 1; i < splitted.length; i++) {
            var last          = result[result.length - 1];
            var escapingMatch = last.match(ESCAPING_RE);

            if (!escapingMatch) {
                result.push(splitted[i]);
                continue;
            }

            var replacementLength   = escapingMatch[0].length / 2 | 0;
            var escapingReplacement = Array(replacementLength + 1).join('\\');

            last = last.replace(/\\+$/, escapingReplacement);

            if (escapingMatch[0].length % 2)
                result[result.length - 1] = last + ';' + splitted[i];
            else {
                result[result.length - 1] = last;

                result.push(splitted[i]);
            }
        }

        return result;
    }

    _parse ({ refined, extracted }, prefix) {
        Config
            ._splitEntries(refined)
            .filter(entry => !!entry)
            .forEach(entry => {
                var entryMatch = entry.match(CONFIG_ENTRY_RE);

                if (!entryMatch || !entryMatch[1])
                    throw new Error();

                var entryName = prefix + entryMatch[1].replace(/-(.)/g, match => match[1].toUpperCase());

                if (entryMatch[2]) {
                    var extractMatch = entryMatch[2].match(EXTRACT_RE);

                    if (extractMatch)
                        this._parse(extracted[extractMatch[1]], entryName + '.');
                    else
                        this.set(entryName, entryMatch[2]);
                }
                else
                    this.set(entryName, true);
            });
    }

    _init (key) {
        return key
            .split('.')
            .reduce((cfg, curKey, i, array) => {
                if (i === array.length - 1)
                    cfg[curKey] = this[schema][key].defaultValue;
                else if (!cfg[curKey])
                    cfg[curKey] = {};

                return cfg[curKey];
            }, this);
    }

    get (key) {
        return key.split('.').reduce((cfg, curKey) => cfg[curKey], this);
    }

    set (key, value) {
        return key
            .split('.')
            .reduce((cfg, curKey, i, array) => {
                if (i === array.length - 1)
                    cfg[curKey] = this[schema].convert(key, value);

                return cfg[curKey];
            }, this);
    }

    isDefault (key) {
        return this.get(key) === this[schema][key].defaultValue;
    }

    override (key, value) {
        if (this.isDefault(key))
            this.set(key, value);
    }
}
