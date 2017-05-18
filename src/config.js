import Tokenizer from './tokenizer';


const schema    = Symbol();

export default class Config {
    constructor (configSchema, configString) {
        this[schema] = configSchema;

        this._createKeys();

        var tokenizer = new Tokenizer(configString);

        this.unparsed  = tokenizer.unparsed;

        this._parse(tokenizer.tokens, '');
    }

    _createKeys () {
        Object.keys(this[schema]).forEach(key => this._init(key));
    }

    _parse (tokens, prefix) {
        tokens
            .forEach(entry => {
                var entryName = prefix + entry.match[0].match[0].replace(/-(.)/g, match => match[1].toUpperCase());

                if (entry.match[2]) {
                    if (entry.match[2].type === 'recursion')
                        this._parse(entry.match[2].match, entryName + '.');
                    else
                        this.set(entryName, entry.match[2].match[0]);
                }
                else
                    this.set(entryName, true);
            });
    }

    _init (key) {
        return key
            .split('.')
            .reduce((cfg, curKey, i, array) => {
                if (i === array.length - 1 && this[schema][key].type !== 'object')
                    cfg[curKey] = this[schema][key].defaultValue;
                else if (!cfg[curKey])
                    cfg[curKey] = {};

                return cfg[curKey];
            }, this);
    }

    get (key) {
        if (!this[schema][key])
            return void 0;

        return key.split('.').reduce((cfg, curKey) => cfg[curKey], this);
    }

    set (key, value) {
        if (!this[schema][key])
            return void 0;

        if (this[schema][key].type === 'object') {
            if (!this[schema][key].defaultKey)
                return void 0;

            key = key + '.' + this[schema][key].defaultKey;
        }

        return key
            .split('.')
            .reduce((cfg, curKey, i, array) => {
                if (i === array.length - 1)
                    cfg[curKey] = this[schema].convert(key, value);

                return cfg[curKey];
            }, this);
    }

    isDefault (key) {
        if (!this[schema][key])
            return false;

        return this.get(key) === this[schema][key].defaultValue;
    }

    override (key, value) {
        if (!this[schema][key])
            return;

        if (this.isDefault(key))
            this.set(key, value);
    }
}
