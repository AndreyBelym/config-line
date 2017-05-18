const CONVERTION_MAP = {
    'boolean': v => v && v !== '0' && v !== 'false',
    'number':  v => Number(v),
    'string':  v => v
};

export default class ConfigSchema {
    constructor (configSpec) {
        this._buildSchema(configSpec, '');
    }

    _buildSchema (configSpec, prefix) {
        Object
            .keys(configSpec)
            .forEach(key => {
                if (key[0] === '_')
                    return;

                var entryName    = prefix + key;
                var defaultValue = configSpec[key];
                var type         = typeof defaultValue;

                if (type === 'object') {
                    this._buildSchema(configSpec[key], entryName + '.');

                    this[entryName] = { type: 'object', defaultKey: configSpec[`_${key}DefaultKey`] };

                    return;
                }

                if (type === 'undefined')
                    type = configSpec[`_${key}TypeHint`];

                this[entryName] = { type, defaultValue };
            });
    }

    convert (key, value) {
        return CONVERTION_MAP[this[key].type](value);
    }
}
