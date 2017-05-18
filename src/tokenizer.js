const BASIC_TOKENS = {
    'assignment':      /^\s*[=:]\s*/,
    'start-recursion': /^\s*{\s*/,
    'stop-recursion':  /^\s*}\s*/,
    'separator':       /^\s*;\s*/,
    'special-char':    /^\\(.)/
};

const INPUT_TERMINATOR_RE = /(\s+|^)-/;

export default class Tokenizer {
    constructor (str) {
        var { input, unparsed } = Tokenizer._getInput(str);

        this.input    = input;
        this.unparsed = unparsed;

        this.tokens = Tokenizer._tokenize(this.input);
        this.tokens = Tokenizer._replaceSpecialChars(this.tokens);
        this.tokens = Tokenizer._reduceValues(this.tokens);
        this.tokens = Tokenizer._extractRecursion(this.tokens);
        this.tokens = Tokenizer._formEntries(this.tokens);
    }

    static _getInput (str) {
        var inputTerminatorMatch = str.match(INPUT_TERMINATOR_RE);

        if (!inputTerminatorMatch)
            return { input: str, unparsed: '' };

        return {
            input:    str.substr(0, inputTerminatorMatch.index),
            unparsed: str.substr(inputTerminatorMatch.index + inputTerminatorMatch[1].length)
        };
    }

    static _getToken (str) {
        return Object.keys(BASIC_TOKENS)
            .map(tokenType => ({ type: tokenType, match: str.match(BASIC_TOKENS[tokenType]) }))
            .filter(token => !!token.match)[0];
    }

    static _tokenize (str) {
        var result = [];

        while (str) {
            var token = null;

            for (var i = 0; i < str.length && !token; i++)
                token = Tokenizer._getToken(str.substr(i));

            if (i > 1 || !token) {
                result.push({ type: 'string', match: [str.substr(0, token ? i - 1 : i)] });

                str = str.substr(token ? i - 1 : i);
            }

            if (token) {
                result.push(token);

                str = str.substr(token.match[0].length);
            }
        }

        return result;
    }

    static _replaceSpecialChars (tokens) {
        return tokens
            .map(token => {
                if (token.type !== 'special-char')
                    return token;

                return {
                    type:  'string',
                    match: [token.match[1]]
                };
            });
    }

    static _reduceValues (tokens) {
        var result = [];

        tokens
            .forEach(token => {
                var lastToken = result[result.length - 1];

                if (
                    token.type !== 'string' ||
                    !lastToken ||
                    lastToken.type !== 'string'
                ) {
                    result.push(token);
                    return;
                }

                lastToken.type = 'string';
                lastToken.match[0] += token.match[0];
            });

        return result;
    }

    static _splitBySeparator (tokens) {
        var indexes = tokens
            .map((token, index) => token.type === 'separator' ? index : -1)
            .filter(index => index > -1);

        if (!indexes.length)
            return tokens.length ? [{ type: 'entry', match: tokens.slice() }] : [];

        var result = [tokens.slice(0, indexes[0])];

        for (var i = 1; i < indexes.length; i++)
            result.push(tokens.slice(indexes[i - 1] + 1, indexes[i]));

        result.push(tokens.slice(indexes[indexes.length - 1] + 1, tokens.length));

        return result
            .filter(childrenTokens => !!childrenTokens.length)
            .map(childrenTokens => ({ type: 'entry', match: childrenTokens }));
    }

    static _formEntries (tokens) {
        var result = Tokenizer._splitBySeparator(tokens);

        result.forEach(token => {
            if (!token.match[2] || token.match[2].type !== 'recursion')
                return;

            token.match[2].match = Tokenizer._formEntries(token.match[2].match);
        });

        return result;
    }

    static _getMinimalRecursionRange (tokens) {
        var result = {
            start: -1,
            end:   -1
        };

        for (var i = 0; i < tokens.length && (result.start === -1 || result.end === -1); i++) {
            if (tokens[i].type === 'start-recursion')
                result.start = i;
            else if (tokens[i].type === 'stop-recursion')
                result.end = i;
        }

        return result;
    }

    static _extractRecursion (tokens) {
        var result         = tokens.slice();
        var recursionRange = Tokenizer._getMinimalRecursionRange(result);

        while (recursionRange.start > -1 && recursionRange.end > -1) {
            var recursionNode = {
                type:  'recursion',
                match: null
            };

            var extracted = result.splice(recursionRange.start, recursionRange.end - recursionRange.start + 1, recursionNode);

            recursionNode.match = extracted.slice(1, extracted.length - 1);

            recursionRange = Tokenizer._getMinimalRecursionRange(result);
        }

        return result;
    }
}

