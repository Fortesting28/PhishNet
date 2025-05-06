(function () {
    'use strict';

    const getDefaultsFromPostinstall = () => (undefined);

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const stringToByteArray$1 = function (str) {
        // TODO(user): Use native implementations if/when available
        const out = [];
        let p = 0;
        for (let i = 0; i < str.length; i++) {
            let c = str.charCodeAt(i);
            if (c < 128) {
                out[p++] = c;
            }
            else if (c < 2048) {
                out[p++] = (c >> 6) | 192;
                out[p++] = (c & 63) | 128;
            }
            else if ((c & 0xfc00) === 0xd800 &&
                i + 1 < str.length &&
                (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
                // Surrogate Pair
                c = 0x10000 + ((c & 0x03ff) << 10) + (str.charCodeAt(++i) & 0x03ff);
                out[p++] = (c >> 18) | 240;
                out[p++] = ((c >> 12) & 63) | 128;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
            else {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
        }
        return out;
    };
    /**
     * Turns an array of numbers into the string given by the concatenation of the
     * characters to which the numbers correspond.
     * @param bytes Array of numbers representing characters.
     * @return Stringification of the array.
     */
    const byteArrayToString = function (bytes) {
        // TODO(user): Use native implementations if/when available
        const out = [];
        let pos = 0, c = 0;
        while (pos < bytes.length) {
            const c1 = bytes[pos++];
            if (c1 < 128) {
                out[c++] = String.fromCharCode(c1);
            }
            else if (c1 > 191 && c1 < 224) {
                const c2 = bytes[pos++];
                out[c++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
            }
            else if (c1 > 239 && c1 < 365) {
                // Surrogate Pair
                const c2 = bytes[pos++];
                const c3 = bytes[pos++];
                const c4 = bytes[pos++];
                const u = (((c1 & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) -
                    0x10000;
                out[c++] = String.fromCharCode(0xd800 + (u >> 10));
                out[c++] = String.fromCharCode(0xdc00 + (u & 1023));
            }
            else {
                const c2 = bytes[pos++];
                const c3 = bytes[pos++];
                out[c++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            }
        }
        return out.join('');
    };
    // We define it as an object literal instead of a class because a class compiled down to es5 can't
    // be treeshaked. https://github.com/rollup/rollup/issues/1691
    // Static lookup maps, lazily populated by init_()
    // TODO(dlarocque): Define this as a class, since we no longer target ES5.
    const base64 = {
        /**
         * Maps bytes to characters.
         */
        byteToCharMap_: null,
        /**
         * Maps characters to bytes.
         */
        charToByteMap_: null,
        /**
         * Maps bytes to websafe characters.
         * @private
         */
        byteToCharMapWebSafe_: null,
        /**
         * Maps websafe characters to bytes.
         * @private
         */
        charToByteMapWebSafe_: null,
        /**
         * Our default alphabet, shared between
         * ENCODED_VALS and ENCODED_VALS_WEBSAFE
         */
        ENCODED_VALS_BASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789',
        /**
         * Our default alphabet. Value 64 (=) is special; it means "nothing."
         */
        get ENCODED_VALS() {
            return this.ENCODED_VALS_BASE + '+/=';
        },
        /**
         * Our websafe alphabet.
         */
        get ENCODED_VALS_WEBSAFE() {
            return this.ENCODED_VALS_BASE + '-_.';
        },
        /**
         * Whether this browser supports the atob and btoa functions. This extension
         * started at Mozilla but is now implemented by many browsers. We use the
         * ASSUME_* variables to avoid pulling in the full useragent detection library
         * but still allowing the standard per-browser compilations.
         *
         */
        HAS_NATIVE_SUPPORT: typeof atob === 'function',
        /**
         * Base64-encode an array of bytes.
         *
         * @param input An array of bytes (numbers with
         *     value in [0, 255]) to encode.
         * @param webSafe Boolean indicating we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeByteArray(input, webSafe) {
            if (!Array.isArray(input)) {
                throw Error('encodeByteArray takes an array as a parameter');
            }
            this.init_();
            const byteToCharMap = webSafe
                ? this.byteToCharMapWebSafe_
                : this.byteToCharMap_;
            const output = [];
            for (let i = 0; i < input.length; i += 3) {
                const byte1 = input[i];
                const haveByte2 = i + 1 < input.length;
                const byte2 = haveByte2 ? input[i + 1] : 0;
                const haveByte3 = i + 2 < input.length;
                const byte3 = haveByte3 ? input[i + 2] : 0;
                const outByte1 = byte1 >> 2;
                const outByte2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
                let outByte3 = ((byte2 & 0x0f) << 2) | (byte3 >> 6);
                let outByte4 = byte3 & 0x3f;
                if (!haveByte3) {
                    outByte4 = 64;
                    if (!haveByte2) {
                        outByte3 = 64;
                    }
                }
                output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
            }
            return output.join('');
        },
        /**
         * Base64-encode a string.
         *
         * @param input A string to encode.
         * @param webSafe If true, we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeString(input, webSafe) {
            // Shortcut for Mozilla browsers that implement
            // a native base64 encoder in the form of "btoa/atob"
            if (this.HAS_NATIVE_SUPPORT && !webSafe) {
                return btoa(input);
            }
            return this.encodeByteArray(stringToByteArray$1(input), webSafe);
        },
        /**
         * Base64-decode a string.
         *
         * @param input to decode.
         * @param webSafe True if we should use the
         *     alternative alphabet.
         * @return string representing the decoded value.
         */
        decodeString(input, webSafe) {
            // Shortcut for Mozilla browsers that implement
            // a native base64 encoder in the form of "btoa/atob"
            if (this.HAS_NATIVE_SUPPORT && !webSafe) {
                return atob(input);
            }
            return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
        },
        /**
         * Base64-decode a string.
         *
         * In base-64 decoding, groups of four characters are converted into three
         * bytes.  If the encoder did not apply padding, the input length may not
         * be a multiple of 4.
         *
         * In this case, the last group will have fewer than 4 characters, and
         * padding will be inferred.  If the group has one or two characters, it decodes
         * to one byte.  If the group has three characters, it decodes to two bytes.
         *
         * @param input Input to decode.
         * @param webSafe True if we should use the web-safe alphabet.
         * @return bytes representing the decoded value.
         */
        decodeStringToByteArray(input, webSafe) {
            this.init_();
            const charToByteMap = webSafe
                ? this.charToByteMapWebSafe_
                : this.charToByteMap_;
            const output = [];
            for (let i = 0; i < input.length;) {
                const byte1 = charToByteMap[input.charAt(i++)];
                const haveByte2 = i < input.length;
                const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
                ++i;
                const haveByte3 = i < input.length;
                const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
                ++i;
                const haveByte4 = i < input.length;
                const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
                ++i;
                if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
                    throw new DecodeBase64StringError();
                }
                const outByte1 = (byte1 << 2) | (byte2 >> 4);
                output.push(outByte1);
                if (byte3 !== 64) {
                    const outByte2 = ((byte2 << 4) & 0xf0) | (byte3 >> 2);
                    output.push(outByte2);
                    if (byte4 !== 64) {
                        const outByte3 = ((byte3 << 6) & 0xc0) | byte4;
                        output.push(outByte3);
                    }
                }
            }
            return output;
        },
        /**
         * Lazy static initialization function. Called before
         * accessing any of the static map variables.
         * @private
         */
        init_() {
            if (!this.byteToCharMap_) {
                this.byteToCharMap_ = {};
                this.charToByteMap_ = {};
                this.byteToCharMapWebSafe_ = {};
                this.charToByteMapWebSafe_ = {};
                // We want quick mappings back and forth, so we precompute two maps.
                for (let i = 0; i < this.ENCODED_VALS.length; i++) {
                    this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
                    this.charToByteMap_[this.byteToCharMap_[i]] = i;
                    this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
                    this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
                    // Be forgiving when decoding and correctly decode both encodings.
                    if (i >= this.ENCODED_VALS_BASE.length) {
                        this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
                        this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
                    }
                }
            }
        }
    };
    /**
     * An error encountered while decoding base64 string.
     */
    class DecodeBase64StringError extends Error {
        constructor() {
            super(...arguments);
            this.name = 'DecodeBase64StringError';
        }
    }
    /**
     * URL-safe base64 encoding
     */
    const base64Encode = function (str) {
        const utf8Bytes = stringToByteArray$1(str);
        return base64.encodeByteArray(utf8Bytes, true);
    };
    /**
     * URL-safe base64 encoding (without "." padding in the end).
     * e.g. Used in JSON Web Token (JWT) parts.
     */
    const base64urlEncodeWithoutPadding = function (str) {
        // Use base64url encoding and remove padding in the end (dot characters).
        return base64Encode(str).replace(/\./g, '');
    };
    /**
     * URL-safe base64 decoding
     *
     * NOTE: DO NOT use the global atob() function - it does NOT support the
     * base64Url variant encoding.
     *
     * @param str To be decoded
     * @return Decoded result, if possible
     */
    const base64Decode = function (str) {
        try {
            return base64.decodeString(str, true);
        }
        catch (e) {
            console.error('base64Decode failed: ', e);
        }
        return null;
    };

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Polyfill for `globalThis` object.
     * @returns the `globalThis` object for the given environment.
     * @public
     */
    function getGlobal() {
        if (typeof self !== 'undefined') {
            return self;
        }
        if (typeof window !== 'undefined') {
            return window;
        }
        if (typeof global !== 'undefined') {
            return global;
        }
        throw new Error('Unable to locate global object.');
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
    /**
     * Attempt to read defaults from a JSON string provided to
     * process(.)env(.)__FIREBASE_DEFAULTS__ or a JSON file whose path is in
     * process(.)env(.)__FIREBASE_DEFAULTS_PATH__
     * The dots are in parens because certain compilers (Vite?) cannot
     * handle seeing that variable in comments.
     * See https://github.com/firebase/firebase-js-sdk/issues/6838
     */
    const getDefaultsFromEnvVariable = () => {
        if (typeof process === 'undefined' || typeof process.env === 'undefined') {
            return;
        }
        const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
        if (defaultsJsonString) {
            return JSON.parse(defaultsJsonString);
        }
    };
    const getDefaultsFromCookie = () => {
        if (typeof document === 'undefined') {
            return;
        }
        let match;
        try {
            match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
        }
        catch (e) {
            // Some environments such as Angular Universal SSR have a
            // `document` object but error on accessing `document.cookie`.
            return;
        }
        const decoded = match && base64Decode(match[1]);
        return decoded && JSON.parse(decoded);
    };
    /**
     * Get the __FIREBASE_DEFAULTS__ object. It checks in order:
     * (1) if such an object exists as a property of `globalThis`
     * (2) if such an object was provided on a shell environment variable
     * (3) if such an object exists in a cookie
     * @public
     */
    const getDefaults = () => {
        try {
            return (getDefaultsFromPostinstall() ||
                getDefaultsFromGlobal() ||
                getDefaultsFromEnvVariable() ||
                getDefaultsFromCookie());
        }
        catch (e) {
            /**
             * Catch-all for being unable to get __FIREBASE_DEFAULTS__ due
             * to any environment case we have not accounted for. Log to
             * info instead of swallowing so we can find these unknown cases
             * and add paths for them if needed.
             */
            console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
            return;
        }
    };
    /**
     * Returns emulator host stored in the __FIREBASE_DEFAULTS__ object
     * for the given product.
     * @returns a URL host formatted like `127.0.0.1:9999` or `[::1]:4000` if available
     * @public
     */
    const getDefaultEmulatorHost = (productName) => { var _a, _b; return (_b = (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.emulatorHosts) === null || _b === void 0 ? void 0 : _b[productName]; };
    /**
     * Returns emulator hostname and port stored in the __FIREBASE_DEFAULTS__ object
     * for the given product.
     * @returns a pair of hostname and port like `["::1", 4000]` if available
     * @public
     */
    const getDefaultEmulatorHostnameAndPort = (productName) => {
        const host = getDefaultEmulatorHost(productName);
        if (!host) {
            return undefined;
        }
        const separatorIndex = host.lastIndexOf(':'); // Finding the last since IPv6 addr also has colons.
        if (separatorIndex <= 0 || separatorIndex + 1 === host.length) {
            throw new Error(`Invalid host ${host} with no separate hostname and port!`);
        }
        // eslint-disable-next-line no-restricted-globals
        const port = parseInt(host.substring(separatorIndex + 1), 10);
        if (host[0] === '[') {
            // Bracket-quoted `[ipv6addr]:port` => return "ipv6addr" (without brackets).
            return [host.substring(1, separatorIndex - 1), port];
        }
        else {
            return [host.substring(0, separatorIndex), port];
        }
    };
    /**
     * Returns Firebase app config stored in the __FIREBASE_DEFAULTS__ object.
     * @public
     */
    const getDefaultAppConfig = () => { var _a; return (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.config; };
    /**
     * Returns an experimental setting on the __FIREBASE_DEFAULTS__ object (properties
     * prefixed by "_")
     * @public
     */
    const getExperimentalSetting = (name) => { var _a; return (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a[`_${name}`]; };

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class Deferred {
        constructor() {
            this.reject = () => { };
            this.resolve = () => { };
            this.promise = new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        }
        /**
         * Our API internals are not promisified and cannot because our callback APIs have subtle expectations around
         * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
         * and returns a node-style callback which will resolve or reject the Deferred's promise.
         */
        wrapCallback(callback) {
            return (error, value) => {
                if (error) {
                    this.reject(error);
                }
                else {
                    this.resolve(value);
                }
                if (typeof callback === 'function') {
                    // Attaching noop handler just in case developer wasn't expecting
                    // promises
                    this.promise.catch(() => { });
                    // Some of our callbacks don't expect a value and our own tests
                    // assert that the parameter length is 1
                    if (callback.length === 1) {
                        callback(error);
                    }
                    else {
                        callback(error, value);
                    }
                }
            };
        }
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function createMockUserToken(token, projectId) {
        if (token.uid) {
            throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');
        }
        // Unsecured JWTs use "none" as the algorithm.
        const header = {
            alg: 'none',
            type: 'JWT'
        };
        const project = projectId || 'demo-project';
        const iat = token.iat || 0;
        const sub = token.sub || token.user_id;
        if (!sub) {
            throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");
        }
        const payload = Object.assign({ 
            // Set all required fields to decent defaults
            iss: `https://securetoken.google.com/${project}`, aud: project, iat, exp: iat + 3600, auth_time: iat, sub, user_id: sub, firebase: {
                sign_in_provider: 'custom',
                identities: {}
            } }, token);
        // Unsecured JWTs use the empty string as a signature.
        const signature = '';
        return [
            base64urlEncodeWithoutPadding(JSON.stringify(header)),
            base64urlEncodeWithoutPadding(JSON.stringify(payload)),
            signature
        ].join('.');
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns navigator.userAgent string or '' if it's not defined.
     * @return user agent string
     */
    function getUA() {
        if (typeof navigator !== 'undefined' &&
            typeof navigator['userAgent'] === 'string') {
            return navigator['userAgent'];
        }
        else {
            return '';
        }
    }
    /**
     * Detect Cordova / PhoneGap / Ionic frameworks on a mobile device.
     *
     * Deliberately does not rely on checking `file://` URLs (as this fails PhoneGap
     * in the Ripple emulator) nor Cordova `onDeviceReady`, which would normally
     * wait for a callback.
     */
    function isMobileCordova() {
        return (typeof window !== 'undefined' &&
            // @ts-ignore Setting up an broadly applicable index signature for Window
            // just to deal with this case would probably be a bad idea.
            !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) &&
            /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA()));
    }
    /**
     * Detect Node.js.
     *
     * @return true if Node.js environment is detected or specified.
     */
    // Node detection logic from: https://github.com/iliakan/detect-node/
    function isNode() {
        var _a;
        const forceEnvironment = (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.forceEnvironment;
        if (forceEnvironment === 'node') {
            return true;
        }
        else if (forceEnvironment === 'browser') {
            return false;
        }
        try {
            return (Object.prototype.toString.call(global.process) === '[object process]');
        }
        catch (e) {
            return false;
        }
    }
    /**
     * Detect Cloudflare Worker context.
     */
    function isCloudflareWorker() {
        return (typeof navigator !== 'undefined' &&
            navigator.userAgent === 'Cloudflare-Workers');
    }
    function isBrowserExtension() {
        const runtime = typeof chrome === 'object'
            ? chrome.runtime
            : typeof browser === 'object'
                ? browser.runtime
                : undefined;
        return typeof runtime === 'object' && runtime.id !== undefined;
    }
    /**
     * Detect React Native.
     *
     * @return true if ReactNative environment is detected.
     */
    function isReactNative() {
        return (typeof navigator === 'object' && navigator['product'] === 'ReactNative');
    }
    /** Detects Internet Explorer. */
    function isIE() {
        const ua = getUA();
        return ua.indexOf('MSIE ') >= 0 || ua.indexOf('Trident/') >= 0;
    }
    /** Returns true if we are running in Safari. */
    function isSafari() {
        return (!isNode() &&
            !!navigator.userAgent &&
            navigator.userAgent.includes('Safari') &&
            !navigator.userAgent.includes('Chrome'));
    }
    /**
     * This method checks if indexedDB is supported by current browser/service worker context
     * @return true if indexedDB is supported by current browser/service worker context
     */
    function isIndexedDBAvailable() {
        try {
            return typeof indexedDB === 'object';
        }
        catch (e) {
            return false;
        }
    }
    /**
     * This method validates browser/sw context for indexedDB by opening a dummy indexedDB database and reject
     * if errors occur during the database open operation.
     *
     * @throws exception if current browser/sw context can't run idb.open (ex: Safari iframe, Firefox
     * private browsing)
     */
    function validateIndexedDBOpenable() {
        return new Promise((resolve, reject) => {
            try {
                let preExist = true;
                const DB_CHECK_NAME = 'validate-browser-context-for-indexeddb-analytics-module';
                const request = self.indexedDB.open(DB_CHECK_NAME);
                request.onsuccess = () => {
                    request.result.close();
                    // delete database only when it doesn't pre-exist
                    if (!preExist) {
                        self.indexedDB.deleteDatabase(DB_CHECK_NAME);
                    }
                    resolve(true);
                };
                request.onupgradeneeded = () => {
                    preExist = false;
                };
                request.onerror = () => {
                    var _a;
                    reject(((_a = request.error) === null || _a === void 0 ? void 0 : _a.message) || '');
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @fileoverview Standardized Firebase Error.
     *
     * Usage:
     *
     *   // TypeScript string literals for type-safe codes
     *   type Err =
     *     'unknown' |
     *     'object-not-found'
     *     ;
     *
     *   // Closure enum for type-safe error codes
     *   // at-enum {string}
     *   var Err = {
     *     UNKNOWN: 'unknown',
     *     OBJECT_NOT_FOUND: 'object-not-found',
     *   }
     *
     *   let errors: Map<Err, string> = {
     *     'generic-error': "Unknown error",
     *     'file-not-found': "Could not find file: {$file}",
     *   };
     *
     *   // Type-safe function - must pass a valid error code as param.
     *   let error = new ErrorFactory<Err>('service', 'Service', errors);
     *
     *   ...
     *   throw error.create(Err.GENERIC);
     *   ...
     *   throw error.create(Err.FILE_NOT_FOUND, {'file': fileName});
     *   ...
     *   // Service: Could not file file: foo.txt (service/file-not-found).
     *
     *   catch (e) {
     *     assert(e.message === "Could not find file: foo.txt.");
     *     if ((e as FirebaseError)?.code === 'service/file-not-found') {
     *       console.log("Could not read file: " + e['file']);
     *     }
     *   }
     */
    const ERROR_NAME = 'FirebaseError';
    // Based on code from:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
    class FirebaseError extends Error {
        constructor(
        /** The error code for this error. */
        code, message, 
        /** Custom data for this error. */
        customData) {
            super(message);
            this.code = code;
            this.customData = customData;
            /** The custom name for all FirebaseErrors. */
            this.name = ERROR_NAME;
            // Fix For ES5
            // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
            // TODO(dlarocque): Replace this with `new.target`: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
            //                   which we can now use since we no longer target ES5.
            Object.setPrototypeOf(this, FirebaseError.prototype);
            // Maintains proper stack trace for where our error was thrown.
            // Only available on V8.
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, ErrorFactory.prototype.create);
            }
        }
    }
    class ErrorFactory {
        constructor(service, serviceName, errors) {
            this.service = service;
            this.serviceName = serviceName;
            this.errors = errors;
        }
        create(code, ...data) {
            const customData = data[0] || {};
            const fullCode = `${this.service}/${code}`;
            const template = this.errors[code];
            const message = template ? replaceTemplate(template, customData) : 'Error';
            // Service Name: Error message (service/code).
            const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
            const error = new FirebaseError(fullCode, fullMessage, customData);
            return error;
        }
    }
    function replaceTemplate(template, data) {
        return template.replace(PATTERN, (_, key) => {
            const value = data[key];
            return value != null ? String(value) : `<${key}?>`;
        });
    }
    const PATTERN = /\{\$([^}]+)}/g;
    function isEmpty$1(obj) {
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Deep equal two objects. Support Arrays and Objects.
     */
    function deepEqual(a, b) {
        if (a === b) {
            return true;
        }
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        for (const k of aKeys) {
            if (!bKeys.includes(k)) {
                return false;
            }
            const aProp = a[k];
            const bProp = b[k];
            if (isObject(aProp) && isObject(bProp)) {
                if (!deepEqual(aProp, bProp)) {
                    return false;
                }
            }
            else if (aProp !== bProp) {
                return false;
            }
        }
        for (const k of bKeys) {
            if (!aKeys.includes(k)) {
                return false;
            }
        }
        return true;
    }
    function isObject(thing) {
        return thing !== null && typeof thing === 'object';
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns a querystring-formatted string (e.g. &arg=val&arg2=val2) from a
     * params object (e.g. {arg: 'val', arg2: 'val2'})
     * Note: You must prepend it with ? when adding it to a URL.
     */
    function querystring(querystringParams) {
        const params = [];
        for (const [key, value] of Object.entries(querystringParams)) {
            if (Array.isArray(value)) {
                value.forEach(arrayVal => {
                    params.push(encodeURIComponent(key) + '=' + encodeURIComponent(arrayVal));
                });
            }
            else {
                params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
            }
        }
        return params.length ? '&' + params.join('&') : '';
    }
    /**
     * Decodes a querystring (e.g. ?arg=val&arg2=val2) into a params object
     * (e.g. {arg: 'val', arg2: 'val2'})
     */
    function querystringDecode(querystring) {
        const obj = {};
        const tokens = querystring.replace(/^\?/, '').split('&');
        tokens.forEach(token => {
            if (token) {
                const [key, value] = token.split('=');
                obj[decodeURIComponent(key)] = decodeURIComponent(value);
            }
        });
        return obj;
    }
    /**
     * Extract the query string part of a URL, including the leading question mark (if present).
     */
    function extractQuerystring(url) {
        const queryStart = url.indexOf('?');
        if (!queryStart) {
            return '';
        }
        const fragmentStart = url.indexOf('#', queryStart);
        return url.substring(queryStart, fragmentStart > 0 ? fragmentStart : undefined);
    }

    /**
     * Helper to make a Subscribe function (just like Promise helps make a
     * Thenable).
     *
     * @param executor Function which can make calls to a single Observer
     *     as a proxy.
     * @param onNoObservers Callback when count of Observers goes to zero.
     */
    function createSubscribe(executor, onNoObservers) {
        const proxy = new ObserverProxy(executor, onNoObservers);
        return proxy.subscribe.bind(proxy);
    }
    /**
     * Implement fan-out for any number of Observers attached via a subscribe
     * function.
     */
    class ObserverProxy {
        /**
         * @param executor Function which can make calls to a single Observer
         *     as a proxy.
         * @param onNoObservers Callback when count of Observers goes to zero.
         */
        constructor(executor, onNoObservers) {
            this.observers = [];
            this.unsubscribes = [];
            this.observerCount = 0;
            // Micro-task scheduling by calling task.then().
            this.task = Promise.resolve();
            this.finalized = false;
            this.onNoObservers = onNoObservers;
            // Call the executor asynchronously so subscribers that are called
            // synchronously after the creation of the subscribe function
            // can still receive the very first value generated in the executor.
            this.task
                .then(() => {
                executor(this);
            })
                .catch(e => {
                this.error(e);
            });
        }
        next(value) {
            this.forEachObserver((observer) => {
                observer.next(value);
            });
        }
        error(error) {
            this.forEachObserver((observer) => {
                observer.error(error);
            });
            this.close(error);
        }
        complete() {
            this.forEachObserver((observer) => {
                observer.complete();
            });
            this.close();
        }
        /**
         * Subscribe function that can be used to add an Observer to the fan-out list.
         *
         * - We require that no event is sent to a subscriber synchronously to their
         *   call to subscribe().
         */
        subscribe(nextOrObserver, error, complete) {
            let observer;
            if (nextOrObserver === undefined &&
                error === undefined &&
                complete === undefined) {
                throw new Error('Missing Observer.');
            }
            // Assemble an Observer object when passed as callback functions.
            if (implementsAnyMethods(nextOrObserver, [
                'next',
                'error',
                'complete'
            ])) {
                observer = nextOrObserver;
            }
            else {
                observer = {
                    next: nextOrObserver,
                    error,
                    complete
                };
            }
            if (observer.next === undefined) {
                observer.next = noop;
            }
            if (observer.error === undefined) {
                observer.error = noop;
            }
            if (observer.complete === undefined) {
                observer.complete = noop;
            }
            const unsub = this.unsubscribeOne.bind(this, this.observers.length);
            // Attempt to subscribe to a terminated Observable - we
            // just respond to the Observer with the final error or complete
            // event.
            if (this.finalized) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this.task.then(() => {
                    try {
                        if (this.finalError) {
                            observer.error(this.finalError);
                        }
                        else {
                            observer.complete();
                        }
                    }
                    catch (e) {
                        // nothing
                    }
                    return;
                });
            }
            this.observers.push(observer);
            return unsub;
        }
        // Unsubscribe is synchronous - we guarantee that no events are sent to
        // any unsubscribed Observer.
        unsubscribeOne(i) {
            if (this.observers === undefined || this.observers[i] === undefined) {
                return;
            }
            delete this.observers[i];
            this.observerCount -= 1;
            if (this.observerCount === 0 && this.onNoObservers !== undefined) {
                this.onNoObservers(this);
            }
        }
        forEachObserver(fn) {
            if (this.finalized) {
                // Already closed by previous event....just eat the additional values.
                return;
            }
            // Since sendOne calls asynchronously - there is no chance that
            // this.observers will become undefined.
            for (let i = 0; i < this.observers.length; i++) {
                this.sendOne(i, fn);
            }
        }
        // Call the Observer via one of it's callback function. We are careful to
        // confirm that the observe has not been unsubscribed since this asynchronous
        // function had been queued.
        sendOne(i, fn) {
            // Execute the callback asynchronously
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.task.then(() => {
                if (this.observers !== undefined && this.observers[i] !== undefined) {
                    try {
                        fn(this.observers[i]);
                    }
                    catch (e) {
                        // Ignore exceptions raised in Observers or missing methods of an
                        // Observer.
                        // Log error to console. b/31404806
                        if (typeof console !== 'undefined' && console.error) {
                            console.error(e);
                        }
                    }
                }
            });
        }
        close(err) {
            if (this.finalized) {
                return;
            }
            this.finalized = true;
            if (err !== undefined) {
                this.finalError = err;
            }
            // Proxy is no longer needed - garbage collect references
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.task.then(() => {
                this.observers = undefined;
                this.onNoObservers = undefined;
            });
        }
    }
    /**
     * Return true if the object passed in implements any of the named methods.
     */
    function implementsAnyMethods(obj, methods) {
        if (typeof obj !== 'object' || obj === null) {
            return false;
        }
        for (const method of methods) {
            if (method in obj && typeof obj[method] === 'function') {
                return true;
            }
        }
        return false;
    }
    function noop() {
        // do nothing
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function getModularInstance(service) {
        if (service && service._delegate) {
            return service._delegate;
        }
        else {
            return service;
        }
    }

    /**
     * Component for service name T, e.g. `auth`, `auth-internal`
     */
    class Component {
        /**
         *
         * @param name The public service name, e.g. app, auth, firestore, database
         * @param instanceFactory Service factory responsible for creating the public interface
         * @param type whether the service provided by the component is public or private
         */
        constructor(name, instanceFactory, type) {
            this.name = name;
            this.instanceFactory = instanceFactory;
            this.type = type;
            this.multipleInstances = false;
            /**
             * Properties to be added to the service namespace
             */
            this.serviceProps = {};
            this.instantiationMode = "LAZY" /* InstantiationMode.LAZY */;
            this.onInstanceCreated = null;
        }
        setInstantiationMode(mode) {
            this.instantiationMode = mode;
            return this;
        }
        setMultipleInstances(multipleInstances) {
            this.multipleInstances = multipleInstances;
            return this;
        }
        setServiceProps(props) {
            this.serviceProps = props;
            return this;
        }
        setInstanceCreatedCallback(callback) {
            this.onInstanceCreated = callback;
            return this;
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DEFAULT_ENTRY_NAME$1 = '[DEFAULT]';

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provider for instance for service name T, e.g. 'auth', 'auth-internal'
     * NameServiceMapping[T] is an alias for the type of the instance
     */
    class Provider {
        constructor(name, container) {
            this.name = name;
            this.container = container;
            this.component = null;
            this.instances = new Map();
            this.instancesDeferred = new Map();
            this.instancesOptions = new Map();
            this.onInitCallbacks = new Map();
        }
        /**
         * @param identifier A provider can provide multiple instances of a service
         * if this.component.multipleInstances is true.
         */
        get(identifier) {
            // if multipleInstances is not supported, use the default name
            const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            if (!this.instancesDeferred.has(normalizedIdentifier)) {
                const deferred = new Deferred();
                this.instancesDeferred.set(normalizedIdentifier, deferred);
                if (this.isInitialized(normalizedIdentifier) ||
                    this.shouldAutoInitialize()) {
                    // initialize the service if it can be auto-initialized
                    try {
                        const instance = this.getOrInitializeService({
                            instanceIdentifier: normalizedIdentifier
                        });
                        if (instance) {
                            deferred.resolve(instance);
                        }
                    }
                    catch (e) {
                        // when the instance factory throws an exception during get(), it should not cause
                        // a fatal error. We just return the unresolved promise in this case.
                    }
                }
            }
            return this.instancesDeferred.get(normalizedIdentifier).promise;
        }
        getImmediate(options) {
            var _a;
            // if multipleInstances is not supported, use the default name
            const normalizedIdentifier = this.normalizeInstanceIdentifier(options === null || options === void 0 ? void 0 : options.identifier);
            const optional = (_a = options === null || options === void 0 ? void 0 : options.optional) !== null && _a !== void 0 ? _a : false;
            if (this.isInitialized(normalizedIdentifier) ||
                this.shouldAutoInitialize()) {
                try {
                    return this.getOrInitializeService({
                        instanceIdentifier: normalizedIdentifier
                    });
                }
                catch (e) {
                    if (optional) {
                        return null;
                    }
                    else {
                        throw e;
                    }
                }
            }
            else {
                // In case a component is not initialized and should/cannot be auto-initialized at the moment, return null if the optional flag is set, or throw
                if (optional) {
                    return null;
                }
                else {
                    throw Error(`Service ${this.name} is not available`);
                }
            }
        }
        getComponent() {
            return this.component;
        }
        setComponent(component) {
            if (component.name !== this.name) {
                throw Error(`Mismatching Component ${component.name} for Provider ${this.name}.`);
            }
            if (this.component) {
                throw Error(`Component for ${this.name} has already been provided`);
            }
            this.component = component;
            // return early without attempting to initialize the component if the component requires explicit initialization (calling `Provider.initialize()`)
            if (!this.shouldAutoInitialize()) {
                return;
            }
            // if the service is eager, initialize the default instance
            if (isComponentEager(component)) {
                try {
                    this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME$1 });
                }
                catch (e) {
                    // when the instance factory for an eager Component throws an exception during the eager
                    // initialization, it should not cause a fatal error.
                    // TODO: Investigate if we need to make it configurable, because some component may want to cause
                    // a fatal error in this case?
                }
            }
            // Create service instances for the pending promises and resolve them
            // NOTE: if this.multipleInstances is false, only the default instance will be created
            // and all promises with resolve with it regardless of the identifier.
            for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
                const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
                try {
                    // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
                    const instance = this.getOrInitializeService({
                        instanceIdentifier: normalizedIdentifier
                    });
                    instanceDeferred.resolve(instance);
                }
                catch (e) {
                    // when the instance factory throws an exception, it should not cause
                    // a fatal error. We just leave the promise unresolved.
                }
            }
        }
        clearInstance(identifier = DEFAULT_ENTRY_NAME$1) {
            this.instancesDeferred.delete(identifier);
            this.instancesOptions.delete(identifier);
            this.instances.delete(identifier);
        }
        // app.delete() will call this method on every provider to delete the services
        // TODO: should we mark the provider as deleted?
        async delete() {
            const services = Array.from(this.instances.values());
            await Promise.all([
                ...services
                    .filter(service => 'INTERNAL' in service) // legacy services
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map(service => service.INTERNAL.delete()),
                ...services
                    .filter(service => '_delete' in service) // modularized services
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map(service => service._delete())
            ]);
        }
        isComponentSet() {
            return this.component != null;
        }
        isInitialized(identifier = DEFAULT_ENTRY_NAME$1) {
            return this.instances.has(identifier);
        }
        getOptions(identifier = DEFAULT_ENTRY_NAME$1) {
            return this.instancesOptions.get(identifier) || {};
        }
        initialize(opts = {}) {
            const { options = {} } = opts;
            const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
            if (this.isInitialized(normalizedIdentifier)) {
                throw Error(`${this.name}(${normalizedIdentifier}) has already been initialized`);
            }
            if (!this.isComponentSet()) {
                throw Error(`Component ${this.name} has not been registered yet`);
            }
            const instance = this.getOrInitializeService({
                instanceIdentifier: normalizedIdentifier,
                options
            });
            // resolve any pending promise waiting for the service instance
            for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
                const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
                if (normalizedIdentifier === normalizedDeferredIdentifier) {
                    instanceDeferred.resolve(instance);
                }
            }
            return instance;
        }
        /**
         *
         * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
         * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
         *
         * @param identifier An optional instance identifier
         * @returns a function to unregister the callback
         */
        onInit(callback, identifier) {
            var _a;
            const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            const existingCallbacks = (_a = this.onInitCallbacks.get(normalizedIdentifier)) !== null && _a !== void 0 ? _a : new Set();
            existingCallbacks.add(callback);
            this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
            const existingInstance = this.instances.get(normalizedIdentifier);
            if (existingInstance) {
                callback(existingInstance, normalizedIdentifier);
            }
            return () => {
                existingCallbacks.delete(callback);
            };
        }
        /**
         * Invoke onInit callbacks synchronously
         * @param instance the service instance`
         */
        invokeOnInitCallbacks(instance, identifier) {
            const callbacks = this.onInitCallbacks.get(identifier);
            if (!callbacks) {
                return;
            }
            for (const callback of callbacks) {
                try {
                    callback(instance, identifier);
                }
                catch (_a) {
                    // ignore errors in the onInit callback
                }
            }
        }
        getOrInitializeService({ instanceIdentifier, options = {} }) {
            let instance = this.instances.get(instanceIdentifier);
            if (!instance && this.component) {
                instance = this.component.instanceFactory(this.container, {
                    instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
                    options
                });
                this.instances.set(instanceIdentifier, instance);
                this.instancesOptions.set(instanceIdentifier, options);
                /**
                 * Invoke onInit listeners.
                 * Note this.component.onInstanceCreated is different, which is used by the component creator,
                 * while onInit listeners are registered by consumers of the provider.
                 */
                this.invokeOnInitCallbacks(instance, instanceIdentifier);
                /**
                 * Order is important
                 * onInstanceCreated() should be called after this.instances.set(instanceIdentifier, instance); which
                 * makes `isInitialized()` return true.
                 */
                if (this.component.onInstanceCreated) {
                    try {
                        this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
                    }
                    catch (_a) {
                        // ignore errors in the onInstanceCreatedCallback
                    }
                }
            }
            return instance || null;
        }
        normalizeInstanceIdentifier(identifier = DEFAULT_ENTRY_NAME$1) {
            if (this.component) {
                return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME$1;
            }
            else {
                return identifier; // assume multiple instances are supported before the component is provided.
            }
        }
        shouldAutoInitialize() {
            return (!!this.component &&
                this.component.instantiationMode !== "EXPLICIT" /* InstantiationMode.EXPLICIT */);
        }
    }
    // undefined should be passed to the service factory for the default instance
    function normalizeIdentifierForFactory(identifier) {
        return identifier === DEFAULT_ENTRY_NAME$1 ? undefined : identifier;
    }
    function isComponentEager(component) {
        return component.instantiationMode === "EAGER" /* InstantiationMode.EAGER */;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * ComponentContainer that provides Providers for service name T, e.g. `auth`, `auth-internal`
     */
    class ComponentContainer {
        constructor(name) {
            this.name = name;
            this.providers = new Map();
        }
        /**
         *
         * @param component Component being added
         * @param overwrite When a component with the same name has already been registered,
         * if overwrite is true: overwrite the existing component with the new component and create a new
         * provider with the new component. It can be useful in tests where you want to use different mocks
         * for different tests.
         * if overwrite is false: throw an exception
         */
        addComponent(component) {
            const provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                throw new Error(`Component ${component.name} has already been registered with ${this.name}`);
            }
            provider.setComponent(component);
        }
        addOrOverwriteComponent(component) {
            const provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                // delete the existing provider from the container, so we can register the new component
                this.providers.delete(component.name);
            }
            this.addComponent(component);
        }
        /**
         * getProvider provides a type safe interface where it can only be called with a field name
         * present in NameServiceMapping interface.
         *
         * Firebase SDKs providing services should extend NameServiceMapping interface to register
         * themselves.
         */
        getProvider(name) {
            if (this.providers.has(name)) {
                return this.providers.get(name);
            }
            // create a Provider for a service that hasn't registered with Firebase
            const provider = new Provider(name, this);
            this.providers.set(name, provider);
            return provider;
        }
        getProviders() {
            return Array.from(this.providers.values());
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A container for all of the Logger instances
     */
    /**
     * The JS SDK supports 5 log levels and also allows a user the ability to
     * silence the logs altogether.
     *
     * The order is a follows:
     * DEBUG < VERBOSE < INFO < WARN < ERROR
     *
     * All of the log types above the current log level will be captured (i.e. if
     * you set the log level to `INFO`, errors will still be logged, but `DEBUG` and
     * `VERBOSE` logs will not)
     */
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
        LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
        LogLevel[LogLevel["INFO"] = 2] = "INFO";
        LogLevel[LogLevel["WARN"] = 3] = "WARN";
        LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
        LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
    })(LogLevel || (LogLevel = {}));
    const levelStringToEnum = {
        'debug': LogLevel.DEBUG,
        'verbose': LogLevel.VERBOSE,
        'info': LogLevel.INFO,
        'warn': LogLevel.WARN,
        'error': LogLevel.ERROR,
        'silent': LogLevel.SILENT
    };
    /**
     * The default log level
     */
    const defaultLogLevel = LogLevel.INFO;
    /**
     * By default, `console.debug` is not displayed in the developer console (in
     * chrome). To avoid forcing users to have to opt-in to these logs twice
     * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
     * logs to the `console.log` function.
     */
    const ConsoleMethod = {
        [LogLevel.DEBUG]: 'log',
        [LogLevel.VERBOSE]: 'log',
        [LogLevel.INFO]: 'info',
        [LogLevel.WARN]: 'warn',
        [LogLevel.ERROR]: 'error'
    };
    /**
     * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
     * messages on to their corresponding console counterparts (if the log method
     * is supported by the current log level)
     */
    const defaultLogHandler = (instance, logType, ...args) => {
        if (logType < instance.logLevel) {
            return;
        }
        const now = new Date().toISOString();
        const method = ConsoleMethod[logType];
        if (method) {
            console[method](`[${now}]  ${instance.name}:`, ...args);
        }
        else {
            throw new Error(`Attempted to log a message with an invalid logType (value: ${logType})`);
        }
    };
    class Logger {
        /**
         * Gives you an instance of a Logger to capture messages according to
         * Firebase's logging scheme.
         *
         * @param name The name that the logs will be associated with
         */
        constructor(name) {
            this.name = name;
            /**
             * The log level of the given Logger instance.
             */
            this._logLevel = defaultLogLevel;
            /**
             * The main (internal) log handler for the Logger instance.
             * Can be set to a new function in internal package code but not by user.
             */
            this._logHandler = defaultLogHandler;
            /**
             * The optional, additional, user-defined log handler for the Logger instance.
             */
            this._userLogHandler = null;
        }
        get logLevel() {
            return this._logLevel;
        }
        set logLevel(val) {
            if (!(val in LogLevel)) {
                throw new TypeError(`Invalid value "${val}" assigned to \`logLevel\``);
            }
            this._logLevel = val;
        }
        // Workaround for setter/getter having to be the same type.
        setLogLevel(val) {
            this._logLevel = typeof val === 'string' ? levelStringToEnum[val] : val;
        }
        get logHandler() {
            return this._logHandler;
        }
        set logHandler(val) {
            if (typeof val !== 'function') {
                throw new TypeError('Value assigned to `logHandler` must be a function');
            }
            this._logHandler = val;
        }
        get userLogHandler() {
            return this._userLogHandler;
        }
        set userLogHandler(val) {
            this._userLogHandler = val;
        }
        /**
         * The functions below are all based on the `console` interface
         */
        debug(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.DEBUG, ...args);
            this._logHandler(this, LogLevel.DEBUG, ...args);
        }
        log(...args) {
            this._userLogHandler &&
                this._userLogHandler(this, LogLevel.VERBOSE, ...args);
            this._logHandler(this, LogLevel.VERBOSE, ...args);
        }
        info(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.INFO, ...args);
            this._logHandler(this, LogLevel.INFO, ...args);
        }
        warn(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.WARN, ...args);
            this._logHandler(this, LogLevel.WARN, ...args);
        }
        error(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.ERROR, ...args);
            this._logHandler(this, LogLevel.ERROR, ...args);
        }
    }

    const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);

    let idbProxyableTypes;
    let cursorAdvanceMethods;
    // This is a function to prevent it throwing up in node environments.
    function getIdbProxyableTypes() {
        return (idbProxyableTypes ||
            (idbProxyableTypes = [
                IDBDatabase,
                IDBObjectStore,
                IDBIndex,
                IDBCursor,
                IDBTransaction,
            ]));
    }
    // This is a function to prevent it throwing up in node environments.
    function getCursorAdvanceMethods() {
        return (cursorAdvanceMethods ||
            (cursorAdvanceMethods = [
                IDBCursor.prototype.advance,
                IDBCursor.prototype.continue,
                IDBCursor.prototype.continuePrimaryKey,
            ]));
    }
    const cursorRequestMap = new WeakMap();
    const transactionDoneMap = new WeakMap();
    const transactionStoreNamesMap = new WeakMap();
    const transformCache = new WeakMap();
    const reverseTransformCache = new WeakMap();
    function promisifyRequest(request) {
        const promise = new Promise((resolve, reject) => {
            const unlisten = () => {
                request.removeEventListener('success', success);
                request.removeEventListener('error', error);
            };
            const success = () => {
                resolve(wrap(request.result));
                unlisten();
            };
            const error = () => {
                reject(request.error);
                unlisten();
            };
            request.addEventListener('success', success);
            request.addEventListener('error', error);
        });
        promise
            .then((value) => {
            // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
            // (see wrapFunction).
            if (value instanceof IDBCursor) {
                cursorRequestMap.set(value, request);
            }
            // Catching to avoid "Uncaught Promise exceptions"
        })
            .catch(() => { });
        // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
        // is because we create many promises from a single IDBRequest.
        reverseTransformCache.set(promise, request);
        return promise;
    }
    function cacheDonePromiseForTransaction(tx) {
        // Early bail if we've already created a done promise for this transaction.
        if (transactionDoneMap.has(tx))
            return;
        const done = new Promise((resolve, reject) => {
            const unlisten = () => {
                tx.removeEventListener('complete', complete);
                tx.removeEventListener('error', error);
                tx.removeEventListener('abort', error);
            };
            const complete = () => {
                resolve();
                unlisten();
            };
            const error = () => {
                reject(tx.error || new DOMException('AbortError', 'AbortError'));
                unlisten();
            };
            tx.addEventListener('complete', complete);
            tx.addEventListener('error', error);
            tx.addEventListener('abort', error);
        });
        // Cache it for later retrieval.
        transactionDoneMap.set(tx, done);
    }
    let idbProxyTraps = {
        get(target, prop, receiver) {
            if (target instanceof IDBTransaction) {
                // Special handling for transaction.done.
                if (prop === 'done')
                    return transactionDoneMap.get(target);
                // Polyfill for objectStoreNames because of Edge.
                if (prop === 'objectStoreNames') {
                    return target.objectStoreNames || transactionStoreNamesMap.get(target);
                }
                // Make tx.store return the only store in the transaction, or undefined if there are many.
                if (prop === 'store') {
                    return receiver.objectStoreNames[1]
                        ? undefined
                        : receiver.objectStore(receiver.objectStoreNames[0]);
                }
            }
            // Else transform whatever we get back.
            return wrap(target[prop]);
        },
        set(target, prop, value) {
            target[prop] = value;
            return true;
        },
        has(target, prop) {
            if (target instanceof IDBTransaction &&
                (prop === 'done' || prop === 'store')) {
                return true;
            }
            return prop in target;
        },
    };
    function replaceTraps(callback) {
        idbProxyTraps = callback(idbProxyTraps);
    }
    function wrapFunction(func) {
        // Due to expected object equality (which is enforced by the caching in `wrap`), we
        // only create one new func per func.
        // Edge doesn't support objectStoreNames (booo), so we polyfill it here.
        if (func === IDBDatabase.prototype.transaction &&
            !('objectStoreNames' in IDBTransaction.prototype)) {
            return function (storeNames, ...args) {
                const tx = func.call(unwrap(this), storeNames, ...args);
                transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
                return wrap(tx);
            };
        }
        // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
        // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
        // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
        // with real promises, so each advance methods returns a new promise for the cursor object, or
        // undefined if the end of the cursor has been reached.
        if (getCursorAdvanceMethods().includes(func)) {
            return function (...args) {
                // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
                // the original object.
                func.apply(unwrap(this), args);
                return wrap(cursorRequestMap.get(this));
            };
        }
        return function (...args) {
            // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
            // the original object.
            return wrap(func.apply(unwrap(this), args));
        };
    }
    function transformCachableValue(value) {
        if (typeof value === 'function')
            return wrapFunction(value);
        // This doesn't return, it just creates a 'done' promise for the transaction,
        // which is later returned for transaction.done (see idbObjectHandler).
        if (value instanceof IDBTransaction)
            cacheDonePromiseForTransaction(value);
        if (instanceOfAny(value, getIdbProxyableTypes()))
            return new Proxy(value, idbProxyTraps);
        // Return the same value back if we're not going to transform it.
        return value;
    }
    function wrap(value) {
        // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
        // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
        if (value instanceof IDBRequest)
            return promisifyRequest(value);
        // If we've already transformed this value before, reuse the transformed value.
        // This is faster, but it also provides object equality.
        if (transformCache.has(value))
            return transformCache.get(value);
        const newValue = transformCachableValue(value);
        // Not all types are transformed.
        // These may be primitive types, so they can't be WeakMap keys.
        if (newValue !== value) {
            transformCache.set(value, newValue);
            reverseTransformCache.set(newValue, value);
        }
        return newValue;
    }
    const unwrap = (value) => reverseTransformCache.get(value);

    /**
     * Open a database.
     *
     * @param name Name of the database.
     * @param version Schema version.
     * @param callbacks Additional callbacks.
     */
    function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
        const request = indexedDB.open(name, version);
        const openPromise = wrap(request);
        if (upgrade) {
            request.addEventListener('upgradeneeded', (event) => {
                upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
            });
        }
        if (blocked) {
            request.addEventListener('blocked', (event) => blocked(
            // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
            event.oldVersion, event.newVersion, event));
        }
        openPromise
            .then((db) => {
            if (terminated)
                db.addEventListener('close', () => terminated());
            if (blocking) {
                db.addEventListener('versionchange', (event) => blocking(event.oldVersion, event.newVersion, event));
            }
        })
            .catch(() => { });
        return openPromise;
    }

    const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
    const writeMethods = ['put', 'add', 'delete', 'clear'];
    const cachedMethods = new Map();
    function getMethod(target, prop) {
        if (!(target instanceof IDBDatabase &&
            !(prop in target) &&
            typeof prop === 'string')) {
            return;
        }
        if (cachedMethods.get(prop))
            return cachedMethods.get(prop);
        const targetFuncName = prop.replace(/FromIndex$/, '');
        const useIndex = prop !== targetFuncName;
        const isWrite = writeMethods.includes(targetFuncName);
        if (
        // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
        !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
            !(isWrite || readMethods.includes(targetFuncName))) {
            return;
        }
        const method = async function (storeName, ...args) {
            // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
            const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
            let target = tx.store;
            if (useIndex)
                target = target.index(args.shift());
            // Must reject if op rejects.
            // If it's a write operation, must reject if tx.done rejects.
            // Must reject with op rejection first.
            // Must resolve with op value.
            // Must handle both promises (no unhandled rejections)
            return (await Promise.all([
                target[targetFuncName](...args),
                isWrite && tx.done,
            ]))[0];
        };
        cachedMethods.set(prop, method);
        return method;
    }
    replaceTraps((oldTraps) => ({
        ...oldTraps,
        get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
        has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop),
    }));

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class PlatformLoggerServiceImpl {
        constructor(container) {
            this.container = container;
        }
        // In initial implementation, this will be called by installations on
        // auth token refresh, and installations will send this string.
        getPlatformInfoString() {
            const providers = this.container.getProviders();
            // Loop through providers and get library/version pairs from any that are
            // version components.
            return providers
                .map(provider => {
                if (isVersionServiceProvider(provider)) {
                    const service = provider.getImmediate();
                    return `${service.library}/${service.version}`;
                }
                else {
                    return null;
                }
            })
                .filter(logString => logString)
                .join(' ');
        }
    }
    /**
     *
     * @param provider check if this provider provides a VersionService
     *
     * NOTE: Using Provider<'app-version'> is a hack to indicate that the provider
     * provides VersionService. The provider is not necessarily a 'app-version'
     * provider.
     */
    function isVersionServiceProvider(provider) {
        const component = provider.getComponent();
        return (component === null || component === void 0 ? void 0 : component.type) === "VERSION" /* ComponentType.VERSION */;
    }

    const name$q = "@firebase/app";
    const version$1$1 = "0.11.5";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const logger = new Logger('@firebase/app');

    const name$p = "@firebase/app-compat";

    const name$o = "@firebase/analytics-compat";

    const name$n = "@firebase/analytics";

    const name$m = "@firebase/app-check-compat";

    const name$l = "@firebase/app-check";

    const name$k = "@firebase/auth";

    const name$j = "@firebase/auth-compat";

    const name$i = "@firebase/database";

    const name$h = "@firebase/data-connect";

    const name$g = "@firebase/database-compat";

    const name$f = "@firebase/functions";

    const name$e = "@firebase/functions-compat";

    const name$d = "@firebase/installations";

    const name$c = "@firebase/installations-compat";

    const name$b = "@firebase/messaging";

    const name$a = "@firebase/messaging-compat";

    const name$9 = "@firebase/performance";

    const name$8 = "@firebase/performance-compat";

    const name$7 = "@firebase/remote-config";

    const name$6 = "@firebase/remote-config-compat";

    const name$5 = "@firebase/storage";

    const name$4 = "@firebase/storage-compat";

    const name$3 = "@firebase/firestore";

    const name$2 = "@firebase/vertexai";

    const name$1$1 = "@firebase/firestore-compat";

    const name$r = "firebase";
    const version$2 = "11.6.1";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The default app name
     *
     * @internal
     */
    const DEFAULT_ENTRY_NAME = '[DEFAULT]';
    const PLATFORM_LOG_STRING = {
        [name$q]: 'fire-core',
        [name$p]: 'fire-core-compat',
        [name$n]: 'fire-analytics',
        [name$o]: 'fire-analytics-compat',
        [name$l]: 'fire-app-check',
        [name$m]: 'fire-app-check-compat',
        [name$k]: 'fire-auth',
        [name$j]: 'fire-auth-compat',
        [name$i]: 'fire-rtdb',
        [name$h]: 'fire-data-connect',
        [name$g]: 'fire-rtdb-compat',
        [name$f]: 'fire-fn',
        [name$e]: 'fire-fn-compat',
        [name$d]: 'fire-iid',
        [name$c]: 'fire-iid-compat',
        [name$b]: 'fire-fcm',
        [name$a]: 'fire-fcm-compat',
        [name$9]: 'fire-perf',
        [name$8]: 'fire-perf-compat',
        [name$7]: 'fire-rc',
        [name$6]: 'fire-rc-compat',
        [name$5]: 'fire-gcs',
        [name$4]: 'fire-gcs-compat',
        [name$3]: 'fire-fst',
        [name$1$1]: 'fire-fst-compat',
        [name$2]: 'fire-vertex',
        'fire-js': 'fire-js', // Platform identifier for JS SDK.
        [name$r]: 'fire-js-all'
    };

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @internal
     */
    const _apps = new Map();
    /**
     * @internal
     */
    const _serverApps = new Map();
    /**
     * Registered components.
     *
     * @internal
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _components = new Map();
    /**
     * @param component - the component being added to this app's container
     *
     * @internal
     */
    function _addComponent(app, component) {
        try {
            app.container.addComponent(component);
        }
        catch (e) {
            logger.debug(`Component ${component.name} failed to register with FirebaseApp ${app.name}`, e);
        }
    }
    /**
     *
     * @param component - the component to register
     * @returns whether or not the component is registered successfully
     *
     * @internal
     */
    function _registerComponent(component) {
        const componentName = component.name;
        if (_components.has(componentName)) {
            logger.debug(`There were multiple attempts to register component ${componentName}.`);
            return false;
        }
        _components.set(componentName, component);
        // add the component to existing app instances
        for (const app of _apps.values()) {
            _addComponent(app, component);
        }
        for (const serverApp of _serverApps.values()) {
            _addComponent(serverApp, component);
        }
        return true;
    }
    /**
     *
     * @param app - FirebaseApp instance
     * @param name - service name
     *
     * @returns the provider for the service with the matching name
     *
     * @internal
     */
    function _getProvider(app, name) {
        const heartbeatController = app.container
            .getProvider('heartbeat')
            .getImmediate({ optional: true });
        if (heartbeatController) {
            void heartbeatController.triggerHeartbeat();
        }
        return app.container.getProvider(name);
    }
    /**
     *
     * @param obj - an object of type FirebaseApp.
     *
     * @returns true if the provided object is of type FirebaseServerAppImpl.
     *
     * @internal
     */
    function _isFirebaseServerApp(obj) {
        if (obj === null || obj === undefined) {
            return false;
        }
        return obj.settings !== undefined;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const ERRORS = {
        ["no-app" /* AppError.NO_APP */]: "No Firebase App '{$appName}' has been created - " +
            'call initializeApp() first',
        ["bad-app-name" /* AppError.BAD_APP_NAME */]: "Illegal App name: '{$appName}'",
        ["duplicate-app" /* AppError.DUPLICATE_APP */]: "Firebase App named '{$appName}' already exists with different options or config",
        ["app-deleted" /* AppError.APP_DELETED */]: "Firebase App named '{$appName}' already deleted",
        ["server-app-deleted" /* AppError.SERVER_APP_DELETED */]: 'Firebase Server App has been deleted',
        ["no-options" /* AppError.NO_OPTIONS */]: 'Need to provide options, when not being deployed to hosting via source.',
        ["invalid-app-argument" /* AppError.INVALID_APP_ARGUMENT */]: 'firebase.{$appName}() takes either no argument or a ' +
            'Firebase App instance.',
        ["invalid-log-argument" /* AppError.INVALID_LOG_ARGUMENT */]: 'First argument to `onLog` must be null or a function.',
        ["idb-open" /* AppError.IDB_OPEN */]: 'Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.',
        ["idb-get" /* AppError.IDB_GET */]: 'Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.',
        ["idb-set" /* AppError.IDB_WRITE */]: 'Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.',
        ["idb-delete" /* AppError.IDB_DELETE */]: 'Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.',
        ["finalization-registry-not-supported" /* AppError.FINALIZATION_REGISTRY_NOT_SUPPORTED */]: 'FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.',
        ["invalid-server-app-environment" /* AppError.INVALID_SERVER_APP_ENVIRONMENT */]: 'FirebaseServerApp is not for use in browser environments.'
    };
    const ERROR_FACTORY = new ErrorFactory('app', 'Firebase', ERRORS);

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class FirebaseAppImpl {
        constructor(options, config, container) {
            this._isDeleted = false;
            this._options = Object.assign({}, options);
            this._config = Object.assign({}, config);
            this._name = config.name;
            this._automaticDataCollectionEnabled =
                config.automaticDataCollectionEnabled;
            this._container = container;
            this.container.addComponent(new Component('app', () => this, "PUBLIC" /* ComponentType.PUBLIC */));
        }
        get automaticDataCollectionEnabled() {
            this.checkDestroyed();
            return this._automaticDataCollectionEnabled;
        }
        set automaticDataCollectionEnabled(val) {
            this.checkDestroyed();
            this._automaticDataCollectionEnabled = val;
        }
        get name() {
            this.checkDestroyed();
            return this._name;
        }
        get options() {
            this.checkDestroyed();
            return this._options;
        }
        get config() {
            this.checkDestroyed();
            return this._config;
        }
        get container() {
            return this._container;
        }
        get isDeleted() {
            return this._isDeleted;
        }
        set isDeleted(val) {
            this._isDeleted = val;
        }
        /**
         * This function will throw an Error if the App has already been deleted -
         * use before performing API actions on the App.
         */
        checkDestroyed() {
            if (this.isDeleted) {
                throw ERROR_FACTORY.create("app-deleted" /* AppError.APP_DELETED */, { appName: this._name });
            }
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The current SDK version.
     *
     * @public
     */
    const SDK_VERSION = version$2;
    function initializeApp(_options, rawConfig = {}) {
        let options = _options;
        if (typeof rawConfig !== 'object') {
            const name = rawConfig;
            rawConfig = { name };
        }
        const config = Object.assign({ name: DEFAULT_ENTRY_NAME, automaticDataCollectionEnabled: false }, rawConfig);
        const name = config.name;
        if (typeof name !== 'string' || !name) {
            throw ERROR_FACTORY.create("bad-app-name" /* AppError.BAD_APP_NAME */, {
                appName: String(name)
            });
        }
        options || (options = getDefaultAppConfig());
        if (!options) {
            throw ERROR_FACTORY.create("no-options" /* AppError.NO_OPTIONS */);
        }
        const existingApp = _apps.get(name);
        if (existingApp) {
            // return the existing app if options and config deep equal the ones in the existing app.
            if (deepEqual(options, existingApp.options) &&
                deepEqual(config, existingApp.config)) {
                return existingApp;
            }
            else {
                throw ERROR_FACTORY.create("duplicate-app" /* AppError.DUPLICATE_APP */, { appName: name });
            }
        }
        const container = new ComponentContainer(name);
        for (const component of _components.values()) {
            container.addComponent(component);
        }
        const newApp = new FirebaseAppImpl(options, config, container);
        _apps.set(name, newApp);
        return newApp;
    }
    /**
     * Retrieves a {@link @firebase/app#FirebaseApp} instance.
     *
     * When called with no arguments, the default app is returned. When an app name
     * is provided, the app corresponding to that name is returned.
     *
     * An exception is thrown if the app being retrieved has not yet been
     * initialized.
     *
     * @example
     * ```javascript
     * // Return the default app
     * const app = getApp();
     * ```
     *
     * @example
     * ```javascript
     * // Return a named app
     * const otherApp = getApp("otherApp");
     * ```
     *
     * @param name - Optional name of the app to return. If no name is
     *   provided, the default is `"[DEFAULT]"`.
     *
     * @returns The app corresponding to the provided app name.
     *   If no app name is provided, the default app is returned.
     *
     * @public
     */
    function getApp(name = DEFAULT_ENTRY_NAME) {
        const app = _apps.get(name);
        if (!app && name === DEFAULT_ENTRY_NAME && getDefaultAppConfig()) {
            return initializeApp();
        }
        if (!app) {
            throw ERROR_FACTORY.create("no-app" /* AppError.NO_APP */, { appName: name });
        }
        return app;
    }
    /**
     * Registers a library's name and version for platform logging purposes.
     * @param library - Name of 1p or 3p library (e.g. firestore, angularfire)
     * @param version - Current version of that library.
     * @param variant - Bundle variant, e.g., node, rn, etc.
     *
     * @public
     */
    function registerVersion(libraryKeyOrName, version, variant) {
        var _a;
        // TODO: We can use this check to whitelist strings when/if we set up
        // a good whitelist system.
        let library = (_a = PLATFORM_LOG_STRING[libraryKeyOrName]) !== null && _a !== void 0 ? _a : libraryKeyOrName;
        if (variant) {
            library += `-${variant}`;
        }
        const libraryMismatch = library.match(/\s|\//);
        const versionMismatch = version.match(/\s|\//);
        if (libraryMismatch || versionMismatch) {
            const warning = [
                `Unable to register library "${library}" with version "${version}":`
            ];
            if (libraryMismatch) {
                warning.push(`library name "${library}" contains illegal characters (whitespace or "/")`);
            }
            if (libraryMismatch && versionMismatch) {
                warning.push('and');
            }
            if (versionMismatch) {
                warning.push(`version name "${version}" contains illegal characters (whitespace or "/")`);
            }
            logger.warn(warning.join(' '));
            return;
        }
        _registerComponent(new Component(`${library}-version`, () => ({ library, version }), "VERSION" /* ComponentType.VERSION */));
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DB_NAME$1 = 'firebase-heartbeat-database';
    const DB_VERSION$1 = 1;
    const STORE_NAME = 'firebase-heartbeat-store';
    let dbPromise = null;
    function getDbPromise() {
        if (!dbPromise) {
            dbPromise = openDB(DB_NAME$1, DB_VERSION$1, {
                upgrade: (db, oldVersion) => {
                    // We don't use 'break' in this switch statement, the fall-through
                    // behavior is what we want, because if there are multiple versions between
                    // the old version and the current version, we want ALL the migrations
                    // that correspond to those versions to run, not only the last one.
                    // eslint-disable-next-line default-case
                    switch (oldVersion) {
                        case 0:
                            try {
                                db.createObjectStore(STORE_NAME);
                            }
                            catch (e) {
                                // Safari/iOS browsers throw occasional exceptions on
                                // db.createObjectStore() that may be a bug. Avoid blocking
                                // the rest of the app functionality.
                                console.warn(e);
                            }
                    }
                }
            }).catch(e => {
                throw ERROR_FACTORY.create("idb-open" /* AppError.IDB_OPEN */, {
                    originalErrorMessage: e.message
                });
            });
        }
        return dbPromise;
    }
    async function readHeartbeatsFromIndexedDB(app) {
        try {
            const db = await getDbPromise();
            const tx = db.transaction(STORE_NAME);
            const result = await tx.objectStore(STORE_NAME).get(computeKey(app));
            // We already have the value but tx.done can throw,
            // so we need to await it here to catch errors
            await tx.done;
            return result;
        }
        catch (e) {
            if (e instanceof FirebaseError) {
                logger.warn(e.message);
            }
            else {
                const idbGetError = ERROR_FACTORY.create("idb-get" /* AppError.IDB_GET */, {
                    originalErrorMessage: e === null || e === void 0 ? void 0 : e.message
                });
                logger.warn(idbGetError.message);
            }
        }
    }
    async function writeHeartbeatsToIndexedDB(app, heartbeatObject) {
        try {
            const db = await getDbPromise();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const objectStore = tx.objectStore(STORE_NAME);
            await objectStore.put(heartbeatObject, computeKey(app));
            await tx.done;
        }
        catch (e) {
            if (e instanceof FirebaseError) {
                logger.warn(e.message);
            }
            else {
                const idbGetError = ERROR_FACTORY.create("idb-set" /* AppError.IDB_WRITE */, {
                    originalErrorMessage: e === null || e === void 0 ? void 0 : e.message
                });
                logger.warn(idbGetError.message);
            }
        }
    }
    function computeKey(app) {
        return `${app.name}!${app.options.appId}`;
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const MAX_HEADER_BYTES = 1024;
    const MAX_NUM_STORED_HEARTBEATS = 30;
    class HeartbeatServiceImpl {
        constructor(container) {
            this.container = container;
            /**
             * In-memory cache for heartbeats, used by getHeartbeatsHeader() to generate
             * the header string.
             * Stores one record per date. This will be consolidated into the standard
             * format of one record per user agent string before being sent as a header.
             * Populated from indexedDB when the controller is instantiated and should
             * be kept in sync with indexedDB.
             * Leave public for easier testing.
             */
            this._heartbeatsCache = null;
            const app = this.container.getProvider('app').getImmediate();
            this._storage = new HeartbeatStorageImpl(app);
            this._heartbeatsCachePromise = this._storage.read().then(result => {
                this._heartbeatsCache = result;
                return result;
            });
        }
        /**
         * Called to report a heartbeat. The function will generate
         * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
         * to IndexedDB.
         * Note that we only store one heartbeat per day. So if a heartbeat for today is
         * already logged, subsequent calls to this function in the same day will be ignored.
         */
        async triggerHeartbeat() {
            var _a, _b;
            try {
                const platformLogger = this.container
                    .getProvider('platform-logger')
                    .getImmediate();
                // This is the "Firebase user agent" string from the platform logger
                // service, not the browser user agent.
                const agent = platformLogger.getPlatformInfoString();
                const date = getUTCDateString();
                if (((_a = this._heartbeatsCache) === null || _a === void 0 ? void 0 : _a.heartbeats) == null) {
                    this._heartbeatsCache = await this._heartbeatsCachePromise;
                    // If we failed to construct a heartbeats cache, then return immediately.
                    if (((_b = this._heartbeatsCache) === null || _b === void 0 ? void 0 : _b.heartbeats) == null) {
                        return;
                    }
                }
                // Do not store a heartbeat if one is already stored for this day
                // or if a header has already been sent today.
                if (this._heartbeatsCache.lastSentHeartbeatDate === date ||
                    this._heartbeatsCache.heartbeats.some(singleDateHeartbeat => singleDateHeartbeat.date === date)) {
                    return;
                }
                else {
                    // There is no entry for this date. Create one.
                    this._heartbeatsCache.heartbeats.push({ date, agent });
                    // If the number of stored heartbeats exceeds the maximum number of stored heartbeats, remove the heartbeat with the earliest date.
                    // Since this is executed each time a heartbeat is pushed, the limit can only be exceeded by one, so only one needs to be removed.
                    if (this._heartbeatsCache.heartbeats.length > MAX_NUM_STORED_HEARTBEATS) {
                        const earliestHeartbeatIdx = getEarliestHeartbeatIdx(this._heartbeatsCache.heartbeats);
                        this._heartbeatsCache.heartbeats.splice(earliestHeartbeatIdx, 1);
                    }
                }
                return this._storage.overwrite(this._heartbeatsCache);
            }
            catch (e) {
                logger.warn(e);
            }
        }
        /**
         * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
         * It also clears all heartbeats from memory as well as in IndexedDB.
         *
         * NOTE: Consuming product SDKs should not send the header if this method
         * returns an empty string.
         */
        async getHeartbeatsHeader() {
            var _a;
            try {
                if (this._heartbeatsCache === null) {
                    await this._heartbeatsCachePromise;
                }
                // If it's still null or the array is empty, there is no data to send.
                if (((_a = this._heartbeatsCache) === null || _a === void 0 ? void 0 : _a.heartbeats) == null ||
                    this._heartbeatsCache.heartbeats.length === 0) {
                    return '';
                }
                const date = getUTCDateString();
                // Extract as many heartbeats from the cache as will fit under the size limit.
                const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
                const headerString = base64urlEncodeWithoutPadding(JSON.stringify({ version: 2, heartbeats: heartbeatsToSend }));
                // Store last sent date to prevent another being logged/sent for the same day.
                this._heartbeatsCache.lastSentHeartbeatDate = date;
                if (unsentEntries.length > 0) {
                    // Store any unsent entries if they exist.
                    this._heartbeatsCache.heartbeats = unsentEntries;
                    // This seems more likely than emptying the array (below) to lead to some odd state
                    // since the cache isn't empty and this will be called again on the next request,
                    // and is probably safest if we await it.
                    await this._storage.overwrite(this._heartbeatsCache);
                }
                else {
                    this._heartbeatsCache.heartbeats = [];
                    // Do not wait for this, to reduce latency.
                    void this._storage.overwrite(this._heartbeatsCache);
                }
                return headerString;
            }
            catch (e) {
                logger.warn(e);
                return '';
            }
        }
    }
    function getUTCDateString() {
        const today = new Date();
        // Returns date format 'YYYY-MM-DD'
        return today.toISOString().substring(0, 10);
    }
    function extractHeartbeatsForHeader(heartbeatsCache, maxSize = MAX_HEADER_BYTES) {
        // Heartbeats grouped by user agent in the standard format to be sent in
        // the header.
        const heartbeatsToSend = [];
        // Single date format heartbeats that are not sent.
        let unsentEntries = heartbeatsCache.slice();
        for (const singleDateHeartbeat of heartbeatsCache) {
            // Look for an existing entry with the same user agent.
            const heartbeatEntry = heartbeatsToSend.find(hb => hb.agent === singleDateHeartbeat.agent);
            if (!heartbeatEntry) {
                // If no entry for this user agent exists, create one.
                heartbeatsToSend.push({
                    agent: singleDateHeartbeat.agent,
                    dates: [singleDateHeartbeat.date]
                });
                if (countBytes(heartbeatsToSend) > maxSize) {
                    // If the header would exceed max size, remove the added heartbeat
                    // entry and stop adding to the header.
                    heartbeatsToSend.pop();
                    break;
                }
            }
            else {
                heartbeatEntry.dates.push(singleDateHeartbeat.date);
                // If the header would exceed max size, remove the added date
                // and stop adding to the header.
                if (countBytes(heartbeatsToSend) > maxSize) {
                    heartbeatEntry.dates.pop();
                    break;
                }
            }
            // Pop unsent entry from queue. (Skipped if adding the entry exceeded
            // quota and the loop breaks early.)
            unsentEntries = unsentEntries.slice(1);
        }
        return {
            heartbeatsToSend,
            unsentEntries
        };
    }
    class HeartbeatStorageImpl {
        constructor(app) {
            this.app = app;
            this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
        }
        async runIndexedDBEnvironmentCheck() {
            if (!isIndexedDBAvailable()) {
                return false;
            }
            else {
                return validateIndexedDBOpenable()
                    .then(() => true)
                    .catch(() => false);
            }
        }
        /**
         * Read all heartbeats.
         */
        async read() {
            const canUseIndexedDB = await this._canUseIndexedDBPromise;
            if (!canUseIndexedDB) {
                return { heartbeats: [] };
            }
            else {
                const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
                if (idbHeartbeatObject === null || idbHeartbeatObject === void 0 ? void 0 : idbHeartbeatObject.heartbeats) {
                    return idbHeartbeatObject;
                }
                else {
                    return { heartbeats: [] };
                }
            }
        }
        // overwrite the storage with the provided heartbeats
        async overwrite(heartbeatsObject) {
            var _a;
            const canUseIndexedDB = await this._canUseIndexedDBPromise;
            if (!canUseIndexedDB) {
                return;
            }
            else {
                const existingHeartbeatsObject = await this.read();
                return writeHeartbeatsToIndexedDB(this.app, {
                    lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
                    heartbeats: heartbeatsObject.heartbeats
                });
            }
        }
        // add heartbeats
        async add(heartbeatsObject) {
            var _a;
            const canUseIndexedDB = await this._canUseIndexedDBPromise;
            if (!canUseIndexedDB) {
                return;
            }
            else {
                const existingHeartbeatsObject = await this.read();
                return writeHeartbeatsToIndexedDB(this.app, {
                    lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
                    heartbeats: [
                        ...existingHeartbeatsObject.heartbeats,
                        ...heartbeatsObject.heartbeats
                    ]
                });
            }
        }
    }
    /**
     * Calculate bytes of a HeartbeatsByUserAgent array after being wrapped
     * in a platform logging header JSON object, stringified, and converted
     * to base 64.
     */
    function countBytes(heartbeatsCache) {
        // base64 has a restricted set of characters, all of which should be 1 byte.
        return base64urlEncodeWithoutPadding(
        // heartbeatsCache wrapper properties
        JSON.stringify({ version: 2, heartbeats: heartbeatsCache })).length;
    }
    /**
     * Returns the index of the heartbeat with the earliest date.
     * If the heartbeats array is empty, -1 is returned.
     */
    function getEarliestHeartbeatIdx(heartbeats) {
        if (heartbeats.length === 0) {
            return -1;
        }
        let earliestHeartbeatIdx = 0;
        let earliestHeartbeatDate = heartbeats[0].date;
        for (let i = 1; i < heartbeats.length; i++) {
            if (heartbeats[i].date < earliestHeartbeatDate) {
                earliestHeartbeatDate = heartbeats[i].date;
                earliestHeartbeatIdx = i;
            }
        }
        return earliestHeartbeatIdx;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function registerCoreComponents(variant) {
        _registerComponent(new Component('platform-logger', container => new PlatformLoggerServiceImpl(container), "PRIVATE" /* ComponentType.PRIVATE */));
        _registerComponent(new Component('heartbeat', container => new HeartbeatServiceImpl(container), "PRIVATE" /* ComponentType.PRIVATE */));
        // Register `app` package.
        registerVersion(name$q, version$1$1, variant);
        // BUILD_TARGET will be replaced by values like esm2017, cjs2017, etc during the compilation
        registerVersion(name$q, version$1$1, 'esm2017');
        // Register platform SDK identifier (no version).
        registerVersion('fire-js', '');
    }

    /**
     * Firebase App
     *
     * @remarks This package coordinates the communication between the different Firebase components
     * @packageDocumentation
     */
    registerCoreComponents('');

    var name$1 = "firebase";
    var version$1 = "11.6.1";

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    registerVersion(name$1, version$1, 'app');

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol, Iterator */


    function __rest(s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
          t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
          for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
              if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                  t[p[i]] = s[p[i]];
          }
      return t;
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
      var e = new Error(message);
      return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    function _prodErrorMap() {
        // We will include this one message in the prod error map since by the very
        // nature of this error, developers will never be able to see the message
        // using the debugErrorMap (which is installed during auth initialization).
        return {
            ["dependent-sdk-initialized-before-auth" /* AuthErrorCode.DEPENDENT_SDK_INIT_BEFORE_AUTH */]: 'Another Firebase SDK was initialized and is trying to use Auth before Auth is ' +
                'initialized. Please be sure to call `initializeAuth` or `getAuth` before ' +
                'starting any other Firebase SDK.'
        };
    }
    /**
     * A minimal error map with all verbose error messages stripped.
     *
     * See discussion at {@link AuthErrorMap}
     *
     * @public
     */
    const prodErrorMap = _prodErrorMap;
    const _DEFAULT_AUTH_ERROR_FACTORY = new ErrorFactory('auth', 'Firebase', _prodErrorMap());

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const logClient = new Logger('@firebase/auth');
    function _logWarn(msg, ...args) {
        if (logClient.logLevel <= LogLevel.WARN) {
            logClient.warn(`Auth (${SDK_VERSION}): ${msg}`, ...args);
        }
    }
    function _logError(msg, ...args) {
        if (logClient.logLevel <= LogLevel.ERROR) {
            logClient.error(`Auth (${SDK_VERSION}): ${msg}`, ...args);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function _fail(authOrCode, ...rest) {
        throw createErrorInternal(authOrCode, ...rest);
    }
    function _createError(authOrCode, ...rest) {
        return createErrorInternal(authOrCode, ...rest);
    }
    function _errorWithCustomMessage(auth, code, message) {
        const errorMap = Object.assign(Object.assign({}, prodErrorMap()), { [code]: message });
        const factory = new ErrorFactory('auth', 'Firebase', errorMap);
        return factory.create(code, {
            appName: auth.name
        });
    }
    function _serverAppCurrentUserOperationNotSupportedError(auth) {
        return _errorWithCustomMessage(auth, "operation-not-supported-in-this-environment" /* AuthErrorCode.OPERATION_NOT_SUPPORTED */, 'Operations that alter the current user are not supported in conjunction with FirebaseServerApp');
    }
    function createErrorInternal(authOrCode, ...rest) {
        if (typeof authOrCode !== 'string') {
            const code = rest[0];
            const fullParams = [...rest.slice(1)];
            if (fullParams[0]) {
                fullParams[0].appName = authOrCode.name;
            }
            return authOrCode._errorFactory.create(code, ...fullParams);
        }
        return _DEFAULT_AUTH_ERROR_FACTORY.create(authOrCode, ...rest);
    }
    function _assert(assertion, authOrCode, ...rest) {
        if (!assertion) {
            throw createErrorInternal(authOrCode, ...rest);
        }
    }
    /**
     * Unconditionally fails, throwing an internal error with the given message.
     *
     * @param failure type of failure encountered
     * @throws Error
     */
    function debugFail(failure) {
        // Log the failure in addition to throw an exception, just in case the
        // exception is swallowed.
        const message = `INTERNAL ASSERTION FAILED: ` + failure;
        _logError(message);
        // NOTE: We don't use FirebaseError here because these are internal failures
        // that cannot be handled by the user. (Also it would create a circular
        // dependency between the error and assert modules which doesn't work.)
        throw new Error(message);
    }
    /**
     * Fails if the given assertion condition is false, throwing an Error with the
     * given message if it did.
     *
     * @param assertion
     * @param message
     */
    function debugAssert(assertion, message) {
        if (!assertion) {
            debugFail(message);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function _getCurrentUrl() {
        var _a;
        return (typeof self !== 'undefined' && ((_a = self.location) === null || _a === void 0 ? void 0 : _a.href)) || '';
    }
    function _isHttpOrHttps() {
        return _getCurrentScheme() === 'http:' || _getCurrentScheme() === 'https:';
    }
    function _getCurrentScheme() {
        var _a;
        return (typeof self !== 'undefined' && ((_a = self.location) === null || _a === void 0 ? void 0 : _a.protocol)) || null;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Determine whether the browser is working online
     */
    function _isOnline() {
        if (typeof navigator !== 'undefined' &&
            navigator &&
            'onLine' in navigator &&
            typeof navigator.onLine === 'boolean' &&
            // Apply only for traditional web apps and Chrome extensions.
            // This is especially true for Cordova apps which have unreliable
            // navigator.onLine behavior unless cordova-plugin-network-information is
            // installed which overwrites the native navigator.onLine value and
            // defines navigator.connection.
            (_isHttpOrHttps() || isBrowserExtension() || 'connection' in navigator)) {
            return navigator.onLine;
        }
        // If we can't determine the state, assume it is online.
        return true;
    }
    function _getUserLanguage() {
        if (typeof navigator === 'undefined') {
            return null;
        }
        const navigatorLanguage = navigator;
        return (
        // Most reliable, but only supported in Chrome/Firefox.
        (navigatorLanguage.languages && navigatorLanguage.languages[0]) ||
            // Supported in most browsers, but returns the language of the browser
            // UI, not the language set in browser settings.
            navigatorLanguage.language ||
            // Couldn't determine language.
            null);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A structure to help pick between a range of long and short delay durations
     * depending on the current environment. In general, the long delay is used for
     * mobile environments whereas short delays are used for desktop environments.
     */
    class Delay {
        constructor(shortDelay, longDelay) {
            this.shortDelay = shortDelay;
            this.longDelay = longDelay;
            // Internal error when improperly initialized.
            debugAssert(longDelay > shortDelay, 'Short delay should be less than long delay!');
            this.isMobile = isMobileCordova() || isReactNative();
        }
        get() {
            if (!_isOnline()) {
                // Pick the shorter timeout.
                return Math.min(5000 /* DelayMin.OFFLINE */, this.shortDelay);
            }
            // If running in a mobile environment, return the long delay, otherwise
            // return the short delay.
            // This could be improved in the future to dynamically change based on other
            // variables instead of just reading the current environment.
            return this.isMobile ? this.longDelay : this.shortDelay;
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function _emulatorUrl(config, path) {
        debugAssert(config.emulator, 'Emulator should always be set here');
        const { url } = config.emulator;
        if (!path) {
            return url;
        }
        return `${url}${path.startsWith('/') ? path.slice(1) : path}`;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class FetchProvider {
        static initialize(fetchImpl, headersImpl, responseImpl) {
            this.fetchImpl = fetchImpl;
            if (headersImpl) {
                this.headersImpl = headersImpl;
            }
            if (responseImpl) {
                this.responseImpl = responseImpl;
            }
        }
        static fetch() {
            if (this.fetchImpl) {
                return this.fetchImpl;
            }
            if (typeof self !== 'undefined' && 'fetch' in self) {
                return self.fetch;
            }
            if (typeof globalThis !== 'undefined' && globalThis.fetch) {
                return globalThis.fetch;
            }
            if (typeof fetch !== 'undefined') {
                return fetch;
            }
            debugFail('Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
        }
        static headers() {
            if (this.headersImpl) {
                return this.headersImpl;
            }
            if (typeof self !== 'undefined' && 'Headers' in self) {
                return self.Headers;
            }
            if (typeof globalThis !== 'undefined' && globalThis.Headers) {
                return globalThis.Headers;
            }
            if (typeof Headers !== 'undefined') {
                return Headers;
            }
            debugFail('Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
        }
        static response() {
            if (this.responseImpl) {
                return this.responseImpl;
            }
            if (typeof self !== 'undefined' && 'Response' in self) {
                return self.Response;
            }
            if (typeof globalThis !== 'undefined' && globalThis.Response) {
                return globalThis.Response;
            }
            if (typeof Response !== 'undefined') {
                return Response;
            }
            debugFail('Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Map from errors returned by the server to errors to developer visible errors
     */
    const SERVER_ERROR_MAP = {
        // Custom token errors.
        ["CREDENTIAL_MISMATCH" /* ServerError.CREDENTIAL_MISMATCH */]: "custom-token-mismatch" /* AuthErrorCode.CREDENTIAL_MISMATCH */,
        // This can only happen if the SDK sends a bad request.
        ["MISSING_CUSTOM_TOKEN" /* ServerError.MISSING_CUSTOM_TOKEN */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,
        // Create Auth URI errors.
        ["INVALID_IDENTIFIER" /* ServerError.INVALID_IDENTIFIER */]: "invalid-email" /* AuthErrorCode.INVALID_EMAIL */,
        // This can only happen if the SDK sends a bad request.
        ["MISSING_CONTINUE_URI" /* ServerError.MISSING_CONTINUE_URI */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,
        // Sign in with email and password errors (some apply to sign up too).
        ["INVALID_PASSWORD" /* ServerError.INVALID_PASSWORD */]: "wrong-password" /* AuthErrorCode.INVALID_PASSWORD */,
        // This can only happen if the SDK sends a bad request.
        ["MISSING_PASSWORD" /* ServerError.MISSING_PASSWORD */]: "missing-password" /* AuthErrorCode.MISSING_PASSWORD */,
        // Thrown if Email Enumeration Protection is enabled in the project and the email or password is
        // invalid.
        ["INVALID_LOGIN_CREDENTIALS" /* ServerError.INVALID_LOGIN_CREDENTIALS */]: "invalid-credential" /* AuthErrorCode.INVALID_CREDENTIAL */,
        // Sign up with email and password errors.
        ["EMAIL_EXISTS" /* ServerError.EMAIL_EXISTS */]: "email-already-in-use" /* AuthErrorCode.EMAIL_EXISTS */,
        ["PASSWORD_LOGIN_DISABLED" /* ServerError.PASSWORD_LOGIN_DISABLED */]: "operation-not-allowed" /* AuthErrorCode.OPERATION_NOT_ALLOWED */,
        // Verify assertion for sign in with credential errors:
        ["INVALID_IDP_RESPONSE" /* ServerError.INVALID_IDP_RESPONSE */]: "invalid-credential" /* AuthErrorCode.INVALID_CREDENTIAL */,
        ["INVALID_PENDING_TOKEN" /* ServerError.INVALID_PENDING_TOKEN */]: "invalid-credential" /* AuthErrorCode.INVALID_CREDENTIAL */,
        ["FEDERATED_USER_ID_ALREADY_LINKED" /* ServerError.FEDERATED_USER_ID_ALREADY_LINKED */]: "credential-already-in-use" /* AuthErrorCode.CREDENTIAL_ALREADY_IN_USE */,
        // This can only happen if the SDK sends a bad request.
        ["MISSING_REQ_TYPE" /* ServerError.MISSING_REQ_TYPE */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,
        // Send Password reset email errors:
        ["EMAIL_NOT_FOUND" /* ServerError.EMAIL_NOT_FOUND */]: "user-not-found" /* AuthErrorCode.USER_DELETED */,
        ["RESET_PASSWORD_EXCEED_LIMIT" /* ServerError.RESET_PASSWORD_EXCEED_LIMIT */]: "too-many-requests" /* AuthErrorCode.TOO_MANY_ATTEMPTS_TRY_LATER */,
        ["EXPIRED_OOB_CODE" /* ServerError.EXPIRED_OOB_CODE */]: "expired-action-code" /* AuthErrorCode.EXPIRED_OOB_CODE */,
        ["INVALID_OOB_CODE" /* ServerError.INVALID_OOB_CODE */]: "invalid-action-code" /* AuthErrorCode.INVALID_OOB_CODE */,
        // This can only happen if the SDK sends a bad request.
        ["MISSING_OOB_CODE" /* ServerError.MISSING_OOB_CODE */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,
        // Operations that require ID token in request:
        ["CREDENTIAL_TOO_OLD_LOGIN_AGAIN" /* ServerError.CREDENTIAL_TOO_OLD_LOGIN_AGAIN */]: "requires-recent-login" /* AuthErrorCode.CREDENTIAL_TOO_OLD_LOGIN_AGAIN */,
        ["INVALID_ID_TOKEN" /* ServerError.INVALID_ID_TOKEN */]: "invalid-user-token" /* AuthErrorCode.INVALID_AUTH */,
        ["TOKEN_EXPIRED" /* ServerError.TOKEN_EXPIRED */]: "user-token-expired" /* AuthErrorCode.TOKEN_EXPIRED */,
        ["USER_NOT_FOUND" /* ServerError.USER_NOT_FOUND */]: "user-token-expired" /* AuthErrorCode.TOKEN_EXPIRED */,
        // Other errors.
        ["TOO_MANY_ATTEMPTS_TRY_LATER" /* ServerError.TOO_MANY_ATTEMPTS_TRY_LATER */]: "too-many-requests" /* AuthErrorCode.TOO_MANY_ATTEMPTS_TRY_LATER */,
        ["PASSWORD_DOES_NOT_MEET_REQUIREMENTS" /* ServerError.PASSWORD_DOES_NOT_MEET_REQUIREMENTS */]: "password-does-not-meet-requirements" /* AuthErrorCode.PASSWORD_DOES_NOT_MEET_REQUIREMENTS */,
        // Phone Auth related errors.
        ["INVALID_CODE" /* ServerError.INVALID_CODE */]: "invalid-verification-code" /* AuthErrorCode.INVALID_CODE */,
        ["INVALID_SESSION_INFO" /* ServerError.INVALID_SESSION_INFO */]: "invalid-verification-id" /* AuthErrorCode.INVALID_SESSION_INFO */,
        ["INVALID_TEMPORARY_PROOF" /* ServerError.INVALID_TEMPORARY_PROOF */]: "invalid-credential" /* AuthErrorCode.INVALID_CREDENTIAL */,
        ["MISSING_SESSION_INFO" /* ServerError.MISSING_SESSION_INFO */]: "missing-verification-id" /* AuthErrorCode.MISSING_SESSION_INFO */,
        ["SESSION_EXPIRED" /* ServerError.SESSION_EXPIRED */]: "code-expired" /* AuthErrorCode.CODE_EXPIRED */,
        // Other action code errors when additional settings passed.
        // MISSING_CONTINUE_URI is getting mapped to INTERNAL_ERROR above.
        // This is OK as this error will be caught by client side validation.
        ["MISSING_ANDROID_PACKAGE_NAME" /* ServerError.MISSING_ANDROID_PACKAGE_NAME */]: "missing-android-pkg-name" /* AuthErrorCode.MISSING_ANDROID_PACKAGE_NAME */,
        ["UNAUTHORIZED_DOMAIN" /* ServerError.UNAUTHORIZED_DOMAIN */]: "unauthorized-continue-uri" /* AuthErrorCode.UNAUTHORIZED_DOMAIN */,
        // getProjectConfig errors when clientId is passed.
        ["INVALID_OAUTH_CLIENT_ID" /* ServerError.INVALID_OAUTH_CLIENT_ID */]: "invalid-oauth-client-id" /* AuthErrorCode.INVALID_OAUTH_CLIENT_ID */,
        // User actions (sign-up or deletion) disabled errors.
        ["ADMIN_ONLY_OPERATION" /* ServerError.ADMIN_ONLY_OPERATION */]: "admin-restricted-operation" /* AuthErrorCode.ADMIN_ONLY_OPERATION */,
        // Multi factor related errors.
        ["INVALID_MFA_PENDING_CREDENTIAL" /* ServerError.INVALID_MFA_PENDING_CREDENTIAL */]: "invalid-multi-factor-session" /* AuthErrorCode.INVALID_MFA_SESSION */,
        ["MFA_ENROLLMENT_NOT_FOUND" /* ServerError.MFA_ENROLLMENT_NOT_FOUND */]: "multi-factor-info-not-found" /* AuthErrorCode.MFA_INFO_NOT_FOUND */,
        ["MISSING_MFA_ENROLLMENT_ID" /* ServerError.MISSING_MFA_ENROLLMENT_ID */]: "missing-multi-factor-info" /* AuthErrorCode.MISSING_MFA_INFO */,
        ["MISSING_MFA_PENDING_CREDENTIAL" /* ServerError.MISSING_MFA_PENDING_CREDENTIAL */]: "missing-multi-factor-session" /* AuthErrorCode.MISSING_MFA_SESSION */,
        ["SECOND_FACTOR_EXISTS" /* ServerError.SECOND_FACTOR_EXISTS */]: "second-factor-already-in-use" /* AuthErrorCode.SECOND_FACTOR_ALREADY_ENROLLED */,
        ["SECOND_FACTOR_LIMIT_EXCEEDED" /* ServerError.SECOND_FACTOR_LIMIT_EXCEEDED */]: "maximum-second-factor-count-exceeded" /* AuthErrorCode.SECOND_FACTOR_LIMIT_EXCEEDED */,
        // Blocking functions related errors.
        ["BLOCKING_FUNCTION_ERROR_RESPONSE" /* ServerError.BLOCKING_FUNCTION_ERROR_RESPONSE */]: "internal-error" /* AuthErrorCode.INTERNAL_ERROR */,
        // Recaptcha related errors.
        ["RECAPTCHA_NOT_ENABLED" /* ServerError.RECAPTCHA_NOT_ENABLED */]: "recaptcha-not-enabled" /* AuthErrorCode.RECAPTCHA_NOT_ENABLED */,
        ["MISSING_RECAPTCHA_TOKEN" /* ServerError.MISSING_RECAPTCHA_TOKEN */]: "missing-recaptcha-token" /* AuthErrorCode.MISSING_RECAPTCHA_TOKEN */,
        ["INVALID_RECAPTCHA_TOKEN" /* ServerError.INVALID_RECAPTCHA_TOKEN */]: "invalid-recaptcha-token" /* AuthErrorCode.INVALID_RECAPTCHA_TOKEN */,
        ["INVALID_RECAPTCHA_ACTION" /* ServerError.INVALID_RECAPTCHA_ACTION */]: "invalid-recaptcha-action" /* AuthErrorCode.INVALID_RECAPTCHA_ACTION */,
        ["MISSING_CLIENT_TYPE" /* ServerError.MISSING_CLIENT_TYPE */]: "missing-client-type" /* AuthErrorCode.MISSING_CLIENT_TYPE */,
        ["MISSING_RECAPTCHA_VERSION" /* ServerError.MISSING_RECAPTCHA_VERSION */]: "missing-recaptcha-version" /* AuthErrorCode.MISSING_RECAPTCHA_VERSION */,
        ["INVALID_RECAPTCHA_VERSION" /* ServerError.INVALID_RECAPTCHA_VERSION */]: "invalid-recaptcha-version" /* AuthErrorCode.INVALID_RECAPTCHA_VERSION */,
        ["INVALID_REQ_TYPE" /* ServerError.INVALID_REQ_TYPE */]: "invalid-req-type" /* AuthErrorCode.INVALID_REQ_TYPE */
    };

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const CookieAuthProxiedEndpoints = [
        "/v1/accounts:signInWithCustomToken" /* Endpoint.SIGN_IN_WITH_CUSTOM_TOKEN */,
        "/v1/accounts:signInWithEmailLink" /* Endpoint.SIGN_IN_WITH_EMAIL_LINK */,
        "/v1/accounts:signInWithIdp" /* Endpoint.SIGN_IN_WITH_IDP */,
        "/v1/accounts:signInWithPassword" /* Endpoint.SIGN_IN_WITH_PASSWORD */,
        "/v1/accounts:signInWithPhoneNumber" /* Endpoint.SIGN_IN_WITH_PHONE_NUMBER */,
        "/v1/token" /* Endpoint.TOKEN */
    ];
    const DEFAULT_API_TIMEOUT_MS = new Delay(30000, 60000);
    function _addTidIfNecessary(auth, request) {
        if (auth.tenantId && !request.tenantId) {
            return Object.assign(Object.assign({}, request), { tenantId: auth.tenantId });
        }
        return request;
    }
    async function _performApiRequest(auth, method, path, request, customErrorMap = {}) {
        return _performFetchWithErrorHandling(auth, customErrorMap, async () => {
            let body = {};
            let params = {};
            if (request) {
                if (method === "GET" /* HttpMethod.GET */) {
                    params = request;
                }
                else {
                    body = {
                        body: JSON.stringify(request)
                    };
                }
            }
            const query = querystring(Object.assign({ key: auth.config.apiKey }, params)).slice(1);
            const headers = await auth._getAdditionalHeaders();
            headers["Content-Type" /* HttpHeader.CONTENT_TYPE */] = 'application/json';
            if (auth.languageCode) {
                headers["X-Firebase-Locale" /* HttpHeader.X_FIREBASE_LOCALE */] = auth.languageCode;
            }
            const fetchArgs = Object.assign({ method,
                headers }, body);
            /* Security-conscious server-side frameworks tend to have built in mitigations for referrer
               problems". See the Cloudflare GitHub issue #487: Error: The 'referrerPolicy' field on
               'RequestInitializerDict' is not implemented."
               https://github.com/cloudflare/next-on-pages/issues/487 */
            if (!isCloudflareWorker()) {
                fetchArgs.referrerPolicy = 'no-referrer';
            }
            return FetchProvider.fetch()(await _getFinalTarget(auth, auth.config.apiHost, path, query), fetchArgs);
        });
    }
    async function _performFetchWithErrorHandling(auth, customErrorMap, fetchFn) {
        auth._canInitEmulator = false;
        const errorMap = Object.assign(Object.assign({}, SERVER_ERROR_MAP), customErrorMap);
        try {
            const networkTimeout = new NetworkTimeout(auth);
            const response = await Promise.race([
                fetchFn(),
                networkTimeout.promise
            ]);
            // If we've reached this point, the fetch succeeded and the networkTimeout
            // didn't throw; clear the network timeout delay so that Node won't hang
            networkTimeout.clearNetworkTimeout();
            const json = await response.json();
            if ('needConfirmation' in json) {
                throw _makeTaggedError(auth, "account-exists-with-different-credential" /* AuthErrorCode.NEED_CONFIRMATION */, json);
            }
            if (response.ok && !('errorMessage' in json)) {
                return json;
            }
            else {
                const errorMessage = response.ok ? json.errorMessage : json.error.message;
                const [serverErrorCode, serverErrorMessage] = errorMessage.split(' : ');
                if (serverErrorCode === "FEDERATED_USER_ID_ALREADY_LINKED" /* ServerError.FEDERATED_USER_ID_ALREADY_LINKED */) {
                    throw _makeTaggedError(auth, "credential-already-in-use" /* AuthErrorCode.CREDENTIAL_ALREADY_IN_USE */, json);
                }
                else if (serverErrorCode === "EMAIL_EXISTS" /* ServerError.EMAIL_EXISTS */) {
                    throw _makeTaggedError(auth, "email-already-in-use" /* AuthErrorCode.EMAIL_EXISTS */, json);
                }
                else if (serverErrorCode === "USER_DISABLED" /* ServerError.USER_DISABLED */) {
                    throw _makeTaggedError(auth, "user-disabled" /* AuthErrorCode.USER_DISABLED */, json);
                }
                const authError = errorMap[serverErrorCode] ||
                    serverErrorCode
                        .toLowerCase()
                        .replace(/[_\s]+/g, '-');
                if (serverErrorMessage) {
                    throw _errorWithCustomMessage(auth, authError, serverErrorMessage);
                }
                else {
                    _fail(auth, authError);
                }
            }
        }
        catch (e) {
            if (e instanceof FirebaseError) {
                throw e;
            }
            // Changing this to a different error code will log user out when there is a network error
            // because we treat any error other than NETWORK_REQUEST_FAILED as token is invalid.
            // https://github.com/firebase/firebase-js-sdk/blob/4fbc73610d70be4e0852e7de63a39cb7897e8546/packages/auth/src/core/auth/auth_impl.ts#L309-L316
            _fail(auth, "network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */, { 'message': String(e) });
        }
    }
    async function _performSignInRequest(auth, method, path, request, customErrorMap = {}) {
        const serverResponse = await _performApiRequest(auth, method, path, request, customErrorMap);
        if ('mfaPendingCredential' in serverResponse) {
            _fail(auth, "multi-factor-auth-required" /* AuthErrorCode.MFA_REQUIRED */, {
                _serverResponse: serverResponse
            });
        }
        return serverResponse;
    }
    async function _getFinalTarget(auth, host, path, query) {
        const base = `${host}${path}?${query}`;
        const authInternal = auth;
        const finalTarget = authInternal.config.emulator
            ? _emulatorUrl(auth.config, base)
            : `${auth.config.apiScheme}://${base}`;
        // Cookie auth works by MiTMing the signIn and token endpoints from the developer's backend,
        // saving the idToken and refreshToken into cookies, and then redacting the refreshToken
        // from the response
        if (CookieAuthProxiedEndpoints.includes(path)) {
            // Persistence manager is async, we need to await it. We can't just wait for auth initialized
            // here since auth initialization calls this function.
            await authInternal._persistenceManagerAvailable;
            if (authInternal._getPersistenceType() === "COOKIE" /* PersistenceType.COOKIE */) {
                const cookiePersistence = authInternal._getPersistence();
                return cookiePersistence._getFinalTarget(finalTarget).toString();
            }
        }
        return finalTarget;
    }
    function _parseEnforcementState(enforcementStateStr) {
        switch (enforcementStateStr) {
            case 'ENFORCE':
                return "ENFORCE" /* EnforcementState.ENFORCE */;
            case 'AUDIT':
                return "AUDIT" /* EnforcementState.AUDIT */;
            case 'OFF':
                return "OFF" /* EnforcementState.OFF */;
            default:
                return "ENFORCEMENT_STATE_UNSPECIFIED" /* EnforcementState.ENFORCEMENT_STATE_UNSPECIFIED */;
        }
    }
    class NetworkTimeout {
        clearNetworkTimeout() {
            clearTimeout(this.timer);
        }
        constructor(auth) {
            this.auth = auth;
            // Node timers and browser timers are fundamentally incompatible, but we
            // don't care about the value here
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.timer = null;
            this.promise = new Promise((_, reject) => {
                this.timer = setTimeout(() => {
                    return reject(_createError(this.auth, "network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */));
                }, DEFAULT_API_TIMEOUT_MS.get());
            });
        }
    }
    function _makeTaggedError(auth, code, response) {
        const errorParams = {
            appName: auth.name
        };
        if (response.email) {
            errorParams.email = response.email;
        }
        if (response.phoneNumber) {
            errorParams.phoneNumber = response.phoneNumber;
        }
        const error = _createError(auth, code, errorParams);
        // We know customData is defined on error because errorParams is defined
        error.customData._tokenResponse = response;
        return error;
    }
    function isEnterprise(grecaptcha) {
        return (grecaptcha !== undefined &&
            grecaptcha.enterprise !== undefined);
    }
    class RecaptchaConfig {
        constructor(response) {
            /**
             * The reCAPTCHA site key.
             */
            this.siteKey = '';
            /**
             * The list of providers and their enablement status for reCAPTCHA Enterprise.
             */
            this.recaptchaEnforcementState = [];
            if (response.recaptchaKey === undefined) {
                throw new Error('recaptchaKey undefined');
            }
            // Example response.recaptchaKey: "projects/proj123/keys/sitekey123"
            this.siteKey = response.recaptchaKey.split('/')[3];
            this.recaptchaEnforcementState = response.recaptchaEnforcementState;
        }
        /**
         * Returns the reCAPTCHA Enterprise enforcement state for the given provider.
         *
         * @param providerStr - The provider whose enforcement state is to be returned.
         * @returns The reCAPTCHA Enterprise enforcement state for the given provider.
         */
        getProviderEnforcementState(providerStr) {
            if (!this.recaptchaEnforcementState ||
                this.recaptchaEnforcementState.length === 0) {
                return null;
            }
            for (const recaptchaEnforcementState of this.recaptchaEnforcementState) {
                if (recaptchaEnforcementState.provider &&
                    recaptchaEnforcementState.provider === providerStr) {
                    return _parseEnforcementState(recaptchaEnforcementState.enforcementState);
                }
            }
            return null;
        }
        /**
         * Returns true if the reCAPTCHA Enterprise enforcement state for the provider is set to ENFORCE or AUDIT.
         *
         * @param providerStr - The provider whose enablement state is to be returned.
         * @returns Whether or not reCAPTCHA Enterprise protection is enabled for the given provider.
         */
        isProviderEnabled(providerStr) {
            return (this.getProviderEnforcementState(providerStr) ===
                "ENFORCE" /* EnforcementState.ENFORCE */ ||
                this.getProviderEnforcementState(providerStr) === "AUDIT" /* EnforcementState.AUDIT */);
        }
        /**
         * Returns true if reCAPTCHA Enterprise protection is enabled in at least one provider, otherwise
         * returns false.
         *
         * @returns Whether or not reCAPTCHA Enterprise protection is enabled for at least one provider.
         */
        isAnyProviderEnabled() {
            return (this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER" /* RecaptchaAuthProvider.EMAIL_PASSWORD_PROVIDER */) ||
                this.isProviderEnabled("PHONE_PROVIDER" /* RecaptchaAuthProvider.PHONE_PROVIDER */));
        }
    }
    async function getRecaptchaConfig(auth, request) {
        return _performApiRequest(auth, "GET" /* HttpMethod.GET */, "/v2/recaptchaConfig" /* Endpoint.GET_RECAPTCHA_CONFIG */, _addTidIfNecessary(auth, request));
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function deleteAccount(auth, request) {
        return _performApiRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:delete" /* Endpoint.DELETE_ACCOUNT */, request);
    }
    async function getAccountInfo(auth, request) {
        return _performApiRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:lookup" /* Endpoint.GET_ACCOUNT_INFO */, request);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function utcTimestampToDateString(utcTimestamp) {
        if (!utcTimestamp) {
            return undefined;
        }
        try {
            // Convert to date object.
            const date = new Date(Number(utcTimestamp));
            // Test date is valid.
            if (!isNaN(date.getTime())) {
                // Convert to UTC date string.
                return date.toUTCString();
            }
        }
        catch (e) {
            // Do nothing. undefined will be returned.
        }
        return undefined;
    }
    /**
     * Returns a deserialized JSON Web Token (JWT) used to identify the user to a Firebase service.
     *
     * @remarks
     * Returns the current token if it has not expired or if it will not expire in the next five
     * minutes. Otherwise, this will refresh the token and return a new one.
     *
     * @param user - The user.
     * @param forceRefresh - Force refresh regardless of token expiration.
     *
     * @public
     */
    async function getIdTokenResult(user, forceRefresh = false) {
        const userInternal = getModularInstance(user);
        const token = await userInternal.getIdToken(forceRefresh);
        const claims = _parseToken(token);
        _assert(claims && claims.exp && claims.auth_time && claims.iat, userInternal.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        const firebase = typeof claims.firebase === 'object' ? claims.firebase : undefined;
        const signInProvider = firebase === null || firebase === void 0 ? void 0 : firebase['sign_in_provider'];
        return {
            claims,
            token,
            authTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.auth_time)),
            issuedAtTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.iat)),
            expirationTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.exp)),
            signInProvider: signInProvider || null,
            signInSecondFactor: (firebase === null || firebase === void 0 ? void 0 : firebase['sign_in_second_factor']) || null
        };
    }
    function secondsStringToMilliseconds(seconds) {
        return Number(seconds) * 1000;
    }
    function _parseToken(token) {
        const [algorithm, payload, signature] = token.split('.');
        if (algorithm === undefined ||
            payload === undefined ||
            signature === undefined) {
            _logError('JWT malformed, contained fewer than 3 sections');
            return null;
        }
        try {
            const decoded = base64Decode(payload);
            if (!decoded) {
                _logError('Failed to decode base64 JWT payload');
                return null;
            }
            return JSON.parse(decoded);
        }
        catch (e) {
            _logError('Caught error parsing JWT payload as JSON', e === null || e === void 0 ? void 0 : e.toString());
            return null;
        }
    }
    /**
     * Extract expiresIn TTL from a token by subtracting the expiration from the issuance.
     */
    function _tokenExpiresIn(token) {
        const parsedToken = _parseToken(token);
        _assert(parsedToken, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        _assert(typeof parsedToken.exp !== 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        _assert(typeof parsedToken.iat !== 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        return Number(parsedToken.exp) - Number(parsedToken.iat);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function _logoutIfInvalidated(user, promise, bypassAuthState = false) {
        if (bypassAuthState) {
            return promise;
        }
        try {
            return await promise;
        }
        catch (e) {
            if (e instanceof FirebaseError && isUserInvalidated(e)) {
                if (user.auth.currentUser === user) {
                    await user.auth.signOut();
                }
            }
            throw e;
        }
    }
    function isUserInvalidated({ code }) {
        return (code === `auth/${"user-disabled" /* AuthErrorCode.USER_DISABLED */}` ||
            code === `auth/${"user-token-expired" /* AuthErrorCode.TOKEN_EXPIRED */}`);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class ProactiveRefresh {
        constructor(user) {
            this.user = user;
            this.isRunning = false;
            // Node timers and browser timers return fundamentally different types.
            // We don't actually care what the value is but TS won't accept unknown and
            // we can't cast properly in both environments.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.timerId = null;
            this.errorBackoff = 30000 /* Duration.RETRY_BACKOFF_MIN */;
        }
        _start() {
            if (this.isRunning) {
                return;
            }
            this.isRunning = true;
            this.schedule();
        }
        _stop() {
            if (!this.isRunning) {
                return;
            }
            this.isRunning = false;
            if (this.timerId !== null) {
                clearTimeout(this.timerId);
            }
        }
        getInterval(wasError) {
            var _a;
            if (wasError) {
                const interval = this.errorBackoff;
                this.errorBackoff = Math.min(this.errorBackoff * 2, 960000 /* Duration.RETRY_BACKOFF_MAX */);
                return interval;
            }
            else {
                // Reset the error backoff
                this.errorBackoff = 30000 /* Duration.RETRY_BACKOFF_MIN */;
                const expTime = (_a = this.user.stsTokenManager.expirationTime) !== null && _a !== void 0 ? _a : 0;
                const interval = expTime - Date.now() - 300000 /* Duration.OFFSET */;
                return Math.max(0, interval);
            }
        }
        schedule(wasError = false) {
            if (!this.isRunning) {
                // Just in case...
                return;
            }
            const interval = this.getInterval(wasError);
            this.timerId = setTimeout(async () => {
                await this.iteration();
            }, interval);
        }
        async iteration() {
            try {
                await this.user.getIdToken(true);
            }
            catch (e) {
                // Only retry on network errors
                if ((e === null || e === void 0 ? void 0 : e.code) ===
                    `auth/${"network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */}`) {
                    this.schedule(/* wasError */ true);
                }
                return;
            }
            this.schedule();
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class UserMetadata {
        constructor(createdAt, lastLoginAt) {
            this.createdAt = createdAt;
            this.lastLoginAt = lastLoginAt;
            this._initializeTime();
        }
        _initializeTime() {
            this.lastSignInTime = utcTimestampToDateString(this.lastLoginAt);
            this.creationTime = utcTimestampToDateString(this.createdAt);
        }
        _copy(metadata) {
            this.createdAt = metadata.createdAt;
            this.lastLoginAt = metadata.lastLoginAt;
            this._initializeTime();
        }
        toJSON() {
            return {
                createdAt: this.createdAt,
                lastLoginAt: this.lastLoginAt
            };
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function _reloadWithoutSaving(user) {
        var _a;
        const auth = user.auth;
        const idToken = await user.getIdToken();
        const response = await _logoutIfInvalidated(user, getAccountInfo(auth, { idToken }));
        _assert(response === null || response === void 0 ? void 0 : response.users.length, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        const coreAccount = response.users[0];
        user._notifyReloadListener(coreAccount);
        const newProviderData = ((_a = coreAccount.providerUserInfo) === null || _a === void 0 ? void 0 : _a.length)
            ? extractProviderData(coreAccount.providerUserInfo)
            : [];
        const providerData = mergeProviderData(user.providerData, newProviderData);
        // Preserves the non-nonymous status of the stored user, even if no more
        // credentials (federated or email/password) are linked to the user. If
        // the user was previously anonymous, then use provider data to update.
        // On the other hand, if it was not anonymous before, it should never be
        // considered anonymous now.
        const oldIsAnonymous = user.isAnonymous;
        const newIsAnonymous = !(user.email && coreAccount.passwordHash) && !(providerData === null || providerData === void 0 ? void 0 : providerData.length);
        const isAnonymous = !oldIsAnonymous ? false : newIsAnonymous;
        const updates = {
            uid: coreAccount.localId,
            displayName: coreAccount.displayName || null,
            photoURL: coreAccount.photoUrl || null,
            email: coreAccount.email || null,
            emailVerified: coreAccount.emailVerified || false,
            phoneNumber: coreAccount.phoneNumber || null,
            tenantId: coreAccount.tenantId || null,
            providerData,
            metadata: new UserMetadata(coreAccount.createdAt, coreAccount.lastLoginAt),
            isAnonymous
        };
        Object.assign(user, updates);
    }
    /**
     * Reloads user account data, if signed in.
     *
     * @param user - The user.
     *
     * @public
     */
    async function reload(user) {
        const userInternal = getModularInstance(user);
        await _reloadWithoutSaving(userInternal);
        // Even though the current user hasn't changed, update
        // current user will trigger a persistence update w/ the
        // new info.
        await userInternal.auth._persistUserIfCurrent(userInternal);
        userInternal.auth._notifyListenersIfCurrent(userInternal);
    }
    function mergeProviderData(original, newData) {
        const deduped = original.filter(o => !newData.some(n => n.providerId === o.providerId));
        return [...deduped, ...newData];
    }
    function extractProviderData(providers) {
        return providers.map((_a) => {
            var { providerId } = _a, provider = __rest(_a, ["providerId"]);
            return {
                providerId,
                uid: provider.rawId || '',
                displayName: provider.displayName || null,
                email: provider.email || null,
                phoneNumber: provider.phoneNumber || null,
                photoURL: provider.photoUrl || null
            };
        });
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function requestStsToken(auth, refreshToken) {
        const response = await _performFetchWithErrorHandling(auth, {}, async () => {
            const body = querystring({
                'grant_type': 'refresh_token',
                'refresh_token': refreshToken
            }).slice(1);
            const { tokenApiHost, apiKey } = auth.config;
            const url = await _getFinalTarget(auth, tokenApiHost, "/v1/token" /* Endpoint.TOKEN */, `key=${apiKey}`);
            const headers = await auth._getAdditionalHeaders();
            headers["Content-Type" /* HttpHeader.CONTENT_TYPE */] = 'application/x-www-form-urlencoded';
            return FetchProvider.fetch()(url, {
                method: "POST" /* HttpMethod.POST */,
                headers,
                body
            });
        });
        // The response comes back in snake_case. Convert to camel:
        return {
            accessToken: response.access_token,
            expiresIn: response.expires_in,
            refreshToken: response.refresh_token
        };
    }
    async function revokeToken(auth, request) {
        return _performApiRequest(auth, "POST" /* HttpMethod.POST */, "/v2/accounts:revokeToken" /* Endpoint.REVOKE_TOKEN */, _addTidIfNecessary(auth, request));
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * We need to mark this class as internal explicitly to exclude it in the public typings, because
     * it references AuthInternal which has a circular dependency with UserInternal.
     *
     * @internal
     */
    class StsTokenManager {
        constructor() {
            this.refreshToken = null;
            this.accessToken = null;
            this.expirationTime = null;
        }
        get isExpired() {
            return (!this.expirationTime ||
                Date.now() > this.expirationTime - 30000 /* Buffer.TOKEN_REFRESH */);
        }
        updateFromServerResponse(response) {
            _assert(response.idToken, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            _assert(typeof response.idToken !== 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            _assert(typeof response.refreshToken !== 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            const expiresIn = 'expiresIn' in response && typeof response.expiresIn !== 'undefined'
                ? Number(response.expiresIn)
                : _tokenExpiresIn(response.idToken);
            this.updateTokensAndExpiration(response.idToken, response.refreshToken, expiresIn);
        }
        updateFromIdToken(idToken) {
            _assert(idToken.length !== 0, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            const expiresIn = _tokenExpiresIn(idToken);
            this.updateTokensAndExpiration(idToken, null, expiresIn);
        }
        async getToken(auth, forceRefresh = false) {
            if (!forceRefresh && this.accessToken && !this.isExpired) {
                return this.accessToken;
            }
            _assert(this.refreshToken, auth, "user-token-expired" /* AuthErrorCode.TOKEN_EXPIRED */);
            if (this.refreshToken) {
                await this.refresh(auth, this.refreshToken);
                return this.accessToken;
            }
            return null;
        }
        clearRefreshToken() {
            this.refreshToken = null;
        }
        async refresh(auth, oldToken) {
            const { accessToken, refreshToken, expiresIn } = await requestStsToken(auth, oldToken);
            this.updateTokensAndExpiration(accessToken, refreshToken, Number(expiresIn));
        }
        updateTokensAndExpiration(accessToken, refreshToken, expiresInSec) {
            this.refreshToken = refreshToken || null;
            this.accessToken = accessToken || null;
            this.expirationTime = Date.now() + expiresInSec * 1000;
        }
        static fromJSON(appName, object) {
            const { refreshToken, accessToken, expirationTime } = object;
            const manager = new StsTokenManager();
            if (refreshToken) {
                _assert(typeof refreshToken === 'string', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */, {
                    appName
                });
                manager.refreshToken = refreshToken;
            }
            if (accessToken) {
                _assert(typeof accessToken === 'string', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */, {
                    appName
                });
                manager.accessToken = accessToken;
            }
            if (expirationTime) {
                _assert(typeof expirationTime === 'number', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */, {
                    appName
                });
                manager.expirationTime = expirationTime;
            }
            return manager;
        }
        toJSON() {
            return {
                refreshToken: this.refreshToken,
                accessToken: this.accessToken,
                expirationTime: this.expirationTime
            };
        }
        _assign(stsTokenManager) {
            this.accessToken = stsTokenManager.accessToken;
            this.refreshToken = stsTokenManager.refreshToken;
            this.expirationTime = stsTokenManager.expirationTime;
        }
        _clone() {
            return Object.assign(new StsTokenManager(), this.toJSON());
        }
        _performRefresh() {
            return debugFail('not implemented');
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function assertStringOrUndefined(assertion, appName) {
        _assert(typeof assertion === 'string' || typeof assertion === 'undefined', "internal-error" /* AuthErrorCode.INTERNAL_ERROR */, { appName });
    }
    class UserImpl {
        constructor(_a) {
            var { uid, auth, stsTokenManager } = _a, opt = __rest(_a, ["uid", "auth", "stsTokenManager"]);
            // For the user object, provider is always Firebase.
            this.providerId = "firebase" /* ProviderId.FIREBASE */;
            this.proactiveRefresh = new ProactiveRefresh(this);
            this.reloadUserInfo = null;
            this.reloadListener = null;
            this.uid = uid;
            this.auth = auth;
            this.stsTokenManager = stsTokenManager;
            this.accessToken = stsTokenManager.accessToken;
            this.displayName = opt.displayName || null;
            this.email = opt.email || null;
            this.emailVerified = opt.emailVerified || false;
            this.phoneNumber = opt.phoneNumber || null;
            this.photoURL = opt.photoURL || null;
            this.isAnonymous = opt.isAnonymous || false;
            this.tenantId = opt.tenantId || null;
            this.providerData = opt.providerData ? [...opt.providerData] : [];
            this.metadata = new UserMetadata(opt.createdAt || undefined, opt.lastLoginAt || undefined);
        }
        async getIdToken(forceRefresh) {
            const accessToken = await _logoutIfInvalidated(this, this.stsTokenManager.getToken(this.auth, forceRefresh));
            _assert(accessToken, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            if (this.accessToken !== accessToken) {
                this.accessToken = accessToken;
                await this.auth._persistUserIfCurrent(this);
                this.auth._notifyListenersIfCurrent(this);
            }
            return accessToken;
        }
        getIdTokenResult(forceRefresh) {
            return getIdTokenResult(this, forceRefresh);
        }
        reload() {
            return reload(this);
        }
        _assign(user) {
            if (this === user) {
                return;
            }
            _assert(this.uid === user.uid, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            this.displayName = user.displayName;
            this.photoURL = user.photoURL;
            this.email = user.email;
            this.emailVerified = user.emailVerified;
            this.phoneNumber = user.phoneNumber;
            this.isAnonymous = user.isAnonymous;
            this.tenantId = user.tenantId;
            this.providerData = user.providerData.map(userInfo => (Object.assign({}, userInfo)));
            this.metadata._copy(user.metadata);
            this.stsTokenManager._assign(user.stsTokenManager);
        }
        _clone(auth) {
            const newUser = new UserImpl(Object.assign(Object.assign({}, this), { auth, stsTokenManager: this.stsTokenManager._clone() }));
            newUser.metadata._copy(this.metadata);
            return newUser;
        }
        _onReload(callback) {
            // There should only ever be one listener, and that is a single instance of MultiFactorUser
            _assert(!this.reloadListener, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            this.reloadListener = callback;
            if (this.reloadUserInfo) {
                this._notifyReloadListener(this.reloadUserInfo);
                this.reloadUserInfo = null;
            }
        }
        _notifyReloadListener(userInfo) {
            if (this.reloadListener) {
                this.reloadListener(userInfo);
            }
            else {
                // If no listener is subscribed yet, save the result so it's available when they do subscribe
                this.reloadUserInfo = userInfo;
            }
        }
        _startProactiveRefresh() {
            this.proactiveRefresh._start();
        }
        _stopProactiveRefresh() {
            this.proactiveRefresh._stop();
        }
        async _updateTokensIfNecessary(response, reload = false) {
            let tokensRefreshed = false;
            if (response.idToken &&
                response.idToken !== this.stsTokenManager.accessToken) {
                this.stsTokenManager.updateFromServerResponse(response);
                tokensRefreshed = true;
            }
            if (reload) {
                await _reloadWithoutSaving(this);
            }
            await this.auth._persistUserIfCurrent(this);
            if (tokensRefreshed) {
                this.auth._notifyListenersIfCurrent(this);
            }
        }
        async delete() {
            if (_isFirebaseServerApp(this.auth.app)) {
                return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this.auth));
            }
            const idToken = await this.getIdToken();
            await _logoutIfInvalidated(this, deleteAccount(this.auth, { idToken }));
            this.stsTokenManager.clearRefreshToken();
            // TODO: Determine if cancellable-promises are necessary to use in this class so that delete()
            //       cancels pending actions...
            return this.auth.signOut();
        }
        toJSON() {
            return Object.assign(Object.assign({ uid: this.uid, email: this.email || undefined, emailVerified: this.emailVerified, displayName: this.displayName || undefined, isAnonymous: this.isAnonymous, photoURL: this.photoURL || undefined, phoneNumber: this.phoneNumber || undefined, tenantId: this.tenantId || undefined, providerData: this.providerData.map(userInfo => (Object.assign({}, userInfo))), stsTokenManager: this.stsTokenManager.toJSON(), 
                // Redirect event ID must be maintained in case there is a pending
                // redirect event.
                _redirectEventId: this._redirectEventId }, this.metadata.toJSON()), { 
                // Required for compatibility with the legacy SDK (go/firebase-auth-sdk-persistence-parsing):
                apiKey: this.auth.config.apiKey, appName: this.auth.name });
        }
        get refreshToken() {
            return this.stsTokenManager.refreshToken || '';
        }
        static _fromJSON(auth, object) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const displayName = (_a = object.displayName) !== null && _a !== void 0 ? _a : undefined;
            const email = (_b = object.email) !== null && _b !== void 0 ? _b : undefined;
            const phoneNumber = (_c = object.phoneNumber) !== null && _c !== void 0 ? _c : undefined;
            const photoURL = (_d = object.photoURL) !== null && _d !== void 0 ? _d : undefined;
            const tenantId = (_e = object.tenantId) !== null && _e !== void 0 ? _e : undefined;
            const _redirectEventId = (_f = object._redirectEventId) !== null && _f !== void 0 ? _f : undefined;
            const createdAt = (_g = object.createdAt) !== null && _g !== void 0 ? _g : undefined;
            const lastLoginAt = (_h = object.lastLoginAt) !== null && _h !== void 0 ? _h : undefined;
            const { uid, emailVerified, isAnonymous, providerData, stsTokenManager: plainObjectTokenManager } = object;
            _assert(uid && plainObjectTokenManager, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            const stsTokenManager = StsTokenManager.fromJSON(this.name, plainObjectTokenManager);
            _assert(typeof uid === 'string', auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            assertStringOrUndefined(displayName, auth.name);
            assertStringOrUndefined(email, auth.name);
            _assert(typeof emailVerified === 'boolean', auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            _assert(typeof isAnonymous === 'boolean', auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            assertStringOrUndefined(phoneNumber, auth.name);
            assertStringOrUndefined(photoURL, auth.name);
            assertStringOrUndefined(tenantId, auth.name);
            assertStringOrUndefined(_redirectEventId, auth.name);
            assertStringOrUndefined(createdAt, auth.name);
            assertStringOrUndefined(lastLoginAt, auth.name);
            const user = new UserImpl({
                uid,
                auth,
                email,
                emailVerified,
                displayName,
                isAnonymous,
                photoURL,
                phoneNumber,
                tenantId,
                stsTokenManager,
                createdAt,
                lastLoginAt
            });
            if (providerData && Array.isArray(providerData)) {
                user.providerData = providerData.map(userInfo => (Object.assign({}, userInfo)));
            }
            if (_redirectEventId) {
                user._redirectEventId = _redirectEventId;
            }
            return user;
        }
        /**
         * Initialize a User from an idToken server response
         * @param auth
         * @param idTokenResponse
         */
        static async _fromIdTokenResponse(auth, idTokenResponse, isAnonymous = false) {
            const stsTokenManager = new StsTokenManager();
            stsTokenManager.updateFromServerResponse(idTokenResponse);
            // Initialize the Firebase Auth user.
            const user = new UserImpl({
                uid: idTokenResponse.localId,
                auth,
                stsTokenManager,
                isAnonymous
            });
            // Updates the user info and data and resolves with a user instance.
            await _reloadWithoutSaving(user);
            return user;
        }
        /**
         * Initialize a User from an idToken server response
         * @param auth
         * @param idTokenResponse
         */
        static async _fromGetAccountInfoResponse(auth, response, idToken) {
            const coreAccount = response.users[0];
            _assert(coreAccount.localId !== undefined, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            const providerData = coreAccount.providerUserInfo !== undefined
                ? extractProviderData(coreAccount.providerUserInfo)
                : [];
            const isAnonymous = !(coreAccount.email && coreAccount.passwordHash) && !(providerData === null || providerData === void 0 ? void 0 : providerData.length);
            const stsTokenManager = new StsTokenManager();
            stsTokenManager.updateFromIdToken(idToken);
            // Initialize the Firebase Auth user.
            const user = new UserImpl({
                uid: coreAccount.localId,
                auth,
                stsTokenManager,
                isAnonymous
            });
            // update the user with data from the GetAccountInfo response.
            const updates = {
                uid: coreAccount.localId,
                displayName: coreAccount.displayName || null,
                photoURL: coreAccount.photoUrl || null,
                email: coreAccount.email || null,
                emailVerified: coreAccount.emailVerified || false,
                phoneNumber: coreAccount.phoneNumber || null,
                tenantId: coreAccount.tenantId || null,
                providerData,
                metadata: new UserMetadata(coreAccount.createdAt, coreAccount.lastLoginAt),
                isAnonymous: !(coreAccount.email && coreAccount.passwordHash) &&
                    !(providerData === null || providerData === void 0 ? void 0 : providerData.length)
            };
            Object.assign(user, updates);
            return user;
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const instanceCache = new Map();
    function _getInstance(cls) {
        debugAssert(cls instanceof Function, 'Expected a class definition');
        let instance = instanceCache.get(cls);
        if (instance) {
            debugAssert(instance instanceof cls, 'Instance stored in cache mismatched with class');
            return instance;
        }
        instance = new cls();
        instanceCache.set(cls, instance);
        return instance;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class InMemoryPersistence {
        constructor() {
            this.type = "NONE" /* PersistenceType.NONE */;
            this.storage = {};
        }
        async _isAvailable() {
            return true;
        }
        async _set(key, value) {
            this.storage[key] = value;
        }
        async _get(key) {
            const value = this.storage[key];
            return value === undefined ? null : value;
        }
        async _remove(key) {
            delete this.storage[key];
        }
        _addListener(_key, _listener) {
            // Listeners are not supported for in-memory storage since it cannot be shared across windows/workers
            return;
        }
        _removeListener(_key, _listener) {
            // Listeners are not supported for in-memory storage since it cannot be shared across windows/workers
            return;
        }
    }
    InMemoryPersistence.type = 'NONE';
    /**
     * An implementation of {@link Persistence} of type 'NONE'.
     *
     * @public
     */
    const inMemoryPersistence = InMemoryPersistence;

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function _persistenceKeyName(key, apiKey, appName) {
        return `${"firebase" /* Namespace.PERSISTENCE */}:${key}:${apiKey}:${appName}`;
    }
    class PersistenceUserManager {
        constructor(persistence, auth, userKey) {
            this.persistence = persistence;
            this.auth = auth;
            this.userKey = userKey;
            const { config, name } = this.auth;
            this.fullUserKey = _persistenceKeyName(this.userKey, config.apiKey, name);
            this.fullPersistenceKey = _persistenceKeyName("persistence" /* KeyName.PERSISTENCE_USER */, config.apiKey, name);
            this.boundEventHandler = auth._onStorageEvent.bind(auth);
            this.persistence._addListener(this.fullUserKey, this.boundEventHandler);
        }
        setCurrentUser(user) {
            return this.persistence._set(this.fullUserKey, user.toJSON());
        }
        async getCurrentUser() {
            const blob = await this.persistence._get(this.fullUserKey);
            if (!blob) {
                return null;
            }
            if (typeof blob === 'string') {
                const response = await getAccountInfo(this.auth, { idToken: blob }).catch(() => undefined);
                if (!response) {
                    return null;
                }
                return UserImpl._fromGetAccountInfoResponse(this.auth, response, blob);
            }
            return UserImpl._fromJSON(this.auth, blob);
        }
        removeCurrentUser() {
            return this.persistence._remove(this.fullUserKey);
        }
        savePersistenceForRedirect() {
            return this.persistence._set(this.fullPersistenceKey, this.persistence.type);
        }
        async setPersistence(newPersistence) {
            if (this.persistence === newPersistence) {
                return;
            }
            const currentUser = await this.getCurrentUser();
            await this.removeCurrentUser();
            this.persistence = newPersistence;
            if (currentUser) {
                return this.setCurrentUser(currentUser);
            }
        }
        delete() {
            this.persistence._removeListener(this.fullUserKey, this.boundEventHandler);
        }
        static async create(auth, persistenceHierarchy, userKey = "authUser" /* KeyName.AUTH_USER */) {
            if (!persistenceHierarchy.length) {
                return new PersistenceUserManager(_getInstance(inMemoryPersistence), auth, userKey);
            }
            // Eliminate any persistences that are not available
            const availablePersistences = (await Promise.all(persistenceHierarchy.map(async (persistence) => {
                if (await persistence._isAvailable()) {
                    return persistence;
                }
                return undefined;
            }))).filter(persistence => persistence);
            // Fall back to the first persistence listed, or in memory if none available
            let selectedPersistence = availablePersistences[0] ||
                _getInstance(inMemoryPersistence);
            const key = _persistenceKeyName(userKey, auth.config.apiKey, auth.name);
            // Pull out the existing user, setting the chosen persistence to that
            // persistence if the user exists.
            let userToMigrate = null;
            // Note, here we check for a user in _all_ persistences, not just the
            // ones deemed available. If we can migrate a user out of a broken
            // persistence, we will (but only if that persistence supports migration).
            for (const persistence of persistenceHierarchy) {
                try {
                    const blob = await persistence._get(key);
                    if (blob) {
                        let user;
                        if (typeof blob === 'string') {
                            const response = await getAccountInfo(auth, {
                                idToken: blob
                            }).catch(() => undefined);
                            if (!response) {
                                break;
                            }
                            user = await UserImpl._fromGetAccountInfoResponse(auth, response, blob);
                        }
                        else {
                            user = UserImpl._fromJSON(auth, blob); // throws for unparsable blob (wrong format)
                        }
                        if (persistence !== selectedPersistence) {
                            userToMigrate = user;
                        }
                        selectedPersistence = persistence;
                        break;
                    }
                }
                catch (_a) { }
            }
            // If we find the user in a persistence that does support migration, use
            // that migration path (of only persistences that support migration)
            const migrationHierarchy = availablePersistences.filter(p => p._shouldAllowMigration);
            // If the persistence does _not_ allow migration, just finish off here
            if (!selectedPersistence._shouldAllowMigration ||
                !migrationHierarchy.length) {
                return new PersistenceUserManager(selectedPersistence, auth, userKey);
            }
            selectedPersistence = migrationHierarchy[0];
            if (userToMigrate) {
                // This normally shouldn't throw since chosenPersistence.isAvailable() is true, but if it does
                // we'll just let it bubble to surface the error.
                await selectedPersistence._set(key, userToMigrate.toJSON());
            }
            // Attempt to clear the key in other persistences but ignore errors. This helps prevent issues
            // such as users getting stuck with a previous account after signing out and refreshing the tab.
            await Promise.all(persistenceHierarchy.map(async (persistence) => {
                if (persistence !== selectedPersistence) {
                    try {
                        await persistence._remove(key);
                    }
                    catch (_a) { }
                }
            }));
            return new PersistenceUserManager(selectedPersistence, auth, userKey);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Determine the browser for the purposes of reporting usage to the API
     */
    function _getBrowserName(userAgent) {
        const ua = userAgent.toLowerCase();
        if (ua.includes('opera/') || ua.includes('opr/') || ua.includes('opios/')) {
            return "Opera" /* BrowserName.OPERA */;
        }
        else if (_isIEMobile(ua)) {
            // Windows phone IEMobile browser.
            return "IEMobile" /* BrowserName.IEMOBILE */;
        }
        else if (ua.includes('msie') || ua.includes('trident/')) {
            return "IE" /* BrowserName.IE */;
        }
        else if (ua.includes('edge/')) {
            return "Edge" /* BrowserName.EDGE */;
        }
        else if (_isFirefox(ua)) {
            return "Firefox" /* BrowserName.FIREFOX */;
        }
        else if (ua.includes('silk/')) {
            return "Silk" /* BrowserName.SILK */;
        }
        else if (_isBlackBerry(ua)) {
            // Blackberry browser.
            return "Blackberry" /* BrowserName.BLACKBERRY */;
        }
        else if (_isWebOS(ua)) {
            // WebOS default browser.
            return "Webos" /* BrowserName.WEBOS */;
        }
        else if (_isSafari(ua)) {
            return "Safari" /* BrowserName.SAFARI */;
        }
        else if ((ua.includes('chrome/') || _isChromeIOS(ua)) &&
            !ua.includes('edge/')) {
            return "Chrome" /* BrowserName.CHROME */;
        }
        else if (_isAndroid(ua)) {
            // Android stock browser.
            return "Android" /* BrowserName.ANDROID */;
        }
        else {
            // Most modern browsers have name/version at end of user agent string.
            const re = /([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/;
            const matches = userAgent.match(re);
            if ((matches === null || matches === void 0 ? void 0 : matches.length) === 2) {
                return matches[1];
            }
        }
        return "Other" /* BrowserName.OTHER */;
    }
    function _isFirefox(ua = getUA()) {
        return /firefox\//i.test(ua);
    }
    function _isSafari(userAgent = getUA()) {
        const ua = userAgent.toLowerCase();
        return (ua.includes('safari/') &&
            !ua.includes('chrome/') &&
            !ua.includes('crios/') &&
            !ua.includes('android'));
    }
    function _isChromeIOS(ua = getUA()) {
        return /crios\//i.test(ua);
    }
    function _isIEMobile(ua = getUA()) {
        return /iemobile/i.test(ua);
    }
    function _isAndroid(ua = getUA()) {
        return /android/i.test(ua);
    }
    function _isBlackBerry(ua = getUA()) {
        return /blackberry/i.test(ua);
    }
    function _isWebOS(ua = getUA()) {
        return /webos/i.test(ua);
    }
    function _isIOS(ua = getUA()) {
        return (/iphone|ipad|ipod/i.test(ua) ||
            (/macintosh/i.test(ua) && /mobile/i.test(ua)));
    }
    function _isIOSStandalone(ua = getUA()) {
        var _a;
        return _isIOS(ua) && !!((_a = window.navigator) === null || _a === void 0 ? void 0 : _a.standalone);
    }
    function _isIE10() {
        return isIE() && document.documentMode === 10;
    }
    function _isMobileBrowser(ua = getUA()) {
        // TODO: implement getBrowserName equivalent for OS.
        return (_isIOS(ua) ||
            _isAndroid(ua) ||
            _isWebOS(ua) ||
            _isBlackBerry(ua) ||
            /windows phone/i.test(ua) ||
            _isIEMobile(ua));
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /*
     * Determine the SDK version string
     */
    function _getClientVersion(clientPlatform, frameworks = []) {
        let reportedPlatform;
        switch (clientPlatform) {
            case "Browser" /* ClientPlatform.BROWSER */:
                // In a browser environment, report the browser name.
                reportedPlatform = _getBrowserName(getUA());
                break;
            case "Worker" /* ClientPlatform.WORKER */:
                // Technically a worker runs from a browser but we need to differentiate a
                // worker from a browser.
                // For example: Chrome-Worker/JsCore/4.9.1/FirebaseCore-web.
                reportedPlatform = `${_getBrowserName(getUA())}-${clientPlatform}`;
                break;
            default:
                reportedPlatform = clientPlatform;
        }
        const reportedFrameworks = frameworks.length
            ? frameworks.join(',')
            : 'FirebaseCore-web'; /* default value if no other framework is used */
        return `${reportedPlatform}/${"JsCore" /* ClientImplementation.CORE */}/${SDK_VERSION}/${reportedFrameworks}`;
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class AuthMiddlewareQueue {
        constructor(auth) {
            this.auth = auth;
            this.queue = [];
        }
        pushCallback(callback, onAbort) {
            // The callback could be sync or async. Wrap it into a
            // function that is always async.
            const wrappedCallback = (user) => new Promise((resolve, reject) => {
                try {
                    const result = callback(user);
                    // Either resolve with existing promise or wrap a non-promise
                    // return value into a promise.
                    resolve(result);
                }
                catch (e) {
                    // Sync callback throws.
                    reject(e);
                }
            });
            // Attach the onAbort if present
            wrappedCallback.onAbort = onAbort;
            this.queue.push(wrappedCallback);
            const index = this.queue.length - 1;
            return () => {
                // Unsubscribe. Replace with no-op. Do not remove from array, or it will disturb
                // indexing of other elements.
                this.queue[index] = () => Promise.resolve();
            };
        }
        async runMiddleware(nextUser) {
            if (this.auth.currentUser === nextUser) {
                return;
            }
            // While running the middleware, build a temporary stack of onAbort
            // callbacks to call if one middleware callback rejects.
            const onAbortStack = [];
            try {
                for (const beforeStateCallback of this.queue) {
                    await beforeStateCallback(nextUser);
                    // Only push the onAbort if the callback succeeds
                    if (beforeStateCallback.onAbort) {
                        onAbortStack.push(beforeStateCallback.onAbort);
                    }
                }
            }
            catch (e) {
                // Run all onAbort, with separate try/catch to ignore any errors and
                // continue
                onAbortStack.reverse();
                for (const onAbort of onAbortStack) {
                    try {
                        onAbort();
                    }
                    catch (_) {
                        /* swallow error */
                    }
                }
                throw this.auth._errorFactory.create("login-blocked" /* AuthErrorCode.LOGIN_BLOCKED */, {
                    originalMessage: e === null || e === void 0 ? void 0 : e.message
                });
            }
        }
    }

    /**
     * @license
     * Copyright 2023 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Fetches the password policy for the currently set tenant or the project if no tenant is set.
     *
     * @param auth Auth object.
     * @param request Password policy request.
     * @returns Password policy response.
     */
    async function _getPasswordPolicy(auth, request = {}) {
        return _performApiRequest(auth, "GET" /* HttpMethod.GET */, "/v2/passwordPolicy" /* Endpoint.GET_PASSWORD_POLICY */, _addTidIfNecessary(auth, request));
    }

    /**
     * @license
     * Copyright 2023 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // Minimum min password length enforced by the backend, even if no minimum length is set.
    const MINIMUM_MIN_PASSWORD_LENGTH = 6;
    /**
     * Stores password policy requirements and provides password validation against the policy.
     *
     * @internal
     */
    class PasswordPolicyImpl {
        constructor(response) {
            var _a, _b, _c, _d;
            // Only include custom strength options defined in the response.
            const responseOptions = response.customStrengthOptions;
            this.customStrengthOptions = {};
            // TODO: Remove once the backend is updated to include the minimum min password length instead of undefined when there is no minimum length set.
            this.customStrengthOptions.minPasswordLength =
                (_a = responseOptions.minPasswordLength) !== null && _a !== void 0 ? _a : MINIMUM_MIN_PASSWORD_LENGTH;
            if (responseOptions.maxPasswordLength) {
                this.customStrengthOptions.maxPasswordLength =
                    responseOptions.maxPasswordLength;
            }
            if (responseOptions.containsLowercaseCharacter !== undefined) {
                this.customStrengthOptions.containsLowercaseLetter =
                    responseOptions.containsLowercaseCharacter;
            }
            if (responseOptions.containsUppercaseCharacter !== undefined) {
                this.customStrengthOptions.containsUppercaseLetter =
                    responseOptions.containsUppercaseCharacter;
            }
            if (responseOptions.containsNumericCharacter !== undefined) {
                this.customStrengthOptions.containsNumericCharacter =
                    responseOptions.containsNumericCharacter;
            }
            if (responseOptions.containsNonAlphanumericCharacter !== undefined) {
                this.customStrengthOptions.containsNonAlphanumericCharacter =
                    responseOptions.containsNonAlphanumericCharacter;
            }
            this.enforcementState = response.enforcementState;
            if (this.enforcementState === 'ENFORCEMENT_STATE_UNSPECIFIED') {
                this.enforcementState = 'OFF';
            }
            // Use an empty string if no non-alphanumeric characters are specified in the response.
            this.allowedNonAlphanumericCharacters =
                (_c = (_b = response.allowedNonAlphanumericCharacters) === null || _b === void 0 ? void 0 : _b.join('')) !== null && _c !== void 0 ? _c : '';
            this.forceUpgradeOnSignin = (_d = response.forceUpgradeOnSignin) !== null && _d !== void 0 ? _d : false;
            this.schemaVersion = response.schemaVersion;
        }
        validatePassword(password) {
            var _a, _b, _c, _d, _e, _f;
            const status = {
                isValid: true,
                passwordPolicy: this
            };
            // Check the password length and character options.
            this.validatePasswordLengthOptions(password, status);
            this.validatePasswordCharacterOptions(password, status);
            // Combine the status into single isValid property.
            status.isValid && (status.isValid = (_a = status.meetsMinPasswordLength) !== null && _a !== void 0 ? _a : true);
            status.isValid && (status.isValid = (_b = status.meetsMaxPasswordLength) !== null && _b !== void 0 ? _b : true);
            status.isValid && (status.isValid = (_c = status.containsLowercaseLetter) !== null && _c !== void 0 ? _c : true);
            status.isValid && (status.isValid = (_d = status.containsUppercaseLetter) !== null && _d !== void 0 ? _d : true);
            status.isValid && (status.isValid = (_e = status.containsNumericCharacter) !== null && _e !== void 0 ? _e : true);
            status.isValid && (status.isValid = (_f = status.containsNonAlphanumericCharacter) !== null && _f !== void 0 ? _f : true);
            return status;
        }
        /**
         * Validates that the password meets the length options for the policy.
         *
         * @param password Password to validate.
         * @param status Validation status.
         */
        validatePasswordLengthOptions(password, status) {
            const minPasswordLength = this.customStrengthOptions.minPasswordLength;
            const maxPasswordLength = this.customStrengthOptions.maxPasswordLength;
            if (minPasswordLength) {
                status.meetsMinPasswordLength = password.length >= minPasswordLength;
            }
            if (maxPasswordLength) {
                status.meetsMaxPasswordLength = password.length <= maxPasswordLength;
            }
        }
        /**
         * Validates that the password meets the character options for the policy.
         *
         * @param password Password to validate.
         * @param status Validation status.
         */
        validatePasswordCharacterOptions(password, status) {
            // Assign statuses for requirements even if the password is an empty string.
            this.updatePasswordCharacterOptionsStatuses(status, 
            /* containsLowercaseCharacter= */ false, 
            /* containsUppercaseCharacter= */ false, 
            /* containsNumericCharacter= */ false, 
            /* containsNonAlphanumericCharacter= */ false);
            let passwordChar;
            for (let i = 0; i < password.length; i++) {
                passwordChar = password.charAt(i);
                this.updatePasswordCharacterOptionsStatuses(status, 
                /* containsLowercaseCharacter= */ passwordChar >= 'a' &&
                    passwordChar <= 'z', 
                /* containsUppercaseCharacter= */ passwordChar >= 'A' &&
                    passwordChar <= 'Z', 
                /* containsNumericCharacter= */ passwordChar >= '0' &&
                    passwordChar <= '9', 
                /* containsNonAlphanumericCharacter= */ this.allowedNonAlphanumericCharacters.includes(passwordChar));
            }
        }
        /**
         * Updates the running validation status with the statuses for the character options.
         * Expected to be called each time a character is processed to update each option status
         * based on the current character.
         *
         * @param status Validation status.
         * @param containsLowercaseCharacter Whether the character is a lowercase letter.
         * @param containsUppercaseCharacter Whether the character is an uppercase letter.
         * @param containsNumericCharacter Whether the character is a numeric character.
         * @param containsNonAlphanumericCharacter Whether the character is a non-alphanumeric character.
         */
        updatePasswordCharacterOptionsStatuses(status, containsLowercaseCharacter, containsUppercaseCharacter, containsNumericCharacter, containsNonAlphanumericCharacter) {
            if (this.customStrengthOptions.containsLowercaseLetter) {
                status.containsLowercaseLetter || (status.containsLowercaseLetter = containsLowercaseCharacter);
            }
            if (this.customStrengthOptions.containsUppercaseLetter) {
                status.containsUppercaseLetter || (status.containsUppercaseLetter = containsUppercaseCharacter);
            }
            if (this.customStrengthOptions.containsNumericCharacter) {
                status.containsNumericCharacter || (status.containsNumericCharacter = containsNumericCharacter);
            }
            if (this.customStrengthOptions.containsNonAlphanumericCharacter) {
                status.containsNonAlphanumericCharacter || (status.containsNonAlphanumericCharacter = containsNonAlphanumericCharacter);
            }
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class AuthImpl {
        constructor(app, heartbeatServiceProvider, appCheckServiceProvider, config) {
            this.app = app;
            this.heartbeatServiceProvider = heartbeatServiceProvider;
            this.appCheckServiceProvider = appCheckServiceProvider;
            this.config = config;
            this.currentUser = null;
            this.emulatorConfig = null;
            this.operations = Promise.resolve();
            this.authStateSubscription = new Subscription(this);
            this.idTokenSubscription = new Subscription(this);
            this.beforeStateQueue = new AuthMiddlewareQueue(this);
            this.redirectUser = null;
            this.isProactiveRefreshEnabled = false;
            this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION = 1;
            // Any network calls will set this to true and prevent subsequent emulator
            // initialization
            this._canInitEmulator = true;
            this._isInitialized = false;
            this._deleted = false;
            this._initializationPromise = null;
            this._popupRedirectResolver = null;
            this._errorFactory = _DEFAULT_AUTH_ERROR_FACTORY;
            this._agentRecaptchaConfig = null;
            this._tenantRecaptchaConfigs = {};
            this._projectPasswordPolicy = null;
            this._tenantPasswordPolicies = {};
            this._resolvePersistenceManagerAvailable = undefined;
            // Tracks the last notified UID for state change listeners to prevent
            // repeated calls to the callbacks. Undefined means it's never been
            // called, whereas null means it's been called with a signed out user
            this.lastNotifiedUid = undefined;
            this.languageCode = null;
            this.tenantId = null;
            this.settings = { appVerificationDisabledForTesting: false };
            this.frameworks = [];
            this.name = app.name;
            this.clientVersion = config.sdkClientVersion;
            // TODO(jamesdaniels) explore less hacky way to do this, cookie authentication needs
            // persistenceMananger to be available. see _getFinalTarget for more context
            this._persistenceManagerAvailable = new Promise(resolve => (this._resolvePersistenceManagerAvailable = resolve));
        }
        _initializeWithPersistence(persistenceHierarchy, popupRedirectResolver) {
            if (popupRedirectResolver) {
                this._popupRedirectResolver = _getInstance(popupRedirectResolver);
            }
            // Have to check for app deletion throughout initialization (after each
            // promise resolution)
            this._initializationPromise = this.queue(async () => {
                var _a, _b, _c;
                if (this._deleted) {
                    return;
                }
                this.persistenceManager = await PersistenceUserManager.create(this, persistenceHierarchy);
                (_a = this._resolvePersistenceManagerAvailable) === null || _a === void 0 ? void 0 : _a.call(this);
                if (this._deleted) {
                    return;
                }
                // Initialize the resolver early if necessary (only applicable to web:
                // this will cause the iframe to load immediately in certain cases)
                if ((_b = this._popupRedirectResolver) === null || _b === void 0 ? void 0 : _b._shouldInitProactively) {
                    // If this fails, don't halt auth loading
                    try {
                        await this._popupRedirectResolver._initialize(this);
                    }
                    catch (e) {
                        /* Ignore the error */
                    }
                }
                await this.initializeCurrentUser(popupRedirectResolver);
                this.lastNotifiedUid = ((_c = this.currentUser) === null || _c === void 0 ? void 0 : _c.uid) || null;
                if (this._deleted) {
                    return;
                }
                this._isInitialized = true;
            });
            return this._initializationPromise;
        }
        /**
         * If the persistence is changed in another window, the user manager will let us know
         */
        async _onStorageEvent() {
            if (this._deleted) {
                return;
            }
            const user = await this.assertedPersistence.getCurrentUser();
            if (!this.currentUser && !user) {
                // No change, do nothing (was signed out and remained signed out).
                return;
            }
            // If the same user is to be synchronized.
            if (this.currentUser && user && this.currentUser.uid === user.uid) {
                // Data update, simply copy data changes.
                this._currentUser._assign(user);
                // If tokens changed from previous user tokens, this will trigger
                // notifyAuthListeners_.
                await this.currentUser.getIdToken();
                return;
            }
            // Update current Auth state. Either a new login or logout.
            // Skip blocking callbacks, they should not apply to a change in another tab.
            await this._updateCurrentUser(user, /* skipBeforeStateCallbacks */ true);
        }
        async initializeCurrentUserFromIdToken(idToken) {
            try {
                const response = await getAccountInfo(this, { idToken });
                const user = await UserImpl._fromGetAccountInfoResponse(this, response, idToken);
                await this.directlySetCurrentUser(user);
            }
            catch (err) {
                console.warn('FirebaseServerApp could not login user with provided authIdToken: ', err);
                await this.directlySetCurrentUser(null);
            }
        }
        async initializeCurrentUser(popupRedirectResolver) {
            var _a;
            if (_isFirebaseServerApp(this.app)) {
                const idToken = this.app.settings.authIdToken;
                if (idToken) {
                    // Start the auth operation in the next tick to allow a moment for the customer's app to
                    // attach an emulator, if desired.
                    return new Promise(resolve => {
                        setTimeout(() => this.initializeCurrentUserFromIdToken(idToken).then(resolve, resolve));
                    });
                }
                else {
                    return this.directlySetCurrentUser(null);
                }
            }
            // First check to see if we have a pending redirect event.
            const previouslyStoredUser = (await this.assertedPersistence.getCurrentUser());
            let futureCurrentUser = previouslyStoredUser;
            let needsTocheckMiddleware = false;
            if (popupRedirectResolver && this.config.authDomain) {
                await this.getOrInitRedirectPersistenceManager();
                const redirectUserEventId = (_a = this.redirectUser) === null || _a === void 0 ? void 0 : _a._redirectEventId;
                const storedUserEventId = futureCurrentUser === null || futureCurrentUser === void 0 ? void 0 : futureCurrentUser._redirectEventId;
                const result = await this.tryRedirectSignIn(popupRedirectResolver);
                // If the stored user (i.e. the old "currentUser") has a redirectId that
                // matches the redirect user, then we want to initially sign in with the
                // new user object from result.
                // TODO(samgho): More thoroughly test all of this
                if ((!redirectUserEventId || redirectUserEventId === storedUserEventId) &&
                    (result === null || result === void 0 ? void 0 : result.user)) {
                    futureCurrentUser = result.user;
                    needsTocheckMiddleware = true;
                }
            }
            // If no user in persistence, there is no current user. Set to null.
            if (!futureCurrentUser) {
                return this.directlySetCurrentUser(null);
            }
            if (!futureCurrentUser._redirectEventId) {
                // This isn't a redirect link operation, we can reload and bail.
                // First though, ensure that we check the middleware is happy.
                if (needsTocheckMiddleware) {
                    try {
                        await this.beforeStateQueue.runMiddleware(futureCurrentUser);
                    }
                    catch (e) {
                        futureCurrentUser = previouslyStoredUser;
                        // We know this is available since the bit is only set when the
                        // resolver is available
                        this._popupRedirectResolver._overrideRedirectResult(this, () => Promise.reject(e));
                    }
                }
                if (futureCurrentUser) {
                    return this.reloadAndSetCurrentUserOrClear(futureCurrentUser);
                }
                else {
                    return this.directlySetCurrentUser(null);
                }
            }
            _assert(this._popupRedirectResolver, this, "argument-error" /* AuthErrorCode.ARGUMENT_ERROR */);
            await this.getOrInitRedirectPersistenceManager();
            // If the redirect user's event ID matches the current user's event ID,
            // DO NOT reload the current user, otherwise they'll be cleared from storage.
            // This is important for the reauthenticateWithRedirect() flow.
            if (this.redirectUser &&
                this.redirectUser._redirectEventId === futureCurrentUser._redirectEventId) {
                return this.directlySetCurrentUser(futureCurrentUser);
            }
            return this.reloadAndSetCurrentUserOrClear(futureCurrentUser);
        }
        async tryRedirectSignIn(redirectResolver) {
            // The redirect user needs to be checked (and signed in if available)
            // during auth initialization. All of the normal sign in and link/reauth
            // flows call back into auth and push things onto the promise queue. We
            // need to await the result of the redirect sign in *inside the promise
            // queue*. This presents a problem: we run into deadlock. See:
            //    ┌> [Initialization] ─────┐
            //    ┌> [<other queue tasks>] │
            //    └─ [getRedirectResult] <─┘
            //    where [] are tasks on the queue and arrows denote awaits
            // Initialization will never complete because it's waiting on something
            // that's waiting for initialization to complete!
            //
            // Instead, this method calls getRedirectResult() (stored in
            // _completeRedirectFn) with an optional parameter that instructs all of
            // the underlying auth operations to skip anything that mutates auth state.
            let result = null;
            try {
                // We know this._popupRedirectResolver is set since redirectResolver
                // is passed in. The _completeRedirectFn expects the unwrapped extern.
                result = await this._popupRedirectResolver._completeRedirectFn(this, redirectResolver, true);
            }
            catch (e) {
                // Swallow any errors here; the code can retrieve them in
                // getRedirectResult().
                await this._setRedirectUser(null);
            }
            return result;
        }
        async reloadAndSetCurrentUserOrClear(user) {
            try {
                await _reloadWithoutSaving(user);
            }
            catch (e) {
                if ((e === null || e === void 0 ? void 0 : e.code) !==
                    `auth/${"network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */}`) {
                    // Something's wrong with the user's token. Log them out and remove
                    // them from storage
                    return this.directlySetCurrentUser(null);
                }
            }
            return this.directlySetCurrentUser(user);
        }
        useDeviceLanguage() {
            this.languageCode = _getUserLanguage();
        }
        async _delete() {
            this._deleted = true;
        }
        async updateCurrentUser(userExtern) {
            if (_isFirebaseServerApp(this.app)) {
                return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this));
            }
            // The public updateCurrentUser method needs to make a copy of the user,
            // and also check that the project matches
            const user = userExtern
                ? getModularInstance(userExtern)
                : null;
            if (user) {
                _assert(user.auth.config.apiKey === this.config.apiKey, this, "invalid-user-token" /* AuthErrorCode.INVALID_AUTH */);
            }
            return this._updateCurrentUser(user && user._clone(this));
        }
        async _updateCurrentUser(user, skipBeforeStateCallbacks = false) {
            if (this._deleted) {
                return;
            }
            if (user) {
                _assert(this.tenantId === user.tenantId, this, "tenant-id-mismatch" /* AuthErrorCode.TENANT_ID_MISMATCH */);
            }
            if (!skipBeforeStateCallbacks) {
                await this.beforeStateQueue.runMiddleware(user);
            }
            return this.queue(async () => {
                await this.directlySetCurrentUser(user);
                this.notifyAuthListeners();
            });
        }
        async signOut() {
            if (_isFirebaseServerApp(this.app)) {
                return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this));
            }
            // Run first, to block _setRedirectUser() if any callbacks fail.
            await this.beforeStateQueue.runMiddleware(null);
            // Clear the redirect user when signOut is called
            if (this.redirectPersistenceManager || this._popupRedirectResolver) {
                await this._setRedirectUser(null);
            }
            // Prevent callbacks from being called again in _updateCurrentUser, as
            // they were already called in the first line.
            return this._updateCurrentUser(null, /* skipBeforeStateCallbacks */ true);
        }
        setPersistence(persistence) {
            if (_isFirebaseServerApp(this.app)) {
                return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this));
            }
            return this.queue(async () => {
                await this.assertedPersistence.setPersistence(_getInstance(persistence));
            });
        }
        _getRecaptchaConfig() {
            if (this.tenantId == null) {
                return this._agentRecaptchaConfig;
            }
            else {
                return this._tenantRecaptchaConfigs[this.tenantId];
            }
        }
        async validatePassword(password) {
            if (!this._getPasswordPolicyInternal()) {
                await this._updatePasswordPolicy();
            }
            // Password policy will be defined after fetching.
            const passwordPolicy = this._getPasswordPolicyInternal();
            // Check that the policy schema version is supported by the SDK.
            // TODO: Update this logic to use a max supported policy schema version once we have multiple schema versions.
            if (passwordPolicy.schemaVersion !==
                this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION) {
                return Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version" /* AuthErrorCode.UNSUPPORTED_PASSWORD_POLICY_SCHEMA_VERSION */, {}));
            }
            return passwordPolicy.validatePassword(password);
        }
        _getPasswordPolicyInternal() {
            if (this.tenantId === null) {
                return this._projectPasswordPolicy;
            }
            else {
                return this._tenantPasswordPolicies[this.tenantId];
            }
        }
        async _updatePasswordPolicy() {
            const response = await _getPasswordPolicy(this);
            const passwordPolicy = new PasswordPolicyImpl(response);
            if (this.tenantId === null) {
                this._projectPasswordPolicy = passwordPolicy;
            }
            else {
                this._tenantPasswordPolicies[this.tenantId] = passwordPolicy;
            }
        }
        _getPersistenceType() {
            return this.assertedPersistence.persistence.type;
        }
        _getPersistence() {
            return this.assertedPersistence.persistence;
        }
        _updateErrorMap(errorMap) {
            this._errorFactory = new ErrorFactory('auth', 'Firebase', errorMap());
        }
        onAuthStateChanged(nextOrObserver, error, completed) {
            return this.registerStateListener(this.authStateSubscription, nextOrObserver, error, completed);
        }
        beforeAuthStateChanged(callback, onAbort) {
            return this.beforeStateQueue.pushCallback(callback, onAbort);
        }
        onIdTokenChanged(nextOrObserver, error, completed) {
            return this.registerStateListener(this.idTokenSubscription, nextOrObserver, error, completed);
        }
        authStateReady() {
            return new Promise((resolve, reject) => {
                if (this.currentUser) {
                    resolve();
                }
                else {
                    const unsubscribe = this.onAuthStateChanged(() => {
                        unsubscribe();
                        resolve();
                    }, reject);
                }
            });
        }
        /**
         * Revokes the given access token. Currently only supports Apple OAuth access tokens.
         */
        async revokeAccessToken(token) {
            if (this.currentUser) {
                const idToken = await this.currentUser.getIdToken();
                // Generalize this to accept other providers once supported.
                const request = {
                    providerId: 'apple.com',
                    tokenType: "ACCESS_TOKEN" /* TokenType.ACCESS_TOKEN */,
                    token,
                    idToken
                };
                if (this.tenantId != null) {
                    request.tenantId = this.tenantId;
                }
                await revokeToken(this, request);
            }
        }
        toJSON() {
            var _a;
            return {
                apiKey: this.config.apiKey,
                authDomain: this.config.authDomain,
                appName: this.name,
                currentUser: (_a = this._currentUser) === null || _a === void 0 ? void 0 : _a.toJSON()
            };
        }
        async _setRedirectUser(user, popupRedirectResolver) {
            const redirectManager = await this.getOrInitRedirectPersistenceManager(popupRedirectResolver);
            return user === null
                ? redirectManager.removeCurrentUser()
                : redirectManager.setCurrentUser(user);
        }
        async getOrInitRedirectPersistenceManager(popupRedirectResolver) {
            if (!this.redirectPersistenceManager) {
                const resolver = (popupRedirectResolver && _getInstance(popupRedirectResolver)) ||
                    this._popupRedirectResolver;
                _assert(resolver, this, "argument-error" /* AuthErrorCode.ARGUMENT_ERROR */);
                this.redirectPersistenceManager = await PersistenceUserManager.create(this, [_getInstance(resolver._redirectPersistence)], "redirectUser" /* KeyName.REDIRECT_USER */);
                this.redirectUser =
                    await this.redirectPersistenceManager.getCurrentUser();
            }
            return this.redirectPersistenceManager;
        }
        async _redirectUserForId(id) {
            var _a, _b;
            // Make sure we've cleared any pending persistence actions if we're not in
            // the initializer
            if (this._isInitialized) {
                await this.queue(async () => { });
            }
            if (((_a = this._currentUser) === null || _a === void 0 ? void 0 : _a._redirectEventId) === id) {
                return this._currentUser;
            }
            if (((_b = this.redirectUser) === null || _b === void 0 ? void 0 : _b._redirectEventId) === id) {
                return this.redirectUser;
            }
            return null;
        }
        async _persistUserIfCurrent(user) {
            if (user === this.currentUser) {
                return this.queue(async () => this.directlySetCurrentUser(user));
            }
        }
        /** Notifies listeners only if the user is current */
        _notifyListenersIfCurrent(user) {
            if (user === this.currentUser) {
                this.notifyAuthListeners();
            }
        }
        _key() {
            return `${this.config.authDomain}:${this.config.apiKey}:${this.name}`;
        }
        _startProactiveRefresh() {
            this.isProactiveRefreshEnabled = true;
            if (this.currentUser) {
                this._currentUser._startProactiveRefresh();
            }
        }
        _stopProactiveRefresh() {
            this.isProactiveRefreshEnabled = false;
            if (this.currentUser) {
                this._currentUser._stopProactiveRefresh();
            }
        }
        /** Returns the current user cast as the internal type */
        get _currentUser() {
            return this.currentUser;
        }
        notifyAuthListeners() {
            var _a, _b;
            if (!this._isInitialized) {
                return;
            }
            this.idTokenSubscription.next(this.currentUser);
            const currentUid = (_b = (_a = this.currentUser) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null;
            if (this.lastNotifiedUid !== currentUid) {
                this.lastNotifiedUid = currentUid;
                this.authStateSubscription.next(this.currentUser);
            }
        }
        registerStateListener(subscription, nextOrObserver, error, completed) {
            if (this._deleted) {
                return () => { };
            }
            const cb = typeof nextOrObserver === 'function'
                ? nextOrObserver
                : nextOrObserver.next.bind(nextOrObserver);
            let isUnsubscribed = false;
            const promise = this._isInitialized
                ? Promise.resolve()
                : this._initializationPromise;
            _assert(promise, this, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            // The callback needs to be called asynchronously per the spec.
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            promise.then(() => {
                if (isUnsubscribed) {
                    return;
                }
                cb(this.currentUser);
            });
            if (typeof nextOrObserver === 'function') {
                const unsubscribe = subscription.addObserver(nextOrObserver, error, completed);
                return () => {
                    isUnsubscribed = true;
                    unsubscribe();
                };
            }
            else {
                const unsubscribe = subscription.addObserver(nextOrObserver);
                return () => {
                    isUnsubscribed = true;
                    unsubscribe();
                };
            }
        }
        /**
         * Unprotected (from race conditions) method to set the current user. This
         * should only be called from within a queued callback. This is necessary
         * because the queue shouldn't rely on another queued callback.
         */
        async directlySetCurrentUser(user) {
            if (this.currentUser && this.currentUser !== user) {
                this._currentUser._stopProactiveRefresh();
            }
            if (user && this.isProactiveRefreshEnabled) {
                user._startProactiveRefresh();
            }
            this.currentUser = user;
            if (user) {
                await this.assertedPersistence.setCurrentUser(user);
            }
            else {
                await this.assertedPersistence.removeCurrentUser();
            }
        }
        queue(action) {
            // In case something errors, the callback still should be called in order
            // to keep the promise chain alive
            this.operations = this.operations.then(action, action);
            return this.operations;
        }
        get assertedPersistence() {
            _assert(this.persistenceManager, this, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            return this.persistenceManager;
        }
        _logFramework(framework) {
            if (!framework || this.frameworks.includes(framework)) {
                return;
            }
            this.frameworks.push(framework);
            // Sort alphabetically so that "FirebaseCore-web,FirebaseUI-web" and
            // "FirebaseUI-web,FirebaseCore-web" aren't viewed as different.
            this.frameworks.sort();
            this.clientVersion = _getClientVersion(this.config.clientPlatform, this._getFrameworks());
        }
        _getFrameworks() {
            return this.frameworks;
        }
        async _getAdditionalHeaders() {
            var _a;
            // Additional headers on every request
            const headers = {
                ["X-Client-Version" /* HttpHeader.X_CLIENT_VERSION */]: this.clientVersion
            };
            if (this.app.options.appId) {
                headers["X-Firebase-gmpid" /* HttpHeader.X_FIREBASE_GMPID */] = this.app.options.appId;
            }
            // If the heartbeat service exists, add the heartbeat string
            const heartbeatsHeader = await ((_a = this.heartbeatServiceProvider
                .getImmediate({
                optional: true
            })) === null || _a === void 0 ? void 0 : _a.getHeartbeatsHeader());
            if (heartbeatsHeader) {
                headers["X-Firebase-Client" /* HttpHeader.X_FIREBASE_CLIENT */] = heartbeatsHeader;
            }
            // If the App Check service exists, add the App Check token in the headers
            const appCheckToken = await this._getAppCheckToken();
            if (appCheckToken) {
                headers["X-Firebase-AppCheck" /* HttpHeader.X_FIREBASE_APP_CHECK */] = appCheckToken;
            }
            return headers;
        }
        async _getAppCheckToken() {
            var _a;
            if (_isFirebaseServerApp(this.app) && this.app.settings.appCheckToken) {
                return this.app.settings.appCheckToken;
            }
            const appCheckTokenResult = await ((_a = this.appCheckServiceProvider
                .getImmediate({ optional: true })) === null || _a === void 0 ? void 0 : _a.getToken());
            if (appCheckTokenResult === null || appCheckTokenResult === void 0 ? void 0 : appCheckTokenResult.error) {
                // Context: appCheck.getToken() will never throw even if an error happened.
                // In the error case, a dummy token will be returned along with an error field describing
                // the error. In general, we shouldn't care about the error condition and just use
                // the token (actual or dummy) to send requests.
                _logWarn(`Error while retrieving App Check token: ${appCheckTokenResult.error}`);
            }
            return appCheckTokenResult === null || appCheckTokenResult === void 0 ? void 0 : appCheckTokenResult.token;
        }
    }
    /**
     * Method to be used to cast down to our private implementation of Auth.
     * It will also handle unwrapping from the compat type if necessary
     *
     * @param auth Auth object passed in from developer
     */
    function _castAuth(auth) {
        return getModularInstance(auth);
    }
    /** Helper class to wrap subscriber logic */
    class Subscription {
        constructor(auth) {
            this.auth = auth;
            this.observer = null;
            this.addObserver = createSubscribe(observer => (this.observer = observer));
        }
        get next() {
            _assert(this.observer, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            return this.observer.next.bind(this.observer);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    let externalJSProvider = {
        async loadJS() {
            throw new Error('Unable to load external scripts');
        },
        recaptchaV2Script: '',
        recaptchaEnterpriseScript: '',
        gapiScript: ''
    };
    function _setExternalJSProvider(p) {
        externalJSProvider = p;
    }
    function _loadJS(url) {
        return externalJSProvider.loadJS(url);
    }
    function _recaptchaEnterpriseScriptUrl() {
        return externalJSProvider.recaptchaEnterpriseScript;
    }
    function _gapiScriptUrl() {
        return externalJSProvider.gapiScript;
    }
    function _generateCallbackName(prefix) {
        return `__${prefix}${Math.floor(Math.random() * 1000000)}`;
    }
    class MockGreCAPTCHATopLevel {
        constructor() {
            this.enterprise = new MockGreCAPTCHA();
        }
        ready(callback) {
            callback();
        }
        execute(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _siteKey, _options) {
            return Promise.resolve('token');
        }
        render(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _container, _parameters) {
            return '';
        }
    }
    class MockGreCAPTCHA {
        ready(callback) {
            callback();
        }
        execute(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _siteKey, _options) {
            return Promise.resolve('token');
        }
        render(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _container, _parameters) {
            return '';
        }
    }

    /* eslint-disable @typescript-eslint/no-require-imports */
    const RECAPTCHA_ENTERPRISE_VERIFIER_TYPE = 'recaptcha-enterprise';
    const FAKE_TOKEN = 'NO_RECAPTCHA';
    class RecaptchaEnterpriseVerifier {
        /**
         *
         * @param authExtern - The corresponding Firebase {@link Auth} instance.
         *
         */
        constructor(authExtern) {
            /**
             * Identifies the type of application verifier (e.g. "recaptcha-enterprise").
             */
            this.type = RECAPTCHA_ENTERPRISE_VERIFIER_TYPE;
            this.auth = _castAuth(authExtern);
        }
        /**
         * Executes the verification process.
         *
         * @returns A Promise for a token that can be used to assert the validity of a request.
         */
        async verify(action = 'verify', forceRefresh = false) {
            async function retrieveSiteKey(auth) {
                if (!forceRefresh) {
                    if (auth.tenantId == null && auth._agentRecaptchaConfig != null) {
                        return auth._agentRecaptchaConfig.siteKey;
                    }
                    if (auth.tenantId != null &&
                        auth._tenantRecaptchaConfigs[auth.tenantId] !== undefined) {
                        return auth._tenantRecaptchaConfigs[auth.tenantId].siteKey;
                    }
                }
                return new Promise(async (resolve, reject) => {
                    getRecaptchaConfig(auth, {
                        clientType: "CLIENT_TYPE_WEB" /* RecaptchaClientType.WEB */,
                        version: "RECAPTCHA_ENTERPRISE" /* RecaptchaVersion.ENTERPRISE */
                    })
                        .then(response => {
                        if (response.recaptchaKey === undefined) {
                            reject(new Error('recaptcha Enterprise site key undefined'));
                        }
                        else {
                            const config = new RecaptchaConfig(response);
                            if (auth.tenantId == null) {
                                auth._agentRecaptchaConfig = config;
                            }
                            else {
                                auth._tenantRecaptchaConfigs[auth.tenantId] = config;
                            }
                            return resolve(config.siteKey);
                        }
                    })
                        .catch(error => {
                        reject(error);
                    });
                });
            }
            function retrieveRecaptchaToken(siteKey, resolve, reject) {
                const grecaptcha = window.grecaptcha;
                if (isEnterprise(grecaptcha)) {
                    grecaptcha.enterprise.ready(() => {
                        grecaptcha.enterprise
                            .execute(siteKey, { action })
                            .then(token => {
                            resolve(token);
                        })
                            .catch(() => {
                            resolve(FAKE_TOKEN);
                        });
                    });
                }
                else {
                    reject(Error('No reCAPTCHA enterprise script loaded.'));
                }
            }
            // Returns Promise for a mock token when appVerificationDisabledForTesting is true.
            if (this.auth.settings.appVerificationDisabledForTesting) {
                const mockRecaptcha = new MockGreCAPTCHATopLevel();
                return mockRecaptcha.execute('siteKey', { action: 'verify' });
            }
            return new Promise((resolve, reject) => {
                retrieveSiteKey(this.auth)
                    .then(siteKey => {
                    if (!forceRefresh && isEnterprise(window.grecaptcha)) {
                        retrieveRecaptchaToken(siteKey, resolve, reject);
                    }
                    else {
                        if (typeof window === 'undefined') {
                            reject(new Error('RecaptchaVerifier is only supported in browser'));
                            return;
                        }
                        let url = _recaptchaEnterpriseScriptUrl();
                        if (url.length !== 0) {
                            url += siteKey;
                        }
                        _loadJS(url)
                            .then(() => {
                            retrieveRecaptchaToken(siteKey, resolve, reject);
                        })
                            .catch(error => {
                            reject(error);
                        });
                    }
                })
                    .catch(error => {
                    reject(error);
                });
            });
        }
    }
    async function injectRecaptchaFields(auth, request, action, isCaptchaResp = false, isFakeToken = false) {
        const verifier = new RecaptchaEnterpriseVerifier(auth);
        let captchaResponse;
        if (isFakeToken) {
            captchaResponse = FAKE_TOKEN;
        }
        else {
            try {
                captchaResponse = await verifier.verify(action);
            }
            catch (error) {
                captchaResponse = await verifier.verify(action, true);
            }
        }
        const newRequest = Object.assign({}, request);
        if (action === "mfaSmsEnrollment" /* RecaptchaActionName.MFA_SMS_ENROLLMENT */ ||
            action === "mfaSmsSignIn" /* RecaptchaActionName.MFA_SMS_SIGNIN */) {
            if ('phoneEnrollmentInfo' in newRequest) {
                const phoneNumber = newRequest.phoneEnrollmentInfo.phoneNumber;
                const recaptchaToken = newRequest.phoneEnrollmentInfo.recaptchaToken;
                Object.assign(newRequest, {
                    'phoneEnrollmentInfo': {
                        phoneNumber,
                        recaptchaToken,
                        captchaResponse,
                        'clientType': "CLIENT_TYPE_WEB" /* RecaptchaClientType.WEB */,
                        'recaptchaVersion': "RECAPTCHA_ENTERPRISE" /* RecaptchaVersion.ENTERPRISE */
                    }
                });
            }
            else if ('phoneSignInInfo' in newRequest) {
                const recaptchaToken = newRequest.phoneSignInInfo.recaptchaToken;
                Object.assign(newRequest, {
                    'phoneSignInInfo': {
                        recaptchaToken,
                        captchaResponse,
                        'clientType': "CLIENT_TYPE_WEB" /* RecaptchaClientType.WEB */,
                        'recaptchaVersion': "RECAPTCHA_ENTERPRISE" /* RecaptchaVersion.ENTERPRISE */
                    }
                });
            }
            return newRequest;
        }
        if (!isCaptchaResp) {
            Object.assign(newRequest, { captchaResponse });
        }
        else {
            Object.assign(newRequest, { 'captchaResp': captchaResponse });
        }
        Object.assign(newRequest, { 'clientType': "CLIENT_TYPE_WEB" /* RecaptchaClientType.WEB */ });
        Object.assign(newRequest, {
            'recaptchaVersion': "RECAPTCHA_ENTERPRISE" /* RecaptchaVersion.ENTERPRISE */
        });
        return newRequest;
    }
    async function handleRecaptchaFlow(authInstance, request, actionName, actionMethod, recaptchaAuthProvider) {
        var _a;
        {
            if ((_a = authInstance
                ._getRecaptchaConfig()) === null || _a === void 0 ? void 0 : _a.isProviderEnabled("EMAIL_PASSWORD_PROVIDER" /* RecaptchaAuthProvider.EMAIL_PASSWORD_PROVIDER */)) {
                const requestWithRecaptcha = await injectRecaptchaFields(authInstance, request, actionName, actionName === "getOobCode" /* RecaptchaActionName.GET_OOB_CODE */);
                return actionMethod(authInstance, requestWithRecaptcha);
            }
            else {
                return actionMethod(authInstance, request).catch(async (error) => {
                    if (error.code === `auth/${"missing-recaptcha-token" /* AuthErrorCode.MISSING_RECAPTCHA_TOKEN */}`) {
                        console.log(`${actionName} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);
                        const requestWithRecaptcha = await injectRecaptchaFields(authInstance, request, actionName, actionName === "getOobCode" /* RecaptchaActionName.GET_OOB_CODE */);
                        return actionMethod(authInstance, requestWithRecaptcha);
                    }
                    else {
                        return Promise.reject(error);
                    }
                });
            }
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Initializes an {@link Auth} instance with fine-grained control over
     * {@link Dependencies}.
     *
     * @remarks
     *
     * This function allows more control over the {@link Auth} instance than
     * {@link getAuth}. `getAuth` uses platform-specific defaults to supply
     * the {@link Dependencies}. In general, `getAuth` is the easiest way to
     * initialize Auth and works for most use cases. Use `initializeAuth` if you
     * need control over which persistence layer is used, or to minimize bundle
     * size if you're not using either `signInWithPopup` or `signInWithRedirect`.
     *
     * For example, if your app only uses anonymous accounts and you only want
     * accounts saved for the current session, initialize `Auth` with:
     *
     * ```js
     * const auth = initializeAuth(app, {
     *   persistence: browserSessionPersistence,
     *   popupRedirectResolver: undefined,
     * });
     * ```
     *
     * @public
     */
    function initializeAuth(app, deps) {
        const provider = _getProvider(app, 'auth');
        if (provider.isInitialized()) {
            const auth = provider.getImmediate();
            const initialOptions = provider.getOptions();
            if (deepEqual(initialOptions, deps !== null && deps !== void 0 ? deps : {})) {
                return auth;
            }
            else {
                _fail(auth, "already-initialized" /* AuthErrorCode.ALREADY_INITIALIZED */);
            }
        }
        const auth = provider.initialize({ options: deps });
        return auth;
    }
    function _initializeAuthInstance(auth, deps) {
        const persistence = (deps === null || deps === void 0 ? void 0 : deps.persistence) || [];
        const hierarchy = (Array.isArray(persistence) ? persistence : [persistence]).map(_getInstance);
        if (deps === null || deps === void 0 ? void 0 : deps.errorMap) {
            auth._updateErrorMap(deps.errorMap);
        }
        // This promise is intended to float; auth initialization happens in the
        // background, meanwhile the auth object may be used by the app.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        auth._initializeWithPersistence(hierarchy, deps === null || deps === void 0 ? void 0 : deps.popupRedirectResolver);
    }

    /**
     * Changes the {@link Auth} instance to communicate with the Firebase Auth Emulator, instead of production
     * Firebase Auth services.
     *
     * @remarks
     * This must be called synchronously immediately following the first call to
     * {@link initializeAuth}.  Do not use with production credentials as emulator
     * traffic is not encrypted.
     *
     *
     * @example
     * ```javascript
     * connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
     * ```
     *
     * @param auth - The {@link Auth} instance.
     * @param url - The URL at which the emulator is running (eg, 'http://localhost:9099').
     * @param options - Optional. `options.disableWarnings` defaults to `false`. Set it to
     * `true` to disable the warning banner attached to the DOM.
     *
     * @public
     */
    function connectAuthEmulator(auth, url, options) {
        const authInternal = _castAuth(auth);
        _assert(/^https?:\/\//.test(url), authInternal, "invalid-emulator-scheme" /* AuthErrorCode.INVALID_EMULATOR_SCHEME */);
        const disableWarnings = false;
        const protocol = extractProtocol(url);
        const { host, port } = extractHostAndPort(url);
        const portStr = port === null ? '' : `:${port}`;
        // Always replace path with "/" (even if input url had no path at all, or had a different one).
        const emulator = { url: `${protocol}//${host}${portStr}/` };
        const emulatorConfig = Object.freeze({
            host,
            port,
            protocol: protocol.replace(':', ''),
            options: Object.freeze({ disableWarnings })
        });
        // There are a few scenarios to guard against if the Auth instance has already started:
        if (!authInternal._canInitEmulator) {
            // Applications may not initialize the emulator for the first time if Auth has already started
            // to make network requests.
            _assert(authInternal.config.emulator && authInternal.emulatorConfig, authInternal, "emulator-config-failed" /* AuthErrorCode.EMULATOR_CONFIG_FAILED */);
            // Applications may not alter the configuration of the emulator (aka pass a different config)
            // once Auth has started to make network requests.
            _assert(deepEqual(emulator, authInternal.config.emulator) &&
                deepEqual(emulatorConfig, authInternal.emulatorConfig), authInternal, "emulator-config-failed" /* AuthErrorCode.EMULATOR_CONFIG_FAILED */);
            // It's valid, however, to invoke connectAuthEmulator() after Auth has started making
            // connections, so long as the config matches the existing config. This results in a no-op.
            return;
        }
        authInternal.config.emulator = emulator;
        authInternal.emulatorConfig = emulatorConfig;
        authInternal.settings.appVerificationDisabledForTesting = true;
        {
            emitEmulatorWarning();
        }
    }
    function extractProtocol(url) {
        const protocolEnd = url.indexOf(':');
        return protocolEnd < 0 ? '' : url.substr(0, protocolEnd + 1);
    }
    function extractHostAndPort(url) {
        const protocol = extractProtocol(url);
        const authority = /(\/\/)?([^?#/]+)/.exec(url.substr(protocol.length)); // Between // and /, ? or #.
        if (!authority) {
            return { host: '', port: null };
        }
        const hostAndPort = authority[2].split('@').pop() || ''; // Strip out "username:password@".
        const bracketedIPv6 = /^(\[[^\]]+\])(:|$)/.exec(hostAndPort);
        if (bracketedIPv6) {
            const host = bracketedIPv6[1];
            return { host, port: parsePort(hostAndPort.substr(host.length + 1)) };
        }
        else {
            const [host, port] = hostAndPort.split(':');
            return { host, port: parsePort(port) };
        }
    }
    function parsePort(portStr) {
        if (!portStr) {
            return null;
        }
        const port = Number(portStr);
        if (isNaN(port)) {
            return null;
        }
        return port;
    }
    function emitEmulatorWarning() {
        function attachBanner() {
            const el = document.createElement('p');
            const sty = el.style;
            el.innerText =
                'Running in emulator mode. Do not use with production credentials.';
            sty.position = 'fixed';
            sty.width = '100%';
            sty.backgroundColor = '#ffffff';
            sty.border = '.1em solid #000000';
            sty.color = '#b50000';
            sty.bottom = '0px';
            sty.left = '0px';
            sty.margin = '0px';
            sty.zIndex = '10000';
            sty.textAlign = 'center';
            el.classList.add('firebase-emulator-warning');
            document.body.appendChild(el);
        }
        if (typeof console !== 'undefined' && typeof console.info === 'function') {
            console.info('WARNING: You are using the Auth Emulator,' +
                ' which is intended for local testing only.  Do not use with' +
                ' production credentials.');
        }
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            if (document.readyState === 'loading') {
                window.addEventListener('DOMContentLoaded', attachBanner);
            }
            else {
                attachBanner();
            }
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Interface that represents the credentials returned by an {@link AuthProvider}.
     *
     * @remarks
     * Implementations specify the details about each auth provider's credential requirements.
     *
     * @public
     */
    class AuthCredential {
        /** @internal */
        constructor(
        /**
         * The authentication provider ID for the credential.
         *
         * @remarks
         * For example, 'facebook.com', or 'google.com'.
         */
        providerId, 
        /**
         * The authentication sign in method for the credential.
         *
         * @remarks
         * For example, {@link SignInMethod}.EMAIL_PASSWORD, or
         * {@link SignInMethod}.EMAIL_LINK. This corresponds to the sign-in method
         * identifier as returned in {@link fetchSignInMethodsForEmail}.
         */
        signInMethod) {
            this.providerId = providerId;
            this.signInMethod = signInMethod;
        }
        /**
         * Returns a JSON-serializable representation of this object.
         *
         * @returns a JSON-serializable representation of this object.
         */
        toJSON() {
            return debugFail('not implemented');
        }
        /** @internal */
        _getIdTokenResponse(_auth) {
            return debugFail('not implemented');
        }
        /** @internal */
        _linkToIdToken(_auth, _idToken) {
            return debugFail('not implemented');
        }
        /** @internal */
        _getReauthenticationResolver(_auth) {
            return debugFail('not implemented');
        }
    }
    // Used for linking an email/password account to an existing idToken. Uses the same request/response
    // format as updateEmailPassword.
    async function linkEmailPassword(auth, request) {
        return _performApiRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:signUp" /* Endpoint.SIGN_UP */, request);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function signInWithPassword(auth, request) {
        return _performSignInRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:signInWithPassword" /* Endpoint.SIGN_IN_WITH_PASSWORD */, _addTidIfNecessary(auth, request));
    }
    async function sendOobCode(auth, request) {
        return _performApiRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:sendOobCode" /* Endpoint.SEND_OOB_CODE */, _addTidIfNecessary(auth, request));
    }
    async function sendEmailVerification$1(auth, request) {
        return sendOobCode(auth, request);
    }
    async function sendPasswordResetEmail$1(auth, request) {
        return sendOobCode(auth, request);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function signInWithEmailLink$1(auth, request) {
        return _performSignInRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:signInWithEmailLink" /* Endpoint.SIGN_IN_WITH_EMAIL_LINK */, _addTidIfNecessary(auth, request));
    }
    async function signInWithEmailLinkForLinking(auth, request) {
        return _performSignInRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:signInWithEmailLink" /* Endpoint.SIGN_IN_WITH_EMAIL_LINK */, _addTidIfNecessary(auth, request));
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Interface that represents the credentials returned by {@link EmailAuthProvider} for
     * {@link ProviderId}.PASSWORD
     *
     * @remarks
     * Covers both {@link SignInMethod}.EMAIL_PASSWORD and
     * {@link SignInMethod}.EMAIL_LINK.
     *
     * @public
     */
    class EmailAuthCredential extends AuthCredential {
        /** @internal */
        constructor(
        /** @internal */
        _email, 
        /** @internal */
        _password, signInMethod, 
        /** @internal */
        _tenantId = null) {
            super("password" /* ProviderId.PASSWORD */, signInMethod);
            this._email = _email;
            this._password = _password;
            this._tenantId = _tenantId;
        }
        /** @internal */
        static _fromEmailAndPassword(email, password) {
            return new EmailAuthCredential(email, password, "password" /* SignInMethod.EMAIL_PASSWORD */);
        }
        /** @internal */
        static _fromEmailAndCode(email, oobCode, tenantId = null) {
            return new EmailAuthCredential(email, oobCode, "emailLink" /* SignInMethod.EMAIL_LINK */, tenantId);
        }
        /** {@inheritdoc AuthCredential.toJSON} */
        toJSON() {
            return {
                email: this._email,
                password: this._password,
                signInMethod: this.signInMethod,
                tenantId: this._tenantId
            };
        }
        /**
         * Static method to deserialize a JSON representation of an object into an {@link  AuthCredential}.
         *
         * @param json - Either `object` or the stringified representation of the object. When string is
         * provided, `JSON.parse` would be called first.
         *
         * @returns If the JSON input does not represent an {@link AuthCredential}, null is returned.
         */
        static fromJSON(json) {
            const obj = typeof json === 'string' ? JSON.parse(json) : json;
            if ((obj === null || obj === void 0 ? void 0 : obj.email) && (obj === null || obj === void 0 ? void 0 : obj.password)) {
                if (obj.signInMethod === "password" /* SignInMethod.EMAIL_PASSWORD */) {
                    return this._fromEmailAndPassword(obj.email, obj.password);
                }
                else if (obj.signInMethod === "emailLink" /* SignInMethod.EMAIL_LINK */) {
                    return this._fromEmailAndCode(obj.email, obj.password, obj.tenantId);
                }
            }
            return null;
        }
        /** @internal */
        async _getIdTokenResponse(auth) {
            switch (this.signInMethod) {
                case "password" /* SignInMethod.EMAIL_PASSWORD */:
                    const request = {
                        returnSecureToken: true,
                        email: this._email,
                        password: this._password,
                        clientType: "CLIENT_TYPE_WEB" /* RecaptchaClientType.WEB */
                    };
                    return handleRecaptchaFlow(auth, request, "signInWithPassword" /* RecaptchaActionName.SIGN_IN_WITH_PASSWORD */, signInWithPassword);
                case "emailLink" /* SignInMethod.EMAIL_LINK */:
                    return signInWithEmailLink$1(auth, {
                        email: this._email,
                        oobCode: this._password
                    });
                default:
                    _fail(auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            }
        }
        /** @internal */
        async _linkToIdToken(auth, idToken) {
            switch (this.signInMethod) {
                case "password" /* SignInMethod.EMAIL_PASSWORD */:
                    const request = {
                        idToken,
                        returnSecureToken: true,
                        email: this._email,
                        password: this._password,
                        clientType: "CLIENT_TYPE_WEB" /* RecaptchaClientType.WEB */
                    };
                    return handleRecaptchaFlow(auth, request, "signUpPassword" /* RecaptchaActionName.SIGN_UP_PASSWORD */, linkEmailPassword);
                case "emailLink" /* SignInMethod.EMAIL_LINK */:
                    return signInWithEmailLinkForLinking(auth, {
                        idToken,
                        email: this._email,
                        oobCode: this._password
                    });
                default:
                    _fail(auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            }
        }
        /** @internal */
        _getReauthenticationResolver(auth) {
            return this._getIdTokenResponse(auth);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function signInWithIdp(auth, request) {
        return _performSignInRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:signInWithIdp" /* Endpoint.SIGN_IN_WITH_IDP */, _addTidIfNecessary(auth, request));
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const IDP_REQUEST_URI$1 = 'http://localhost';
    /**
     * Represents the OAuth credentials returned by an {@link OAuthProvider}.
     *
     * @remarks
     * Implementations specify the details about each auth provider's credential requirements.
     *
     * @public
     */
    class OAuthCredential extends AuthCredential {
        constructor() {
            super(...arguments);
            this.pendingToken = null;
        }
        /** @internal */
        static _fromParams(params) {
            const cred = new OAuthCredential(params.providerId, params.signInMethod);
            if (params.idToken || params.accessToken) {
                // OAuth 2 and either ID token or access token.
                if (params.idToken) {
                    cred.idToken = params.idToken;
                }
                if (params.accessToken) {
                    cred.accessToken = params.accessToken;
                }
                // Add nonce if available and no pendingToken is present.
                if (params.nonce && !params.pendingToken) {
                    cred.nonce = params.nonce;
                }
                if (params.pendingToken) {
                    cred.pendingToken = params.pendingToken;
                }
            }
            else if (params.oauthToken && params.oauthTokenSecret) {
                // OAuth 1 and OAuth token with token secret
                cred.accessToken = params.oauthToken;
                cred.secret = params.oauthTokenSecret;
            }
            else {
                _fail("argument-error" /* AuthErrorCode.ARGUMENT_ERROR */);
            }
            return cred;
        }
        /** {@inheritdoc AuthCredential.toJSON}  */
        toJSON() {
            return {
                idToken: this.idToken,
                accessToken: this.accessToken,
                secret: this.secret,
                nonce: this.nonce,
                pendingToken: this.pendingToken,
                providerId: this.providerId,
                signInMethod: this.signInMethod
            };
        }
        /**
         * Static method to deserialize a JSON representation of an object into an
         * {@link  AuthCredential}.
         *
         * @param json - Input can be either Object or the stringified representation of the object.
         * When string is provided, JSON.parse would be called first.
         *
         * @returns If the JSON input does not represent an {@link  AuthCredential}, null is returned.
         */
        static fromJSON(json) {
            const obj = typeof json === 'string' ? JSON.parse(json) : json;
            const { providerId, signInMethod } = obj, rest = __rest(obj, ["providerId", "signInMethod"]);
            if (!providerId || !signInMethod) {
                return null;
            }
            const cred = new OAuthCredential(providerId, signInMethod);
            cred.idToken = rest.idToken || undefined;
            cred.accessToken = rest.accessToken || undefined;
            cred.secret = rest.secret;
            cred.nonce = rest.nonce;
            cred.pendingToken = rest.pendingToken || null;
            return cred;
        }
        /** @internal */
        _getIdTokenResponse(auth) {
            const request = this.buildRequest();
            return signInWithIdp(auth, request);
        }
        /** @internal */
        _linkToIdToken(auth, idToken) {
            const request = this.buildRequest();
            request.idToken = idToken;
            return signInWithIdp(auth, request);
        }
        /** @internal */
        _getReauthenticationResolver(auth) {
            const request = this.buildRequest();
            request.autoCreate = false;
            return signInWithIdp(auth, request);
        }
        buildRequest() {
            const request = {
                requestUri: IDP_REQUEST_URI$1,
                returnSecureToken: true
            };
            if (this.pendingToken) {
                request.pendingToken = this.pendingToken;
            }
            else {
                const postBody = {};
                if (this.idToken) {
                    postBody['id_token'] = this.idToken;
                }
                if (this.accessToken) {
                    postBody['access_token'] = this.accessToken;
                }
                if (this.secret) {
                    postBody['oauth_token_secret'] = this.secret;
                }
                postBody['providerId'] = this.providerId;
                if (this.nonce && !this.pendingToken) {
                    postBody['nonce'] = this.nonce;
                }
                request.postBody = querystring(postBody);
            }
            return request;
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Maps the mode string in action code URL to Action Code Info operation.
     *
     * @param mode
     */
    function parseMode(mode) {
        switch (mode) {
            case 'recoverEmail':
                return "RECOVER_EMAIL" /* ActionCodeOperation.RECOVER_EMAIL */;
            case 'resetPassword':
                return "PASSWORD_RESET" /* ActionCodeOperation.PASSWORD_RESET */;
            case 'signIn':
                return "EMAIL_SIGNIN" /* ActionCodeOperation.EMAIL_SIGNIN */;
            case 'verifyEmail':
                return "VERIFY_EMAIL" /* ActionCodeOperation.VERIFY_EMAIL */;
            case 'verifyAndChangeEmail':
                return "VERIFY_AND_CHANGE_EMAIL" /* ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL */;
            case 'revertSecondFactorAddition':
                return "REVERT_SECOND_FACTOR_ADDITION" /* ActionCodeOperation.REVERT_SECOND_FACTOR_ADDITION */;
            default:
                return null;
        }
    }
    /**
     * Helper to parse FDL links
     *
     * @param url
     */
    function parseDeepLink(url) {
        const link = querystringDecode(extractQuerystring(url))['link'];
        // Double link case (automatic redirect).
        const doubleDeepLink = link
            ? querystringDecode(extractQuerystring(link))['deep_link_id']
            : null;
        // iOS custom scheme links.
        const iOSDeepLink = querystringDecode(extractQuerystring(url))['deep_link_id'];
        const iOSDoubleDeepLink = iOSDeepLink
            ? querystringDecode(extractQuerystring(iOSDeepLink))['link']
            : null;
        return iOSDoubleDeepLink || iOSDeepLink || doubleDeepLink || link || url;
    }
    /**
     * A utility class to parse email action URLs such as password reset, email verification,
     * email link sign in, etc.
     *
     * @public
     */
    class ActionCodeURL {
        /**
         * @param actionLink - The link from which to extract the URL.
         * @returns The {@link ActionCodeURL} object, or null if the link is invalid.
         *
         * @internal
         */
        constructor(actionLink) {
            var _a, _b, _c, _d, _e, _f;
            const searchParams = querystringDecode(extractQuerystring(actionLink));
            const apiKey = (_a = searchParams["apiKey" /* QueryField.API_KEY */]) !== null && _a !== void 0 ? _a : null;
            const code = (_b = searchParams["oobCode" /* QueryField.CODE */]) !== null && _b !== void 0 ? _b : null;
            const operation = parseMode((_c = searchParams["mode" /* QueryField.MODE */]) !== null && _c !== void 0 ? _c : null);
            // Validate API key, code and mode.
            _assert(apiKey && code && operation, "argument-error" /* AuthErrorCode.ARGUMENT_ERROR */);
            this.apiKey = apiKey;
            this.operation = operation;
            this.code = code;
            this.continueUrl = (_d = searchParams["continueUrl" /* QueryField.CONTINUE_URL */]) !== null && _d !== void 0 ? _d : null;
            this.languageCode = (_e = searchParams["lang" /* QueryField.LANGUAGE_CODE */]) !== null && _e !== void 0 ? _e : null;
            this.tenantId = (_f = searchParams["tenantId" /* QueryField.TENANT_ID */]) !== null && _f !== void 0 ? _f : null;
        }
        /**
         * Parses the email action link string and returns an {@link ActionCodeURL} if the link is valid,
         * otherwise returns null.
         *
         * @param link  - The email action link string.
         * @returns The {@link ActionCodeURL} object, or null if the link is invalid.
         *
         * @public
         */
        static parseLink(link) {
            const actionLink = parseDeepLink(link);
            try {
                return new ActionCodeURL(actionLink);
            }
            catch (_a) {
                return null;
            }
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provider for generating {@link EmailAuthCredential}.
     *
     * @public
     */
    class EmailAuthProvider {
        constructor() {
            /**
             * Always set to {@link ProviderId}.PASSWORD, even for email link.
             */
            this.providerId = EmailAuthProvider.PROVIDER_ID;
        }
        /**
         * Initialize an {@link AuthCredential} using an email and password.
         *
         * @example
         * ```javascript
         * const authCredential = EmailAuthProvider.credential(email, password);
         * const userCredential = await signInWithCredential(auth, authCredential);
         * ```
         *
         * @example
         * ```javascript
         * const userCredential = await signInWithEmailAndPassword(auth, email, password);
         * ```
         *
         * @param email - Email address.
         * @param password - User account password.
         * @returns The auth provider credential.
         */
        static credential(email, password) {
            return EmailAuthCredential._fromEmailAndPassword(email, password);
        }
        /**
         * Initialize an {@link AuthCredential} using an email and an email link after a sign in with
         * email link operation.
         *
         * @example
         * ```javascript
         * const authCredential = EmailAuthProvider.credentialWithLink(auth, email, emailLink);
         * const userCredential = await signInWithCredential(auth, authCredential);
         * ```
         *
         * @example
         * ```javascript
         * await sendSignInLinkToEmail(auth, email);
         * // Obtain emailLink from user.
         * const userCredential = await signInWithEmailLink(auth, email, emailLink);
         * ```
         *
         * @param auth - The {@link Auth} instance used to verify the link.
         * @param email - Email address.
         * @param emailLink - Sign-in email link.
         * @returns - The auth provider credential.
         */
        static credentialWithLink(email, emailLink) {
            const actionCodeUrl = ActionCodeURL.parseLink(emailLink);
            _assert(actionCodeUrl, "argument-error" /* AuthErrorCode.ARGUMENT_ERROR */);
            return EmailAuthCredential._fromEmailAndCode(email, actionCodeUrl.code, actionCodeUrl.tenantId);
        }
    }
    /**
     * Always set to {@link ProviderId}.PASSWORD, even for email link.
     */
    EmailAuthProvider.PROVIDER_ID = "password" /* ProviderId.PASSWORD */;
    /**
     * Always set to {@link SignInMethod}.EMAIL_PASSWORD.
     */
    EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD = "password" /* SignInMethod.EMAIL_PASSWORD */;
    /**
     * Always set to {@link SignInMethod}.EMAIL_LINK.
     */
    EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD = "emailLink" /* SignInMethod.EMAIL_LINK */;

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The base class for all Federated providers (OAuth (including OIDC), SAML).
     *
     * This class is not meant to be instantiated directly.
     *
     * @public
     */
    class FederatedAuthProvider {
        /**
         * Constructor for generic OAuth providers.
         *
         * @param providerId - Provider for which credentials should be generated.
         */
        constructor(providerId) {
            this.providerId = providerId;
            /** @internal */
            this.defaultLanguageCode = null;
            /** @internal */
            this.customParameters = {};
        }
        /**
         * Set the language gode.
         *
         * @param languageCode - language code
         */
        setDefaultLanguage(languageCode) {
            this.defaultLanguageCode = languageCode;
        }
        /**
         * Sets the OAuth custom parameters to pass in an OAuth request for popup and redirect sign-in
         * operations.
         *
         * @remarks
         * For a detailed list, check the reserved required OAuth 2.0 parameters such as `client_id`,
         * `redirect_uri`, `scope`, `response_type`, and `state` are not allowed and will be ignored.
         *
         * @param customOAuthParameters - The custom OAuth parameters to pass in the OAuth request.
         */
        setCustomParameters(customOAuthParameters) {
            this.customParameters = customOAuthParameters;
            return this;
        }
        /**
         * Retrieve the current list of {@link CustomParameters}.
         */
        getCustomParameters() {
            return this.customParameters;
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Common code to all OAuth providers. This is separate from the
     * {@link OAuthProvider} so that child providers (like
     * {@link GoogleAuthProvider}) don't inherit the `credential` instance method.
     * Instead, they rely on a static `credential` method.
     */
    class BaseOAuthProvider extends FederatedAuthProvider {
        constructor() {
            super(...arguments);
            /** @internal */
            this.scopes = [];
        }
        /**
         * Add an OAuth scope to the credential.
         *
         * @param scope - Provider OAuth scope to add.
         */
        addScope(scope) {
            // If not already added, add scope to list.
            if (!this.scopes.includes(scope)) {
                this.scopes.push(scope);
            }
            return this;
        }
        /**
         * Retrieve the current list of OAuth scopes.
         */
        getScopes() {
            return [...this.scopes];
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provider for generating an {@link OAuthCredential} for {@link ProviderId}.FACEBOOK.
     *
     * @example
     * ```javascript
     * // Sign in using a redirect.
     * const provider = new FacebookAuthProvider();
     * // Start a sign in process for an unauthenticated user.
     * provider.addScope('user_birthday');
     * await signInWithRedirect(auth, provider);
     * // This will trigger a full page redirect away from your app
     *
     * // After returning from the redirect when your app initializes you can obtain the result
     * const result = await getRedirectResult(auth);
     * if (result) {
     *   // This is the signed-in user
     *   const user = result.user;
     *   // This gives you a Facebook Access Token.
     *   const credential = FacebookAuthProvider.credentialFromResult(result);
     *   const token = credential.accessToken;
     * }
     * ```
     *
     * @example
     * ```javascript
     * // Sign in using a popup.
     * const provider = new FacebookAuthProvider();
     * provider.addScope('user_birthday');
     * const result = await signInWithPopup(auth, provider);
     *
     * // The signed-in user info.
     * const user = result.user;
     * // This gives you a Facebook Access Token.
     * const credential = FacebookAuthProvider.credentialFromResult(result);
     * const token = credential.accessToken;
     * ```
     *
     * @public
     */
    class FacebookAuthProvider extends BaseOAuthProvider {
        constructor() {
            super("facebook.com" /* ProviderId.FACEBOOK */);
        }
        /**
         * Creates a credential for Facebook.
         *
         * @example
         * ```javascript
         * // `event` from the Facebook auth.authResponseChange callback.
         * const credential = FacebookAuthProvider.credential(event.authResponse.accessToken);
         * const result = await signInWithCredential(credential);
         * ```
         *
         * @param accessToken - Facebook access token.
         */
        static credential(accessToken) {
            return OAuthCredential._fromParams({
                providerId: FacebookAuthProvider.PROVIDER_ID,
                signInMethod: FacebookAuthProvider.FACEBOOK_SIGN_IN_METHOD,
                accessToken
            });
        }
        /**
         * Used to extract the underlying {@link OAuthCredential} from a {@link UserCredential}.
         *
         * @param userCredential - The user credential.
         */
        static credentialFromResult(userCredential) {
            return FacebookAuthProvider.credentialFromTaggedObject(userCredential);
        }
        /**
         * Used to extract the underlying {@link OAuthCredential} from a {@link AuthError} which was
         * thrown during a sign-in, link, or reauthenticate operation.
         *
         * @param userCredential - The user credential.
         */
        static credentialFromError(error) {
            return FacebookAuthProvider.credentialFromTaggedObject((error.customData || {}));
        }
        static credentialFromTaggedObject({ _tokenResponse: tokenResponse }) {
            if (!tokenResponse || !('oauthAccessToken' in tokenResponse)) {
                return null;
            }
            if (!tokenResponse.oauthAccessToken) {
                return null;
            }
            try {
                return FacebookAuthProvider.credential(tokenResponse.oauthAccessToken);
            }
            catch (_a) {
                return null;
            }
        }
    }
    /** Always set to {@link SignInMethod}.FACEBOOK. */
    FacebookAuthProvider.FACEBOOK_SIGN_IN_METHOD = "facebook.com" /* SignInMethod.FACEBOOK */;
    /** Always set to {@link ProviderId}.FACEBOOK. */
    FacebookAuthProvider.PROVIDER_ID = "facebook.com" /* ProviderId.FACEBOOK */;

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provider for generating an {@link OAuthCredential} for {@link ProviderId}.GOOGLE.
     *
     * @example
     * ```javascript
     * // Sign in using a redirect.
     * const provider = new GoogleAuthProvider();
     * // Start a sign in process for an unauthenticated user.
     * provider.addScope('profile');
     * provider.addScope('email');
     * await signInWithRedirect(auth, provider);
     * // This will trigger a full page redirect away from your app
     *
     * // After returning from the redirect when your app initializes you can obtain the result
     * const result = await getRedirectResult(auth);
     * if (result) {
     *   // This is the signed-in user
     *   const user = result.user;
     *   // This gives you a Google Access Token.
     *   const credential = GoogleAuthProvider.credentialFromResult(result);
     *   const token = credential.accessToken;
     * }
     * ```
     *
     * @example
     * ```javascript
     * // Sign in using a popup.
     * const provider = new GoogleAuthProvider();
     * provider.addScope('profile');
     * provider.addScope('email');
     * const result = await signInWithPopup(auth, provider);
     *
     * // The signed-in user info.
     * const user = result.user;
     * // This gives you a Google Access Token.
     * const credential = GoogleAuthProvider.credentialFromResult(result);
     * const token = credential.accessToken;
     * ```
     *
     * @public
     */
    class GoogleAuthProvider extends BaseOAuthProvider {
        constructor() {
            super("google.com" /* ProviderId.GOOGLE */);
            this.addScope('profile');
        }
        /**
         * Creates a credential for Google. At least one of ID token and access token is required.
         *
         * @example
         * ```javascript
         * // \`googleUser\` from the onsuccess Google Sign In callback.
         * const credential = GoogleAuthProvider.credential(googleUser.getAuthResponse().id_token);
         * const result = await signInWithCredential(credential);
         * ```
         *
         * @param idToken - Google ID token.
         * @param accessToken - Google access token.
         */
        static credential(idToken, accessToken) {
            return OAuthCredential._fromParams({
                providerId: GoogleAuthProvider.PROVIDER_ID,
                signInMethod: GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD,
                idToken,
                accessToken
            });
        }
        /**
         * Used to extract the underlying {@link OAuthCredential} from a {@link UserCredential}.
         *
         * @param userCredential - The user credential.
         */
        static credentialFromResult(userCredential) {
            return GoogleAuthProvider.credentialFromTaggedObject(userCredential);
        }
        /**
         * Used to extract the underlying {@link OAuthCredential} from a {@link AuthError} which was
         * thrown during a sign-in, link, or reauthenticate operation.
         *
         * @param userCredential - The user credential.
         */
        static credentialFromError(error) {
            return GoogleAuthProvider.credentialFromTaggedObject((error.customData || {}));
        }
        static credentialFromTaggedObject({ _tokenResponse: tokenResponse }) {
            if (!tokenResponse) {
                return null;
            }
            const { oauthIdToken, oauthAccessToken } = tokenResponse;
            if (!oauthIdToken && !oauthAccessToken) {
                // This could be an oauth 1 credential or a phone credential
                return null;
            }
            try {
                return GoogleAuthProvider.credential(oauthIdToken, oauthAccessToken);
            }
            catch (_a) {
                return null;
            }
        }
    }
    /** Always set to {@link SignInMethod}.GOOGLE. */
    GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD = "google.com" /* SignInMethod.GOOGLE */;
    /** Always set to {@link ProviderId}.GOOGLE. */
    GoogleAuthProvider.PROVIDER_ID = "google.com" /* ProviderId.GOOGLE */;

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provider for generating an {@link OAuthCredential} for {@link ProviderId}.GITHUB.
     *
     * @remarks
     * GitHub requires an OAuth 2.0 redirect, so you can either handle the redirect directly, or use
     * the {@link signInWithPopup} handler:
     *
     * @example
     * ```javascript
     * // Sign in using a redirect.
     * const provider = new GithubAuthProvider();
     * // Start a sign in process for an unauthenticated user.
     * provider.addScope('repo');
     * await signInWithRedirect(auth, provider);
     * // This will trigger a full page redirect away from your app
     *
     * // After returning from the redirect when your app initializes you can obtain the result
     * const result = await getRedirectResult(auth);
     * if (result) {
     *   // This is the signed-in user
     *   const user = result.user;
     *   // This gives you a GitHub Access Token.
     *   const credential = GithubAuthProvider.credentialFromResult(result);
     *   const token = credential.accessToken;
     * }
     * ```
     *
     * @example
     * ```javascript
     * // Sign in using a popup.
     * const provider = new GithubAuthProvider();
     * provider.addScope('repo');
     * const result = await signInWithPopup(auth, provider);
     *
     * // The signed-in user info.
     * const user = result.user;
     * // This gives you a GitHub Access Token.
     * const credential = GithubAuthProvider.credentialFromResult(result);
     * const token = credential.accessToken;
     * ```
     * @public
     */
    class GithubAuthProvider extends BaseOAuthProvider {
        constructor() {
            super("github.com" /* ProviderId.GITHUB */);
        }
        /**
         * Creates a credential for GitHub.
         *
         * @param accessToken - GitHub access token.
         */
        static credential(accessToken) {
            return OAuthCredential._fromParams({
                providerId: GithubAuthProvider.PROVIDER_ID,
                signInMethod: GithubAuthProvider.GITHUB_SIGN_IN_METHOD,
                accessToken
            });
        }
        /**
         * Used to extract the underlying {@link OAuthCredential} from a {@link UserCredential}.
         *
         * @param userCredential - The user credential.
         */
        static credentialFromResult(userCredential) {
            return GithubAuthProvider.credentialFromTaggedObject(userCredential);
        }
        /**
         * Used to extract the underlying {@link OAuthCredential} from a {@link AuthError} which was
         * thrown during a sign-in, link, or reauthenticate operation.
         *
         * @param userCredential - The user credential.
         */
        static credentialFromError(error) {
            return GithubAuthProvider.credentialFromTaggedObject((error.customData || {}));
        }
        static credentialFromTaggedObject({ _tokenResponse: tokenResponse }) {
            if (!tokenResponse || !('oauthAccessToken' in tokenResponse)) {
                return null;
            }
            if (!tokenResponse.oauthAccessToken) {
                return null;
            }
            try {
                return GithubAuthProvider.credential(tokenResponse.oauthAccessToken);
            }
            catch (_a) {
                return null;
            }
        }
    }
    /** Always set to {@link SignInMethod}.GITHUB. */
    GithubAuthProvider.GITHUB_SIGN_IN_METHOD = "github.com" /* SignInMethod.GITHUB */;
    /** Always set to {@link ProviderId}.GITHUB. */
    GithubAuthProvider.PROVIDER_ID = "github.com" /* ProviderId.GITHUB */;

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provider for generating an {@link OAuthCredential} for {@link ProviderId}.TWITTER.
     *
     * @example
     * ```javascript
     * // Sign in using a redirect.
     * const provider = new TwitterAuthProvider();
     * // Start a sign in process for an unauthenticated user.
     * await signInWithRedirect(auth, provider);
     * // This will trigger a full page redirect away from your app
     *
     * // After returning from the redirect when your app initializes you can obtain the result
     * const result = await getRedirectResult(auth);
     * if (result) {
     *   // This is the signed-in user
     *   const user = result.user;
     *   // This gives you a Twitter Access Token and Secret.
     *   const credential = TwitterAuthProvider.credentialFromResult(result);
     *   const token = credential.accessToken;
     *   const secret = credential.secret;
     * }
     * ```
     *
     * @example
     * ```javascript
     * // Sign in using a popup.
     * const provider = new TwitterAuthProvider();
     * const result = await signInWithPopup(auth, provider);
     *
     * // The signed-in user info.
     * const user = result.user;
     * // This gives you a Twitter Access Token and Secret.
     * const credential = TwitterAuthProvider.credentialFromResult(result);
     * const token = credential.accessToken;
     * const secret = credential.secret;
     * ```
     *
     * @public
     */
    class TwitterAuthProvider extends BaseOAuthProvider {
        constructor() {
            super("twitter.com" /* ProviderId.TWITTER */);
        }
        /**
         * Creates a credential for Twitter.
         *
         * @param token - Twitter access token.
         * @param secret - Twitter secret.
         */
        static credential(token, secret) {
            return OAuthCredential._fromParams({
                providerId: TwitterAuthProvider.PROVIDER_ID,
                signInMethod: TwitterAuthProvider.TWITTER_SIGN_IN_METHOD,
                oauthToken: token,
                oauthTokenSecret: secret
            });
        }
        /**
         * Used to extract the underlying {@link OAuthCredential} from a {@link UserCredential}.
         *
         * @param userCredential - The user credential.
         */
        static credentialFromResult(userCredential) {
            return TwitterAuthProvider.credentialFromTaggedObject(userCredential);
        }
        /**
         * Used to extract the underlying {@link OAuthCredential} from a {@link AuthError} which was
         * thrown during a sign-in, link, or reauthenticate operation.
         *
         * @param userCredential - The user credential.
         */
        static credentialFromError(error) {
            return TwitterAuthProvider.credentialFromTaggedObject((error.customData || {}));
        }
        static credentialFromTaggedObject({ _tokenResponse: tokenResponse }) {
            if (!tokenResponse) {
                return null;
            }
            const { oauthAccessToken, oauthTokenSecret } = tokenResponse;
            if (!oauthAccessToken || !oauthTokenSecret) {
                return null;
            }
            try {
                return TwitterAuthProvider.credential(oauthAccessToken, oauthTokenSecret);
            }
            catch (_a) {
                return null;
            }
        }
    }
    /** Always set to {@link SignInMethod}.TWITTER. */
    TwitterAuthProvider.TWITTER_SIGN_IN_METHOD = "twitter.com" /* SignInMethod.TWITTER */;
    /** Always set to {@link ProviderId}.TWITTER. */
    TwitterAuthProvider.PROVIDER_ID = "twitter.com" /* ProviderId.TWITTER */;

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function signUp(auth, request) {
        return _performSignInRequest(auth, "POST" /* HttpMethod.POST */, "/v1/accounts:signUp" /* Endpoint.SIGN_UP */, _addTidIfNecessary(auth, request));
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class UserCredentialImpl {
        constructor(params) {
            this.user = params.user;
            this.providerId = params.providerId;
            this._tokenResponse = params._tokenResponse;
            this.operationType = params.operationType;
        }
        static async _fromIdTokenResponse(auth, operationType, idTokenResponse, isAnonymous = false) {
            const user = await UserImpl._fromIdTokenResponse(auth, idTokenResponse, isAnonymous);
            const providerId = providerIdForResponse(idTokenResponse);
            const userCred = new UserCredentialImpl({
                user,
                providerId,
                _tokenResponse: idTokenResponse,
                operationType
            });
            return userCred;
        }
        static async _forOperation(user, operationType, response) {
            await user._updateTokensIfNecessary(response, /* reload */ true);
            const providerId = providerIdForResponse(response);
            return new UserCredentialImpl({
                user,
                providerId,
                _tokenResponse: response,
                operationType
            });
        }
    }
    function providerIdForResponse(response) {
        if (response.providerId) {
            return response.providerId;
        }
        if ('phoneNumber' in response) {
            return "phone" /* ProviderId.PHONE */;
        }
        return null;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class MultiFactorError extends FirebaseError {
        constructor(auth, error, operationType, user) {
            var _a;
            super(error.code, error.message);
            this.operationType = operationType;
            this.user = user;
            // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
            Object.setPrototypeOf(this, MultiFactorError.prototype);
            this.customData = {
                appName: auth.name,
                tenantId: (_a = auth.tenantId) !== null && _a !== void 0 ? _a : undefined,
                _serverResponse: error.customData._serverResponse,
                operationType
            };
        }
        static _fromErrorAndOperation(auth, error, operationType, user) {
            return new MultiFactorError(auth, error, operationType, user);
        }
    }
    function _processCredentialSavingMfaContextIfNecessary(auth, operationType, credential, user) {
        const idTokenProvider = operationType === "reauthenticate" /* OperationType.REAUTHENTICATE */
            ? credential._getReauthenticationResolver(auth)
            : credential._getIdTokenResponse(auth);
        return idTokenProvider.catch(error => {
            if (error.code === `auth/${"multi-factor-auth-required" /* AuthErrorCode.MFA_REQUIRED */}`) {
                throw MultiFactorError._fromErrorAndOperation(auth, error, operationType, user);
            }
            throw error;
        });
    }
    async function _link$1(user, credential, bypassAuthState = false) {
        const response = await _logoutIfInvalidated(user, credential._linkToIdToken(user.auth, await user.getIdToken()), bypassAuthState);
        return UserCredentialImpl._forOperation(user, "link" /* OperationType.LINK */, response);
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function _reauthenticate(user, credential, bypassAuthState = false) {
        const { auth } = user;
        if (_isFirebaseServerApp(auth.app)) {
            return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(auth));
        }
        const operationType = "reauthenticate" /* OperationType.REAUTHENTICATE */;
        try {
            const response = await _logoutIfInvalidated(user, _processCredentialSavingMfaContextIfNecessary(auth, operationType, credential, user), bypassAuthState);
            _assert(response.idToken, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            const parsed = _parseToken(response.idToken);
            _assert(parsed, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            const { sub: localId } = parsed;
            _assert(user.uid === localId, auth, "user-mismatch" /* AuthErrorCode.USER_MISMATCH */);
            return UserCredentialImpl._forOperation(user, operationType, response);
        }
        catch (e) {
            // Convert user deleted error into user mismatch
            if ((e === null || e === void 0 ? void 0 : e.code) === `auth/${"user-not-found" /* AuthErrorCode.USER_DELETED */}`) {
                _fail(auth, "user-mismatch" /* AuthErrorCode.USER_MISMATCH */);
            }
            throw e;
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function _signInWithCredential(auth, credential, bypassAuthState = false) {
        if (_isFirebaseServerApp(auth.app)) {
            return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(auth));
        }
        const operationType = "signIn" /* OperationType.SIGN_IN */;
        const response = await _processCredentialSavingMfaContextIfNecessary(auth, operationType, credential);
        const userCredential = await UserCredentialImpl._fromIdTokenResponse(auth, operationType, response);
        if (!bypassAuthState) {
            await auth._updateCurrentUser(userCredential.user);
        }
        return userCredential;
    }
    /**
     * Asynchronously signs in with the given credentials.
     *
     * @remarks
     * An {@link AuthProvider} can be used to generate the credential.
     *
     * This method is not supported by {@link Auth} instances created with a
     * {@link @firebase/app#FirebaseServerApp}.
     *
     * @param auth - The {@link Auth} instance.
     * @param credential - The auth credential.
     *
     * @public
     */
    async function signInWithCredential(auth, credential) {
        return _signInWithCredential(_castAuth(auth), credential);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Updates the password policy cached in the {@link Auth} instance if a policy is already
     * cached for the project or tenant.
     *
     * @remarks
     * We only fetch the password policy if the password did not meet policy requirements and
     * there is an existing policy cached. A developer must call validatePassword at least
     * once for the cache to be automatically updated.
     *
     * @param auth - The {@link Auth} instance.
     *
     * @private
     */
    async function recachePasswordPolicy(auth) {
        const authInternal = _castAuth(auth);
        if (authInternal._getPasswordPolicyInternal()) {
            await authInternal._updatePasswordPolicy();
        }
    }
    /**
     * Sends a password reset email to the given email address. This method does not throw an error when
     * there's no user account with the given email address and
     * {@link https://cloud.google.com/identity-platform/docs/admin/email-enumeration-protection | Email Enumeration Protection}
     * is enabled.
     *
     * @remarks
     * To complete the password reset, call {@link confirmPasswordReset} with the code supplied in
     * the email sent to the user, along with the new password specified by the user.
     *
     * @example
     * ```javascript
     * const actionCodeSettings = {
     *   url: 'https://www.example.com/?email=user@example.com',
     *   iOS: {
     *      bundleId: 'com.example.ios'
     *   },
     *   android: {
     *     packageName: 'com.example.android',
     *     installApp: true,
     *     minimumVersion: '12'
     *   },
     *   handleCodeInApp: true
     * };
     * await sendPasswordResetEmail(auth, 'user@example.com', actionCodeSettings);
     * // Obtain code from user.
     * await confirmPasswordReset('user@example.com', code);
     * ```
     *
     * @param auth - The {@link Auth} instance.
     * @param email - The user's email address.
     * @param actionCodeSettings - The {@link ActionCodeSettings}.
     *
     * @public
     */
    async function sendPasswordResetEmail(auth, email, actionCodeSettings) {
        const authInternal = _castAuth(auth);
        const request = {
            requestType: "PASSWORD_RESET" /* ActionCodeOperation.PASSWORD_RESET */,
            email,
            clientType: "CLIENT_TYPE_WEB" /* RecaptchaClientType.WEB */
        };
        await handleRecaptchaFlow(authInternal, request, "getOobCode" /* RecaptchaActionName.GET_OOB_CODE */, sendPasswordResetEmail$1);
    }
    /**
     * Creates a new user account associated with the specified email address and password.
     *
     * @remarks
     * On successful creation of the user account, this user will also be signed in to your application.
     *
     * User account creation can fail if the account already exists or the password is invalid.
     *
     * This method is not supported on {@link Auth} instances created with a
     * {@link @firebase/app#FirebaseServerApp}.
     *
     * Note: The email address acts as a unique identifier for the user and enables an email-based
     * password reset. This function will create a new user account and set the initial user password.
     *
     * @param auth - The {@link Auth} instance.
     * @param email - The user's email address.
     * @param password - The user's chosen password.
     *
     * @public
     */
    async function createUserWithEmailAndPassword(auth, email, password) {
        if (_isFirebaseServerApp(auth.app)) {
            return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(auth));
        }
        const authInternal = _castAuth(auth);
        const request = {
            returnSecureToken: true,
            email,
            password,
            clientType: "CLIENT_TYPE_WEB" /* RecaptchaClientType.WEB */
        };
        const signUpResponse = handleRecaptchaFlow(authInternal, request, "signUpPassword" /* RecaptchaActionName.SIGN_UP_PASSWORD */, signUp);
        const response = await signUpResponse.catch(error => {
            if (error.code === `auth/${"password-does-not-meet-requirements" /* AuthErrorCode.PASSWORD_DOES_NOT_MEET_REQUIREMENTS */}`) {
                void recachePasswordPolicy(auth);
            }
            throw error;
        });
        const userCredential = await UserCredentialImpl._fromIdTokenResponse(authInternal, "signIn" /* OperationType.SIGN_IN */, response);
        await authInternal._updateCurrentUser(userCredential.user);
        return userCredential;
    }
    /**
     * Asynchronously signs in using an email and password.
     *
     * @remarks
     * Fails with an error if the email address and password do not match. When
     * {@link https://cloud.google.com/identity-platform/docs/admin/email-enumeration-protection | Email Enumeration Protection}
     * is enabled, this method fails with "auth/invalid-credential" in case of an invalid
     * email/password.
     *
     * This method is not supported on {@link Auth} instances created with a
     * {@link @firebase/app#FirebaseServerApp}.
     *
     * Note: The user's password is NOT the password used to access the user's email account. The
     * email address serves as a unique identifier for the user, and the password is used to access
     * the user's account in your Firebase project. See also: {@link createUserWithEmailAndPassword}.
     *
     *
     * @param auth - The {@link Auth} instance.
     * @param email - The users email address.
     * @param password - The users password.
     *
     * @public
     */
    function signInWithEmailAndPassword(auth, email, password) {
        if (_isFirebaseServerApp(auth.app)) {
            return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(auth));
        }
        return signInWithCredential(getModularInstance(auth), EmailAuthProvider.credential(email, password)).catch(async (error) => {
            if (error.code === `auth/${"password-does-not-meet-requirements" /* AuthErrorCode.PASSWORD_DOES_NOT_MEET_REQUIREMENTS */}`) {
                void recachePasswordPolicy(auth);
            }
            throw error;
        });
    }
    /**
     * Sends a verification email to a user.
     *
     * @remarks
     * The verification process is completed by calling {@link applyActionCode}.
     *
     * @example
     * ```javascript
     * const actionCodeSettings = {
     *   url: 'https://www.example.com/?email=user@example.com',
     *   iOS: {
     *      bundleId: 'com.example.ios'
     *   },
     *   android: {
     *     packageName: 'com.example.android',
     *     installApp: true,
     *     minimumVersion: '12'
     *   },
     *   handleCodeInApp: true
     * };
     * await sendEmailVerification(user, actionCodeSettings);
     * // Obtain code from the user.
     * await applyActionCode(auth, code);
     * ```
     *
     * @param user - The user.
     * @param actionCodeSettings - The {@link ActionCodeSettings}.
     *
     * @public
     */
    async function sendEmailVerification(user, actionCodeSettings) {
        const userInternal = getModularInstance(user);
        const idToken = await user.getIdToken();
        const request = {
            requestType: "VERIFY_EMAIL" /* ActionCodeOperation.VERIFY_EMAIL */,
            idToken
        };
        const { email } = await sendEmailVerification$1(userInternal.auth, request);
        if (email !== user.email) {
            await user.reload();
        }
    }
    /**
     * Adds an observer for changes to the signed-in user's ID token.
     *
     * @remarks
     * This includes sign-in, sign-out, and token refresh events.
     * This will not be triggered automatically upon ID token expiration. Use {@link User.getIdToken} to refresh the ID token.
     *
     * @param auth - The {@link Auth} instance.
     * @param nextOrObserver - callback triggered on change.
     * @param error - Deprecated. This callback is never triggered. Errors
     * on signing in/out can be caught in promises returned from
     * sign-in/sign-out functions.
     * @param completed - Deprecated. This callback is never triggered.
     *
     * @public
     */
    function onIdTokenChanged(auth, nextOrObserver, error, completed) {
        return getModularInstance(auth).onIdTokenChanged(nextOrObserver, error, completed);
    }
    /**
     * Adds a blocking callback that runs before an auth state change
     * sets a new user.
     *
     * @param auth - The {@link Auth} instance.
     * @param callback - callback triggered before new user value is set.
     *   If this throws, it blocks the user from being set.
     * @param onAbort - callback triggered if a later `beforeAuthStateChanged()`
     *   callback throws, allowing you to undo any side effects.
     */
    function beforeAuthStateChanged(auth, callback, onAbort) {
        return getModularInstance(auth).beforeAuthStateChanged(callback, onAbort);
    }

    const STORAGE_AVAILABLE_KEY = '__sak';

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // There are two different browser persistence types: local and session.
    // Both have the same implementation but use a different underlying storage
    // object.
    class BrowserPersistenceClass {
        constructor(storageRetriever, type) {
            this.storageRetriever = storageRetriever;
            this.type = type;
        }
        _isAvailable() {
            try {
                if (!this.storage) {
                    return Promise.resolve(false);
                }
                this.storage.setItem(STORAGE_AVAILABLE_KEY, '1');
                this.storage.removeItem(STORAGE_AVAILABLE_KEY);
                return Promise.resolve(true);
            }
            catch (_a) {
                return Promise.resolve(false);
            }
        }
        _set(key, value) {
            this.storage.setItem(key, JSON.stringify(value));
            return Promise.resolve();
        }
        _get(key) {
            const json = this.storage.getItem(key);
            return Promise.resolve(json ? JSON.parse(json) : null);
        }
        _remove(key) {
            this.storage.removeItem(key);
            return Promise.resolve();
        }
        get storage() {
            return this.storageRetriever();
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // The polling period in case events are not supported
    const _POLLING_INTERVAL_MS$1 = 1000;
    // The IE 10 localStorage cross tab synchronization delay in milliseconds
    const IE10_LOCAL_STORAGE_SYNC_DELAY = 10;
    class BrowserLocalPersistence extends BrowserPersistenceClass {
        constructor() {
            super(() => window.localStorage, "LOCAL" /* PersistenceType.LOCAL */);
            this.boundEventHandler = (event, poll) => this.onStorageEvent(event, poll);
            this.listeners = {};
            this.localCache = {};
            // setTimeout return value is platform specific
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.pollTimer = null;
            // Whether to use polling instead of depending on window events
            this.fallbackToPolling = _isMobileBrowser();
            this._shouldAllowMigration = true;
        }
        forAllChangedKeys(cb) {
            // Check all keys with listeners on them.
            for (const key of Object.keys(this.listeners)) {
                // Get value from localStorage.
                const newValue = this.storage.getItem(key);
                const oldValue = this.localCache[key];
                // If local map value does not match, trigger listener with storage event.
                // Differentiate this simulated event from the real storage event.
                if (newValue !== oldValue) {
                    cb(key, oldValue, newValue);
                }
            }
        }
        onStorageEvent(event, poll = false) {
            // Key would be null in some situations, like when localStorage is cleared
            if (!event.key) {
                this.forAllChangedKeys((key, _oldValue, newValue) => {
                    this.notifyListeners(key, newValue);
                });
                return;
            }
            const key = event.key;
            // Check the mechanism how this event was detected.
            // The first event will dictate the mechanism to be used.
            if (poll) {
                // Environment detects storage changes via polling.
                // Remove storage event listener to prevent possible event duplication.
                this.detachListener();
            }
            else {
                // Environment detects storage changes via storage event listener.
                // Remove polling listener to prevent possible event duplication.
                this.stopPolling();
            }
            const triggerListeners = () => {
                // Keep local map up to date in case storage event is triggered before
                // poll.
                const storedValue = this.storage.getItem(key);
                if (!poll && this.localCache[key] === storedValue) {
                    // Real storage event which has already been detected, do nothing.
                    // This seems to trigger in some IE browsers for some reason.
                    return;
                }
                this.notifyListeners(key, storedValue);
            };
            const storedValue = this.storage.getItem(key);
            if (_isIE10() &&
                storedValue !== event.newValue &&
                event.newValue !== event.oldValue) {
                // IE 10 has this weird bug where a storage event would trigger with the
                // correct key, oldValue and newValue but localStorage.getItem(key) does
                // not yield the updated value until a few milliseconds. This ensures
                // this recovers from that situation.
                setTimeout(triggerListeners, IE10_LOCAL_STORAGE_SYNC_DELAY);
            }
            else {
                triggerListeners();
            }
        }
        notifyListeners(key, value) {
            this.localCache[key] = value;
            const listeners = this.listeners[key];
            if (listeners) {
                for (const listener of Array.from(listeners)) {
                    listener(value ? JSON.parse(value) : value);
                }
            }
        }
        startPolling() {
            this.stopPolling();
            this.pollTimer = setInterval(() => {
                this.forAllChangedKeys((key, oldValue, newValue) => {
                    this.onStorageEvent(new StorageEvent('storage', {
                        key,
                        oldValue,
                        newValue
                    }), 
                    /* poll */ true);
                });
            }, _POLLING_INTERVAL_MS$1);
        }
        stopPolling() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        }
        attachListener() {
            window.addEventListener('storage', this.boundEventHandler);
        }
        detachListener() {
            window.removeEventListener('storage', this.boundEventHandler);
        }
        _addListener(key, listener) {
            if (Object.keys(this.listeners).length === 0) {
                // Whether browser can detect storage event when it had already been pushed to the background.
                // This may happen in some mobile browsers. A localStorage change in the foreground window
                // will not be detected in the background window via the storage event.
                // This was detected in iOS 7.x mobile browsers
                if (this.fallbackToPolling) {
                    this.startPolling();
                }
                else {
                    this.attachListener();
                }
            }
            if (!this.listeners[key]) {
                this.listeners[key] = new Set();
                // Populate the cache to avoid spuriously triggering on first poll.
                this.localCache[key] = this.storage.getItem(key);
            }
            this.listeners[key].add(listener);
        }
        _removeListener(key, listener) {
            if (this.listeners[key]) {
                this.listeners[key].delete(listener);
                if (this.listeners[key].size === 0) {
                    delete this.listeners[key];
                }
            }
            if (Object.keys(this.listeners).length === 0) {
                this.detachListener();
                this.stopPolling();
            }
        }
        // Update local cache on base operations:
        async _set(key, value) {
            await super._set(key, value);
            this.localCache[key] = JSON.stringify(value);
        }
        async _get(key) {
            const value = await super._get(key);
            this.localCache[key] = JSON.stringify(value);
            return value;
        }
        async _remove(key) {
            await super._remove(key);
            delete this.localCache[key];
        }
    }
    BrowserLocalPersistence.type = 'LOCAL';
    /**
     * An implementation of {@link Persistence} of type `LOCAL` using `localStorage`
     * for the underlying storage.
     *
     * @public
     */
    const browserLocalPersistence = BrowserLocalPersistence;

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class BrowserSessionPersistence extends BrowserPersistenceClass {
        constructor() {
            super(() => window.sessionStorage, "SESSION" /* PersistenceType.SESSION */);
        }
        _addListener(_key, _listener) {
            // Listeners are not supported for session storage since it cannot be shared across windows
            return;
        }
        _removeListener(_key, _listener) {
            // Listeners are not supported for session storage since it cannot be shared across windows
            return;
        }
    }
    BrowserSessionPersistence.type = 'SESSION';
    /**
     * An implementation of {@link Persistence} of `SESSION` using `sessionStorage`
     * for the underlying storage.
     *
     * @public
     */
    const browserSessionPersistence = BrowserSessionPersistence;

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Shim for Promise.allSettled, note the slightly different format of `fulfilled` vs `status`.
     *
     * @param promises - Array of promises to wait on.
     */
    function _allSettled(promises) {
        return Promise.all(promises.map(async (promise) => {
            try {
                const value = await promise;
                return {
                    fulfilled: true,
                    value
                };
            }
            catch (reason) {
                return {
                    fulfilled: false,
                    reason
                };
            }
        }));
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Interface class for receiving messages.
     *
     */
    class Receiver {
        constructor(eventTarget) {
            this.eventTarget = eventTarget;
            this.handlersMap = {};
            this.boundEventHandler = this.handleEvent.bind(this);
        }
        /**
         * Obtain an instance of a Receiver for a given event target, if none exists it will be created.
         *
         * @param eventTarget - An event target (such as window or self) through which the underlying
         * messages will be received.
         */
        static _getInstance(eventTarget) {
            // The results are stored in an array since objects can't be keys for other
            // objects. In addition, setting a unique property on an event target as a
            // hash map key may not be allowed due to CORS restrictions.
            const existingInstance = this.receivers.find(receiver => receiver.isListeningto(eventTarget));
            if (existingInstance) {
                return existingInstance;
            }
            const newInstance = new Receiver(eventTarget);
            this.receivers.push(newInstance);
            return newInstance;
        }
        isListeningto(eventTarget) {
            return this.eventTarget === eventTarget;
        }
        /**
         * Fans out a MessageEvent to the appropriate listeners.
         *
         * @remarks
         * Sends an {@link Status.ACK} upon receipt and a {@link Status.DONE} once all handlers have
         * finished processing.
         *
         * @param event - The MessageEvent.
         *
         */
        async handleEvent(event) {
            const messageEvent = event;
            const { eventId, eventType, data } = messageEvent.data;
            const handlers = this.handlersMap[eventType];
            if (!(handlers === null || handlers === void 0 ? void 0 : handlers.size)) {
                return;
            }
            messageEvent.ports[0].postMessage({
                status: "ack" /* _Status.ACK */,
                eventId,
                eventType
            });
            const promises = Array.from(handlers).map(async (handler) => handler(messageEvent.origin, data));
            const response = await _allSettled(promises);
            messageEvent.ports[0].postMessage({
                status: "done" /* _Status.DONE */,
                eventId,
                eventType,
                response
            });
        }
        /**
         * Subscribe an event handler for a particular event.
         *
         * @param eventType - Event name to subscribe to.
         * @param eventHandler - The event handler which should receive the events.
         *
         */
        _subscribe(eventType, eventHandler) {
            if (Object.keys(this.handlersMap).length === 0) {
                this.eventTarget.addEventListener('message', this.boundEventHandler);
            }
            if (!this.handlersMap[eventType]) {
                this.handlersMap[eventType] = new Set();
            }
            this.handlersMap[eventType].add(eventHandler);
        }
        /**
         * Unsubscribe an event handler from a particular event.
         *
         * @param eventType - Event name to unsubscribe from.
         * @param eventHandler - Optional event handler, if none provided, unsubscribe all handlers on this event.
         *
         */
        _unsubscribe(eventType, eventHandler) {
            if (this.handlersMap[eventType] && eventHandler) {
                this.handlersMap[eventType].delete(eventHandler);
            }
            if (!eventHandler || this.handlersMap[eventType].size === 0) {
                delete this.handlersMap[eventType];
            }
            if (Object.keys(this.handlersMap).length === 0) {
                this.eventTarget.removeEventListener('message', this.boundEventHandler);
            }
        }
    }
    Receiver.receivers = [];

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function _generateEventId(prefix = '', digits = 10) {
        let random = '';
        for (let i = 0; i < digits; i++) {
            random += Math.floor(Math.random() * 10);
        }
        return prefix + random;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Interface for sending messages and waiting for a completion response.
     *
     */
    class Sender {
        constructor(target) {
            this.target = target;
            this.handlers = new Set();
        }
        /**
         * Unsubscribe the handler and remove it from our tracking Set.
         *
         * @param handler - The handler to unsubscribe.
         */
        removeMessageHandler(handler) {
            if (handler.messageChannel) {
                handler.messageChannel.port1.removeEventListener('message', handler.onMessage);
                handler.messageChannel.port1.close();
            }
            this.handlers.delete(handler);
        }
        /**
         * Send a message to the Receiver located at {@link target}.
         *
         * @remarks
         * We'll first wait a bit for an ACK , if we get one we will wait significantly longer until the
         * receiver has had a chance to fully process the event.
         *
         * @param eventType - Type of event to send.
         * @param data - The payload of the event.
         * @param timeout - Timeout for waiting on an ACK from the receiver.
         *
         * @returns An array of settled promises from all the handlers that were listening on the receiver.
         */
        async _send(eventType, data, timeout = 50 /* _TimeoutDuration.ACK */) {
            const messageChannel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
            if (!messageChannel) {
                throw new Error("connection_unavailable" /* _MessageError.CONNECTION_UNAVAILABLE */);
            }
            // Node timers and browser timers return fundamentally different types.
            // We don't actually care what the value is but TS won't accept unknown and
            // we can't cast properly in both environments.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let completionTimer;
            let handler;
            return new Promise((resolve, reject) => {
                const eventId = _generateEventId('', 20);
                messageChannel.port1.start();
                const ackTimer = setTimeout(() => {
                    reject(new Error("unsupported_event" /* _MessageError.UNSUPPORTED_EVENT */));
                }, timeout);
                handler = {
                    messageChannel,
                    onMessage(event) {
                        const messageEvent = event;
                        if (messageEvent.data.eventId !== eventId) {
                            return;
                        }
                        switch (messageEvent.data.status) {
                            case "ack" /* _Status.ACK */:
                                // The receiver should ACK first.
                                clearTimeout(ackTimer);
                                completionTimer = setTimeout(() => {
                                    reject(new Error("timeout" /* _MessageError.TIMEOUT */));
                                }, 3000 /* _TimeoutDuration.COMPLETION */);
                                break;
                            case "done" /* _Status.DONE */:
                                // Once the receiver's handlers are finished we will get the results.
                                clearTimeout(completionTimer);
                                resolve(messageEvent.data.response);
                                break;
                            default:
                                clearTimeout(ackTimer);
                                clearTimeout(completionTimer);
                                reject(new Error("invalid_response" /* _MessageError.INVALID_RESPONSE */));
                                break;
                        }
                    }
                };
                this.handlers.add(handler);
                messageChannel.port1.addEventListener('message', handler.onMessage);
                this.target.postMessage({
                    eventType,
                    eventId,
                    data
                }, [messageChannel.port2]);
            }).finally(() => {
                if (handler) {
                    this.removeMessageHandler(handler);
                }
            });
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Lazy accessor for window, since the compat layer won't tree shake this out,
     * we need to make sure not to mess with window unless we have to
     */
    function _window() {
        return window;
    }
    function _setWindowLocation(url) {
        _window().location.href = url;
    }

    /**
     * @license
     * Copyright 2020 Google LLC.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function _isWorker() {
        return (typeof _window()['WorkerGlobalScope'] !== 'undefined' &&
            typeof _window()['importScripts'] === 'function');
    }
    async function _getActiveServiceWorker() {
        if (!(navigator === null || navigator === void 0 ? void 0 : navigator.serviceWorker)) {
            return null;
        }
        try {
            const registration = await navigator.serviceWorker.ready;
            return registration.active;
        }
        catch (_a) {
            return null;
        }
    }
    function _getServiceWorkerController() {
        var _a;
        return ((_a = navigator === null || navigator === void 0 ? void 0 : navigator.serviceWorker) === null || _a === void 0 ? void 0 : _a.controller) || null;
    }
    function _getWorkerGlobalScope() {
        return _isWorker() ? self : null;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DB_NAME = 'firebaseLocalStorageDb';
    const DB_VERSION = 1;
    const DB_OBJECTSTORE_NAME = 'firebaseLocalStorage';
    const DB_DATA_KEYPATH = 'fbase_key';
    /**
     * Promise wrapper for IDBRequest
     *
     * Unfortunately we can't cleanly extend Promise<T> since promises are not callable in ES6
     *
     */
    class DBPromise {
        constructor(request) {
            this.request = request;
        }
        toPromise() {
            return new Promise((resolve, reject) => {
                this.request.addEventListener('success', () => {
                    resolve(this.request.result);
                });
                this.request.addEventListener('error', () => {
                    reject(this.request.error);
                });
            });
        }
    }
    function getObjectStore(db, isReadWrite) {
        return db
            .transaction([DB_OBJECTSTORE_NAME], isReadWrite ? 'readwrite' : 'readonly')
            .objectStore(DB_OBJECTSTORE_NAME);
    }
    function _deleteDatabase() {
        const request = indexedDB.deleteDatabase(DB_NAME);
        return new DBPromise(request).toPromise();
    }
    function _openDatabase() {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        return new Promise((resolve, reject) => {
            request.addEventListener('error', () => {
                reject(request.error);
            });
            request.addEventListener('upgradeneeded', () => {
                const db = request.result;
                try {
                    db.createObjectStore(DB_OBJECTSTORE_NAME, { keyPath: DB_DATA_KEYPATH });
                }
                catch (e) {
                    reject(e);
                }
            });
            request.addEventListener('success', async () => {
                const db = request.result;
                // Strange bug that occurs in Firefox when multiple tabs are opened at the
                // same time. The only way to recover seems to be deleting the database
                // and re-initializing it.
                // https://github.com/firebase/firebase-js-sdk/issues/634
                if (!db.objectStoreNames.contains(DB_OBJECTSTORE_NAME)) {
                    // Need to close the database or else you get a `blocked` event
                    db.close();
                    await _deleteDatabase();
                    resolve(await _openDatabase());
                }
                else {
                    resolve(db);
                }
            });
        });
    }
    async function _putObject(db, key, value) {
        const request = getObjectStore(db, true).put({
            [DB_DATA_KEYPATH]: key,
            value
        });
        return new DBPromise(request).toPromise();
    }
    async function getObject(db, key) {
        const request = getObjectStore(db, false).get(key);
        const data = await new DBPromise(request).toPromise();
        return data === undefined ? null : data.value;
    }
    function _deleteObject(db, key) {
        const request = getObjectStore(db, true).delete(key);
        return new DBPromise(request).toPromise();
    }
    const _POLLING_INTERVAL_MS = 800;
    const _TRANSACTION_RETRY_COUNT = 3;
    class IndexedDBLocalPersistence {
        constructor() {
            this.type = "LOCAL" /* PersistenceType.LOCAL */;
            this._shouldAllowMigration = true;
            this.listeners = {};
            this.localCache = {};
            // setTimeout return value is platform specific
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.pollTimer = null;
            this.pendingWrites = 0;
            this.receiver = null;
            this.sender = null;
            this.serviceWorkerReceiverAvailable = false;
            this.activeServiceWorker = null;
            // Fire & forget the service worker registration as it may never resolve
            this._workerInitializationPromise =
                this.initializeServiceWorkerMessaging().then(() => { }, () => { });
        }
        async _openDb() {
            if (this.db) {
                return this.db;
            }
            this.db = await _openDatabase();
            return this.db;
        }
        async _withRetries(op) {
            let numAttempts = 0;
            while (true) {
                try {
                    const db = await this._openDb();
                    return await op(db);
                }
                catch (e) {
                    if (numAttempts++ > _TRANSACTION_RETRY_COUNT) {
                        throw e;
                    }
                    if (this.db) {
                        this.db.close();
                        this.db = undefined;
                    }
                    // TODO: consider adding exponential backoff
                }
            }
        }
        /**
         * IndexedDB events do not propagate from the main window to the worker context.  We rely on a
         * postMessage interface to send these events to the worker ourselves.
         */
        async initializeServiceWorkerMessaging() {
            return _isWorker() ? this.initializeReceiver() : this.initializeSender();
        }
        /**
         * As the worker we should listen to events from the main window.
         */
        async initializeReceiver() {
            this.receiver = Receiver._getInstance(_getWorkerGlobalScope());
            // Refresh from persistence if we receive a KeyChanged message.
            this.receiver._subscribe("keyChanged" /* _EventType.KEY_CHANGED */, async (_origin, data) => {
                const keys = await this._poll();
                return {
                    keyProcessed: keys.includes(data.key)
                };
            });
            // Let the sender know that we are listening so they give us more timeout.
            this.receiver._subscribe("ping" /* _EventType.PING */, async (_origin, _data) => {
                return ["keyChanged" /* _EventType.KEY_CHANGED */];
            });
        }
        /**
         * As the main window, we should let the worker know when keys change (set and remove).
         *
         * @remarks
         * {@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/ready | ServiceWorkerContainer.ready}
         * may not resolve.
         */
        async initializeSender() {
            var _a, _b;
            // Check to see if there's an active service worker.
            this.activeServiceWorker = await _getActiveServiceWorker();
            if (!this.activeServiceWorker) {
                return;
            }
            this.sender = new Sender(this.activeServiceWorker);
            // Ping the service worker to check what events they can handle.
            const results = await this.sender._send("ping" /* _EventType.PING */, {}, 800 /* _TimeoutDuration.LONG_ACK */);
            if (!results) {
                return;
            }
            if (((_a = results[0]) === null || _a === void 0 ? void 0 : _a.fulfilled) &&
                ((_b = results[0]) === null || _b === void 0 ? void 0 : _b.value.includes("keyChanged" /* _EventType.KEY_CHANGED */))) {
                this.serviceWorkerReceiverAvailable = true;
            }
        }
        /**
         * Let the worker know about a changed key, the exact key doesn't technically matter since the
         * worker will just trigger a full sync anyway.
         *
         * @remarks
         * For now, we only support one service worker per page.
         *
         * @param key - Storage key which changed.
         */
        async notifyServiceWorker(key) {
            if (!this.sender ||
                !this.activeServiceWorker ||
                _getServiceWorkerController() !== this.activeServiceWorker) {
                return;
            }
            try {
                await this.sender._send("keyChanged" /* _EventType.KEY_CHANGED */, { key }, 
                // Use long timeout if receiver has previously responded to a ping from us.
                this.serviceWorkerReceiverAvailable
                    ? 800 /* _TimeoutDuration.LONG_ACK */
                    : 50 /* _TimeoutDuration.ACK */);
            }
            catch (_a) {
                // This is a best effort approach. Ignore errors.
            }
        }
        async _isAvailable() {
            try {
                if (!indexedDB) {
                    return false;
                }
                const db = await _openDatabase();
                await _putObject(db, STORAGE_AVAILABLE_KEY, '1');
                await _deleteObject(db, STORAGE_AVAILABLE_KEY);
                return true;
            }
            catch (_a) { }
            return false;
        }
        async _withPendingWrite(write) {
            this.pendingWrites++;
            try {
                await write();
            }
            finally {
                this.pendingWrites--;
            }
        }
        async _set(key, value) {
            return this._withPendingWrite(async () => {
                await this._withRetries((db) => _putObject(db, key, value));
                this.localCache[key] = value;
                return this.notifyServiceWorker(key);
            });
        }
        async _get(key) {
            const obj = (await this._withRetries((db) => getObject(db, key)));
            this.localCache[key] = obj;
            return obj;
        }
        async _remove(key) {
            return this._withPendingWrite(async () => {
                await this._withRetries((db) => _deleteObject(db, key));
                delete this.localCache[key];
                return this.notifyServiceWorker(key);
            });
        }
        async _poll() {
            // TODO: check if we need to fallback if getAll is not supported
            const result = await this._withRetries((db) => {
                const getAllRequest = getObjectStore(db, false).getAll();
                return new DBPromise(getAllRequest).toPromise();
            });
            if (!result) {
                return [];
            }
            // If we have pending writes in progress abort, we'll get picked up on the next poll
            if (this.pendingWrites !== 0) {
                return [];
            }
            const keys = [];
            const keysInResult = new Set();
            if (result.length !== 0) {
                for (const { fbase_key: key, value } of result) {
                    keysInResult.add(key);
                    if (JSON.stringify(this.localCache[key]) !== JSON.stringify(value)) {
                        this.notifyListeners(key, value);
                        keys.push(key);
                    }
                }
            }
            for (const localKey of Object.keys(this.localCache)) {
                if (this.localCache[localKey] && !keysInResult.has(localKey)) {
                    // Deleted
                    this.notifyListeners(localKey, null);
                    keys.push(localKey);
                }
            }
            return keys;
        }
        notifyListeners(key, newValue) {
            this.localCache[key] = newValue;
            const listeners = this.listeners[key];
            if (listeners) {
                for (const listener of Array.from(listeners)) {
                    listener(newValue);
                }
            }
        }
        startPolling() {
            this.stopPolling();
            this.pollTimer = setInterval(async () => this._poll(), _POLLING_INTERVAL_MS);
        }
        stopPolling() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        }
        _addListener(key, listener) {
            if (Object.keys(this.listeners).length === 0) {
                this.startPolling();
            }
            if (!this.listeners[key]) {
                this.listeners[key] = new Set();
                // Populate the cache to avoid spuriously triggering on first poll.
                void this._get(key); // This can happen in the background async and we can return immediately.
            }
            this.listeners[key].add(listener);
        }
        _removeListener(key, listener) {
            if (this.listeners[key]) {
                this.listeners[key].delete(listener);
                if (this.listeners[key].size === 0) {
                    delete this.listeners[key];
                }
            }
            if (Object.keys(this.listeners).length === 0) {
                this.stopPolling();
            }
        }
    }
    IndexedDBLocalPersistence.type = 'LOCAL';
    /**
     * An implementation of {@link Persistence} of type `LOCAL` using `indexedDB`
     * for the underlying storage.
     *
     * @public
     */
    const indexedDBLocalPersistence = IndexedDBLocalPersistence;
    new Delay(30000, 60000);

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Chooses a popup/redirect resolver to use. This prefers the override (which
     * is directly passed in), and falls back to the property set on the auth
     * object. If neither are available, this function errors w/ an argument error.
     */
    function _withDefaultResolver(auth, resolverOverride) {
        if (resolverOverride) {
            return _getInstance(resolverOverride);
        }
        _assert(auth._popupRedirectResolver, auth, "argument-error" /* AuthErrorCode.ARGUMENT_ERROR */);
        return auth._popupRedirectResolver;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class IdpCredential extends AuthCredential {
        constructor(params) {
            super("custom" /* ProviderId.CUSTOM */, "custom" /* ProviderId.CUSTOM */);
            this.params = params;
        }
        _getIdTokenResponse(auth) {
            return signInWithIdp(auth, this._buildIdpRequest());
        }
        _linkToIdToken(auth, idToken) {
            return signInWithIdp(auth, this._buildIdpRequest(idToken));
        }
        _getReauthenticationResolver(auth) {
            return signInWithIdp(auth, this._buildIdpRequest());
        }
        _buildIdpRequest(idToken) {
            const request = {
                requestUri: this.params.requestUri,
                sessionId: this.params.sessionId,
                postBody: this.params.postBody,
                tenantId: this.params.tenantId,
                pendingToken: this.params.pendingToken,
                returnSecureToken: true,
                returnIdpCredential: true
            };
            if (idToken) {
                request.idToken = idToken;
            }
            return request;
        }
    }
    function _signIn(params) {
        return _signInWithCredential(params.auth, new IdpCredential(params), params.bypassAuthState);
    }
    function _reauth(params) {
        const { auth, user } = params;
        _assert(user, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        return _reauthenticate(user, new IdpCredential(params), params.bypassAuthState);
    }
    async function _link(params) {
        const { auth, user } = params;
        _assert(user, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        return _link$1(user, new IdpCredential(params), params.bypassAuthState);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Popup event manager. Handles the popup's entire lifecycle; listens to auth
     * events
     */
    class AbstractPopupRedirectOperation {
        constructor(auth, filter, resolver, user, bypassAuthState = false) {
            this.auth = auth;
            this.resolver = resolver;
            this.user = user;
            this.bypassAuthState = bypassAuthState;
            this.pendingPromise = null;
            this.eventManager = null;
            this.filter = Array.isArray(filter) ? filter : [filter];
        }
        execute() {
            return new Promise(async (resolve, reject) => {
                this.pendingPromise = { resolve, reject };
                try {
                    this.eventManager = await this.resolver._initialize(this.auth);
                    await this.onExecution();
                    this.eventManager.registerConsumer(this);
                }
                catch (e) {
                    this.reject(e);
                }
            });
        }
        async onAuthEvent(event) {
            const { urlResponse, sessionId, postBody, tenantId, error, type } = event;
            if (error) {
                this.reject(error);
                return;
            }
            const params = {
                auth: this.auth,
                requestUri: urlResponse,
                sessionId: sessionId,
                tenantId: tenantId || undefined,
                postBody: postBody || undefined,
                user: this.user,
                bypassAuthState: this.bypassAuthState
            };
            try {
                this.resolve(await this.getIdpTask(type)(params));
            }
            catch (e) {
                this.reject(e);
            }
        }
        onError(error) {
            this.reject(error);
        }
        getIdpTask(type) {
            switch (type) {
                case "signInViaPopup" /* AuthEventType.SIGN_IN_VIA_POPUP */:
                case "signInViaRedirect" /* AuthEventType.SIGN_IN_VIA_REDIRECT */:
                    return _signIn;
                case "linkViaPopup" /* AuthEventType.LINK_VIA_POPUP */:
                case "linkViaRedirect" /* AuthEventType.LINK_VIA_REDIRECT */:
                    return _link;
                case "reauthViaPopup" /* AuthEventType.REAUTH_VIA_POPUP */:
                case "reauthViaRedirect" /* AuthEventType.REAUTH_VIA_REDIRECT */:
                    return _reauth;
                default:
                    _fail(this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            }
        }
        resolve(cred) {
            debugAssert(this.pendingPromise, 'Pending promise was never set');
            this.pendingPromise.resolve(cred);
            this.unregisterAndCleanUp();
        }
        reject(error) {
            debugAssert(this.pendingPromise, 'Pending promise was never set');
            this.pendingPromise.reject(error);
            this.unregisterAndCleanUp();
        }
        unregisterAndCleanUp() {
            if (this.eventManager) {
                this.eventManager.unregisterConsumer(this);
            }
            this.pendingPromise = null;
            this.cleanUp();
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const _POLL_WINDOW_CLOSE_TIMEOUT = new Delay(2000, 10000);
    /**
     * Popup event manager. Handles the popup's entire lifecycle; listens to auth
     * events
     *
     */
    class PopupOperation extends AbstractPopupRedirectOperation {
        constructor(auth, filter, provider, resolver, user) {
            super(auth, filter, resolver, user);
            this.provider = provider;
            this.authWindow = null;
            this.pollId = null;
            if (PopupOperation.currentPopupAction) {
                PopupOperation.currentPopupAction.cancel();
            }
            PopupOperation.currentPopupAction = this;
        }
        async executeNotNull() {
            const result = await this.execute();
            _assert(result, this.auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            return result;
        }
        async onExecution() {
            debugAssert(this.filter.length === 1, 'Popup operations only handle one event');
            const eventId = _generateEventId();
            this.authWindow = await this.resolver._openPopup(this.auth, this.provider, this.filter[0], // There's always one, see constructor
            eventId);
            this.authWindow.associatedEvent = eventId;
            // Check for web storage support and origin validation _after_ the popup is
            // loaded. These operations are slow (~1 second or so) Rather than
            // waiting on them before opening the window, optimistically open the popup
            // and check for storage support at the same time. If storage support is
            // not available, this will cause the whole thing to reject properly. It
            // will also close the popup, but since the promise has already rejected,
            // the popup closed by user poll will reject into the void.
            this.resolver._originValidation(this.auth).catch(e => {
                this.reject(e);
            });
            this.resolver._isIframeWebStorageSupported(this.auth, isSupported => {
                if (!isSupported) {
                    this.reject(_createError(this.auth, "web-storage-unsupported" /* AuthErrorCode.WEB_STORAGE_UNSUPPORTED */));
                }
            });
            // Handle user closure. Notice this does *not* use await
            this.pollUserCancellation();
        }
        get eventId() {
            var _a;
            return ((_a = this.authWindow) === null || _a === void 0 ? void 0 : _a.associatedEvent) || null;
        }
        cancel() {
            this.reject(_createError(this.auth, "cancelled-popup-request" /* AuthErrorCode.EXPIRED_POPUP_REQUEST */));
        }
        cleanUp() {
            if (this.authWindow) {
                this.authWindow.close();
            }
            if (this.pollId) {
                window.clearTimeout(this.pollId);
            }
            this.authWindow = null;
            this.pollId = null;
            PopupOperation.currentPopupAction = null;
        }
        pollUserCancellation() {
            const poll = () => {
                var _a, _b;
                if ((_b = (_a = this.authWindow) === null || _a === void 0 ? void 0 : _a.window) === null || _b === void 0 ? void 0 : _b.closed) {
                    // Make sure that there is sufficient time for whatever action to
                    // complete. The window could have closed but the sign in network
                    // call could still be in flight. This is specifically true for
                    // Firefox or if the opener is in an iframe, in which case the oauth
                    // helper closes the popup.
                    this.pollId = window.setTimeout(() => {
                        this.pollId = null;
                        this.reject(_createError(this.auth, "popup-closed-by-user" /* AuthErrorCode.POPUP_CLOSED_BY_USER */));
                    }, 8000 /* _Timeout.AUTH_EVENT */);
                    return;
                }
                this.pollId = window.setTimeout(poll, _POLL_WINDOW_CLOSE_TIMEOUT.get());
            };
            poll();
        }
    }
    // Only one popup is ever shown at once. The lifecycle of the current popup
    // can be managed / cancelled by the constructor.
    PopupOperation.currentPopupAction = null;

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const PENDING_REDIRECT_KEY = 'pendingRedirect';
    // We only get one redirect outcome for any one auth, so just store it
    // in here.
    const redirectOutcomeMap = new Map();
    class RedirectAction extends AbstractPopupRedirectOperation {
        constructor(auth, resolver, bypassAuthState = false) {
            super(auth, [
                "signInViaRedirect" /* AuthEventType.SIGN_IN_VIA_REDIRECT */,
                "linkViaRedirect" /* AuthEventType.LINK_VIA_REDIRECT */,
                "reauthViaRedirect" /* AuthEventType.REAUTH_VIA_REDIRECT */,
                "unknown" /* AuthEventType.UNKNOWN */
            ], resolver, undefined, bypassAuthState);
            this.eventId = null;
        }
        /**
         * Override the execute function; if we already have a redirect result, then
         * just return it.
         */
        async execute() {
            let readyOutcome = redirectOutcomeMap.get(this.auth._key());
            if (!readyOutcome) {
                try {
                    const hasPendingRedirect = await _getAndClearPendingRedirectStatus(this.resolver, this.auth);
                    const result = hasPendingRedirect ? await super.execute() : null;
                    readyOutcome = () => Promise.resolve(result);
                }
                catch (e) {
                    readyOutcome = () => Promise.reject(e);
                }
                redirectOutcomeMap.set(this.auth._key(), readyOutcome);
            }
            // If we're not bypassing auth state, the ready outcome should be set to
            // null.
            if (!this.bypassAuthState) {
                redirectOutcomeMap.set(this.auth._key(), () => Promise.resolve(null));
            }
            return readyOutcome();
        }
        async onAuthEvent(event) {
            if (event.type === "signInViaRedirect" /* AuthEventType.SIGN_IN_VIA_REDIRECT */) {
                return super.onAuthEvent(event);
            }
            else if (event.type === "unknown" /* AuthEventType.UNKNOWN */) {
                // This is a sentinel value indicating there's no pending redirect
                this.resolve(null);
                return;
            }
            if (event.eventId) {
                const user = await this.auth._redirectUserForId(event.eventId);
                if (user) {
                    this.user = user;
                    return super.onAuthEvent(event);
                }
                else {
                    this.resolve(null);
                }
            }
        }
        async onExecution() { }
        cleanUp() { }
    }
    async function _getAndClearPendingRedirectStatus(resolver, auth) {
        const key = pendingRedirectKey(auth);
        const persistence = resolverPersistence(resolver);
        if (!(await persistence._isAvailable())) {
            return false;
        }
        const hasPendingRedirect = (await persistence._get(key)) === 'true';
        await persistence._remove(key);
        return hasPendingRedirect;
    }
    function _overrideRedirectResult(auth, result) {
        redirectOutcomeMap.set(auth._key(), result);
    }
    function resolverPersistence(resolver) {
        return _getInstance(resolver._redirectPersistence);
    }
    function pendingRedirectKey(auth) {
        return _persistenceKeyName(PENDING_REDIRECT_KEY, auth.config.apiKey, auth.name);
    }
    async function _getRedirectResult(auth, resolverExtern, bypassAuthState = false) {
        if (_isFirebaseServerApp(auth.app)) {
            return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(auth));
        }
        const authInternal = _castAuth(auth);
        const resolver = _withDefaultResolver(authInternal, resolverExtern);
        const action = new RedirectAction(authInternal, resolver, bypassAuthState);
        const result = await action.execute();
        if (result && !bypassAuthState) {
            delete result.user._redirectEventId;
            await authInternal._persistUserIfCurrent(result.user);
            await authInternal._setRedirectUser(null, resolverExtern);
        }
        return result;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // The amount of time to store the UIDs of seen events; this is
    // set to 10 min by default
    const EVENT_DUPLICATION_CACHE_DURATION_MS = 10 * 60 * 1000;
    class AuthEventManager {
        constructor(auth) {
            this.auth = auth;
            this.cachedEventUids = new Set();
            this.consumers = new Set();
            this.queuedRedirectEvent = null;
            this.hasHandledPotentialRedirect = false;
            this.lastProcessedEventTime = Date.now();
        }
        registerConsumer(authEventConsumer) {
            this.consumers.add(authEventConsumer);
            if (this.queuedRedirectEvent &&
                this.isEventForConsumer(this.queuedRedirectEvent, authEventConsumer)) {
                this.sendToConsumer(this.queuedRedirectEvent, authEventConsumer);
                this.saveEventToCache(this.queuedRedirectEvent);
                this.queuedRedirectEvent = null;
            }
        }
        unregisterConsumer(authEventConsumer) {
            this.consumers.delete(authEventConsumer);
        }
        onEvent(event) {
            // Check if the event has already been handled
            if (this.hasEventBeenHandled(event)) {
                return false;
            }
            let handled = false;
            this.consumers.forEach(consumer => {
                if (this.isEventForConsumer(event, consumer)) {
                    handled = true;
                    this.sendToConsumer(event, consumer);
                    this.saveEventToCache(event);
                }
            });
            if (this.hasHandledPotentialRedirect || !isRedirectEvent(event)) {
                // If we've already seen a redirect before, or this is a popup event,
                // bail now
                return handled;
            }
            this.hasHandledPotentialRedirect = true;
            // If the redirect wasn't handled, hang on to it
            if (!handled) {
                this.queuedRedirectEvent = event;
                handled = true;
            }
            return handled;
        }
        sendToConsumer(event, consumer) {
            var _a;
            if (event.error && !isNullRedirectEvent(event)) {
                const code = ((_a = event.error.code) === null || _a === void 0 ? void 0 : _a.split('auth/')[1]) ||
                    "internal-error" /* AuthErrorCode.INTERNAL_ERROR */;
                consumer.onError(_createError(this.auth, code));
            }
            else {
                consumer.onAuthEvent(event);
            }
        }
        isEventForConsumer(event, consumer) {
            const eventIdMatches = consumer.eventId === null ||
                (!!event.eventId && event.eventId === consumer.eventId);
            return consumer.filter.includes(event.type) && eventIdMatches;
        }
        hasEventBeenHandled(event) {
            if (Date.now() - this.lastProcessedEventTime >=
                EVENT_DUPLICATION_CACHE_DURATION_MS) {
                this.cachedEventUids.clear();
            }
            return this.cachedEventUids.has(eventUid(event));
        }
        saveEventToCache(event) {
            this.cachedEventUids.add(eventUid(event));
            this.lastProcessedEventTime = Date.now();
        }
    }
    function eventUid(e) {
        return [e.type, e.eventId, e.sessionId, e.tenantId].filter(v => v).join('-');
    }
    function isNullRedirectEvent({ type, error }) {
        return (type === "unknown" /* AuthEventType.UNKNOWN */ &&
            (error === null || error === void 0 ? void 0 : error.code) === `auth/${"no-auth-event" /* AuthErrorCode.NO_AUTH_EVENT */}`);
    }
    function isRedirectEvent(event) {
        switch (event.type) {
            case "signInViaRedirect" /* AuthEventType.SIGN_IN_VIA_REDIRECT */:
            case "linkViaRedirect" /* AuthEventType.LINK_VIA_REDIRECT */:
            case "reauthViaRedirect" /* AuthEventType.REAUTH_VIA_REDIRECT */:
                return true;
            case "unknown" /* AuthEventType.UNKNOWN */:
                return isNullRedirectEvent(event);
            default:
                return false;
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function _getProjectConfig(auth, request = {}) {
        return _performApiRequest(auth, "GET" /* HttpMethod.GET */, "/v1/projects" /* Endpoint.GET_PROJECT_CONFIG */, request);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const IP_ADDRESS_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    const HTTP_REGEX = /^https?/;
    async function _validateOrigin(auth) {
        // Skip origin validation if we are in an emulated environment
        if (auth.config.emulator) {
            return;
        }
        const { authorizedDomains } = await _getProjectConfig(auth);
        for (const domain of authorizedDomains) {
            try {
                if (matchDomain(domain)) {
                    return;
                }
            }
            catch (_a) {
                // Do nothing if there's a URL error; just continue searching
            }
        }
        // In the old SDK, this error also provides helpful messages.
        _fail(auth, "unauthorized-domain" /* AuthErrorCode.INVALID_ORIGIN */);
    }
    function matchDomain(expected) {
        const currentUrl = _getCurrentUrl();
        const { protocol, hostname } = new URL(currentUrl);
        if (expected.startsWith('chrome-extension://')) {
            const ceUrl = new URL(expected);
            if (ceUrl.hostname === '' && hostname === '') {
                // For some reason we're not parsing chrome URLs properly
                return (protocol === 'chrome-extension:' &&
                    expected.replace('chrome-extension://', '') ===
                        currentUrl.replace('chrome-extension://', ''));
            }
            return protocol === 'chrome-extension:' && ceUrl.hostname === hostname;
        }
        if (!HTTP_REGEX.test(protocol)) {
            return false;
        }
        if (IP_ADDRESS_REGEX.test(expected)) {
            // The domain has to be exactly equal to the pattern, as an IP domain will
            // only contain the IP, no extra character.
            return hostname === expected;
        }
        // Dots in pattern should be escaped.
        const escapedDomainPattern = expected.replace(/\./g, '\\.');
        // Non ip address domains.
        // domain.com = *.domain.com OR domain.com
        const re = new RegExp('^(.+\\.' + escapedDomainPattern + '|' + escapedDomainPattern + ')$', 'i');
        return re.test(hostname);
    }

    /**
     * @license
     * Copyright 2020 Google LLC.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const NETWORK_TIMEOUT = new Delay(30000, 60000);
    /**
     * Reset unloaded GApi modules. If gapi.load fails due to a network error,
     * it will stop working after a retrial. This is a hack to fix this issue.
     */
    function resetUnloadedGapiModules() {
        // Clear last failed gapi.load state to force next gapi.load to first
        // load the failed gapi.iframes module.
        // Get gapix.beacon context.
        const beacon = _window().___jsl;
        // Get current hint.
        if (beacon === null || beacon === void 0 ? void 0 : beacon.H) {
            // Get gapi hint.
            for (const hint of Object.keys(beacon.H)) {
                // Requested modules.
                beacon.H[hint].r = beacon.H[hint].r || [];
                // Loaded modules.
                beacon.H[hint].L = beacon.H[hint].L || [];
                // Set requested modules to a copy of the loaded modules.
                beacon.H[hint].r = [...beacon.H[hint].L];
                // Clear pending callbacks.
                if (beacon.CP) {
                    for (let i = 0; i < beacon.CP.length; i++) {
                        // Remove all failed pending callbacks.
                        beacon.CP[i] = null;
                    }
                }
            }
        }
    }
    function loadGapi(auth) {
        return new Promise((resolve, reject) => {
            var _a, _b, _c;
            // Function to run when gapi.load is ready.
            function loadGapiIframe() {
                // The developer may have tried to previously run gapi.load and failed.
                // Run this to fix that.
                resetUnloadedGapiModules();
                gapi.load('gapi.iframes', {
                    callback: () => {
                        resolve(gapi.iframes.getContext());
                    },
                    ontimeout: () => {
                        // The above reset may be sufficient, but having this reset after
                        // failure ensures that if the developer calls gapi.load after the
                        // connection is re-established and before another attempt to embed
                        // the iframe, it would work and would not be broken because of our
                        // failed attempt.
                        // Timeout when gapi.iframes.Iframe not loaded.
                        resetUnloadedGapiModules();
                        reject(_createError(auth, "network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */));
                    },
                    timeout: NETWORK_TIMEOUT.get()
                });
            }
            if ((_b = (_a = _window().gapi) === null || _a === void 0 ? void 0 : _a.iframes) === null || _b === void 0 ? void 0 : _b.Iframe) {
                // If gapi.iframes.Iframe available, resolve.
                resolve(gapi.iframes.getContext());
            }
            else if (!!((_c = _window().gapi) === null || _c === void 0 ? void 0 : _c.load)) {
                // Gapi loader ready, load gapi.iframes.
                loadGapiIframe();
            }
            else {
                // Create a new iframe callback when this is called so as not to overwrite
                // any previous defined callback. This happens if this method is called
                // multiple times in parallel and could result in the later callback
                // overwriting the previous one. This would end up with a iframe
                // timeout.
                const cbName = _generateCallbackName('iframefcb');
                // GApi loader not available, dynamically load platform.js.
                _window()[cbName] = () => {
                    // GApi loader should be ready.
                    if (!!gapi.load) {
                        loadGapiIframe();
                    }
                    else {
                        // Gapi loader failed, throw error.
                        reject(_createError(auth, "network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */));
                    }
                };
                // Load GApi loader.
                return _loadJS(`${_gapiScriptUrl()}?onload=${cbName}`)
                    .catch(e => reject(e));
            }
        }).catch(error => {
            // Reset cached promise to allow for retrial.
            cachedGApiLoader = null;
            throw error;
        });
    }
    let cachedGApiLoader = null;
    function _loadGapi(auth) {
        cachedGApiLoader = cachedGApiLoader || loadGapi(auth);
        return cachedGApiLoader;
    }

    /**
     * @license
     * Copyright 2020 Google LLC.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const PING_TIMEOUT = new Delay(5000, 15000);
    const IFRAME_PATH = '__/auth/iframe';
    const EMULATED_IFRAME_PATH = 'emulator/auth/iframe';
    const IFRAME_ATTRIBUTES = {
        style: {
            position: 'absolute',
            top: '-100px',
            width: '1px',
            height: '1px'
        },
        'aria-hidden': 'true',
        tabindex: '-1'
    };
    // Map from apiHost to endpoint ID for passing into iframe. In current SDK, apiHost can be set to
    // anything (not from a list of endpoints with IDs as in legacy), so this is the closest we can get.
    const EID_FROM_APIHOST = new Map([
        ["identitytoolkit.googleapis.com" /* DefaultConfig.API_HOST */, 'p'], // production
        ['staging-identitytoolkit.sandbox.googleapis.com', 's'], // staging
        ['test-identitytoolkit.sandbox.googleapis.com', 't'] // test
    ]);
    function getIframeUrl(auth) {
        const config = auth.config;
        _assert(config.authDomain, auth, "auth-domain-config-required" /* AuthErrorCode.MISSING_AUTH_DOMAIN */);
        const url = config.emulator
            ? _emulatorUrl(config, EMULATED_IFRAME_PATH)
            : `https://${auth.config.authDomain}/${IFRAME_PATH}`;
        const params = {
            apiKey: config.apiKey,
            appName: auth.name,
            v: SDK_VERSION
        };
        const eid = EID_FROM_APIHOST.get(auth.config.apiHost);
        if (eid) {
            params.eid = eid;
        }
        const frameworks = auth._getFrameworks();
        if (frameworks.length) {
            params.fw = frameworks.join(',');
        }
        return `${url}?${querystring(params).slice(1)}`;
    }
    async function _openIframe(auth) {
        const context = await _loadGapi(auth);
        const gapi = _window().gapi;
        _assert(gapi, auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
        return context.open({
            where: document.body,
            url: getIframeUrl(auth),
            messageHandlersFilter: gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER,
            attributes: IFRAME_ATTRIBUTES,
            dontclear: true
        }, (iframe) => new Promise(async (resolve, reject) => {
            await iframe.restyle({
                // Prevent iframe from closing on mouse out.
                setHideOnLeave: false
            });
            const networkError = _createError(auth, "network-request-failed" /* AuthErrorCode.NETWORK_REQUEST_FAILED */);
            // Confirm iframe is correctly loaded.
            // To fallback on failure, set a timeout.
            const networkErrorTimer = _window().setTimeout(() => {
                reject(networkError);
            }, PING_TIMEOUT.get());
            // Clear timer and resolve pending iframe ready promise.
            function clearTimerAndResolve() {
                _window().clearTimeout(networkErrorTimer);
                resolve(iframe);
            }
            // This returns an IThenable. However the reject part does not call
            // when the iframe is not loaded.
            iframe.ping(clearTimerAndResolve).then(clearTimerAndResolve, () => {
                reject(networkError);
            });
        }));
    }

    /**
     * @license
     * Copyright 2020 Google LLC.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const BASE_POPUP_OPTIONS = {
        location: 'yes',
        resizable: 'yes',
        statusbar: 'yes',
        toolbar: 'no'
    };
    const DEFAULT_WIDTH = 500;
    const DEFAULT_HEIGHT = 600;
    const TARGET_BLANK = '_blank';
    const FIREFOX_EMPTY_URL = 'http://localhost';
    class AuthPopup {
        constructor(window) {
            this.window = window;
            this.associatedEvent = null;
        }
        close() {
            if (this.window) {
                try {
                    this.window.close();
                }
                catch (e) { }
            }
        }
    }
    function _open(auth, url, name, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
        const top = Math.max((window.screen.availHeight - height) / 2, 0).toString();
        const left = Math.max((window.screen.availWidth - width) / 2, 0).toString();
        let target = '';
        const options = Object.assign(Object.assign({}, BASE_POPUP_OPTIONS), { width: width.toString(), height: height.toString(), top,
            left });
        // Chrome iOS 7 and 8 is returning an undefined popup win when target is
        // specified, even though the popup is not necessarily blocked.
        const ua = getUA().toLowerCase();
        if (name) {
            target = _isChromeIOS(ua) ? TARGET_BLANK : name;
        }
        if (_isFirefox(ua)) {
            // Firefox complains when invalid URLs are popped out. Hacky way to bypass.
            url = url || FIREFOX_EMPTY_URL;
            // Firefox disables by default scrolling on popup windows, which can create
            // issues when the user has many Google accounts, for instance.
            options.scrollbars = 'yes';
        }
        const optionsString = Object.entries(options).reduce((accum, [key, value]) => `${accum}${key}=${value},`, '');
        if (_isIOSStandalone(ua) && target !== '_self') {
            openAsNewWindowIOS(url || '', target);
            return new AuthPopup(null);
        }
        // about:blank getting sanitized causing browsers like IE/Edge to display
        // brief error message before redirecting to handler.
        const newWin = window.open(url || '', target, optionsString);
        _assert(newWin, auth, "popup-blocked" /* AuthErrorCode.POPUP_BLOCKED */);
        // Flaky on IE edge, encapsulate with a try and catch.
        try {
            newWin.focus();
        }
        catch (e) { }
        return new AuthPopup(newWin);
    }
    function openAsNewWindowIOS(url, target) {
        const el = document.createElement('a');
        el.href = url;
        el.target = target;
        const click = document.createEvent('MouseEvent');
        click.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 1, null);
        el.dispatchEvent(click);
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * URL for Authentication widget which will initiate the OAuth handshake
     *
     * @internal
     */
    const WIDGET_PATH = '__/auth/handler';
    /**
     * URL for emulated environment
     *
     * @internal
     */
    const EMULATOR_WIDGET_PATH = 'emulator/auth/handler';
    /**
     * Fragment name for the App Check token that gets passed to the widget
     *
     * @internal
     */
    const FIREBASE_APP_CHECK_FRAGMENT_ID = encodeURIComponent('fac');
    async function _getRedirectUrl(auth, provider, authType, redirectUrl, eventId, additionalParams) {
        _assert(auth.config.authDomain, auth, "auth-domain-config-required" /* AuthErrorCode.MISSING_AUTH_DOMAIN */);
        _assert(auth.config.apiKey, auth, "invalid-api-key" /* AuthErrorCode.INVALID_API_KEY */);
        const params = {
            apiKey: auth.config.apiKey,
            appName: auth.name,
            authType,
            redirectUrl,
            v: SDK_VERSION,
            eventId
        };
        if (provider instanceof FederatedAuthProvider) {
            provider.setDefaultLanguage(auth.languageCode);
            params.providerId = provider.providerId || '';
            if (!isEmpty$1(provider.getCustomParameters())) {
                params.customParameters = JSON.stringify(provider.getCustomParameters());
            }
            // TODO set additionalParams from the provider as well?
            for (const [key, value] of Object.entries({})) {
                params[key] = value;
            }
        }
        if (provider instanceof BaseOAuthProvider) {
            const scopes = provider.getScopes().filter(scope => scope !== '');
            if (scopes.length > 0) {
                params.scopes = scopes.join(',');
            }
        }
        if (auth.tenantId) {
            params.tid = auth.tenantId;
        }
        // TODO: maybe set eid as endpointId
        // TODO: maybe set fw as Frameworks.join(",")
        const paramsDict = params;
        for (const key of Object.keys(paramsDict)) {
            if (paramsDict[key] === undefined) {
                delete paramsDict[key];
            }
        }
        // Sets the App Check token to pass to the widget
        const appCheckToken = await auth._getAppCheckToken();
        const appCheckTokenFragment = appCheckToken
            ? `#${FIREBASE_APP_CHECK_FRAGMENT_ID}=${encodeURIComponent(appCheckToken)}`
            : '';
        // Start at index 1 to skip the leading '&' in the query string
        return `${getHandlerBase(auth)}?${querystring(paramsDict).slice(1)}${appCheckTokenFragment}`;
    }
    function getHandlerBase({ config }) {
        if (!config.emulator) {
            return `https://${config.authDomain}/${WIDGET_PATH}`;
        }
        return _emulatorUrl(config, EMULATOR_WIDGET_PATH);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The special web storage event
     *
     */
    const WEB_STORAGE_SUPPORT_KEY = 'webStorageSupport';
    class BrowserPopupRedirectResolver {
        constructor() {
            this.eventManagers = {};
            this.iframes = {};
            this.originValidationPromises = {};
            this._redirectPersistence = browserSessionPersistence;
            this._completeRedirectFn = _getRedirectResult;
            this._overrideRedirectResult = _overrideRedirectResult;
        }
        // Wrapping in async even though we don't await anywhere in order
        // to make sure errors are raised as promise rejections
        async _openPopup(auth, provider, authType, eventId) {
            var _a;
            debugAssert((_a = this.eventManagers[auth._key()]) === null || _a === void 0 ? void 0 : _a.manager, '_initialize() not called before _openPopup()');
            const url = await _getRedirectUrl(auth, provider, authType, _getCurrentUrl(), eventId);
            return _open(auth, url, _generateEventId());
        }
        async _openRedirect(auth, provider, authType, eventId) {
            await this._originValidation(auth);
            const url = await _getRedirectUrl(auth, provider, authType, _getCurrentUrl(), eventId);
            _setWindowLocation(url);
            return new Promise(() => { });
        }
        _initialize(auth) {
            const key = auth._key();
            if (this.eventManagers[key]) {
                const { manager, promise } = this.eventManagers[key];
                if (manager) {
                    return Promise.resolve(manager);
                }
                else {
                    debugAssert(promise, 'If manager is not set, promise should be');
                    return promise;
                }
            }
            const promise = this.initAndGetManager(auth);
            this.eventManagers[key] = { promise };
            // If the promise is rejected, the key should be removed so that the
            // operation can be retried later.
            promise.catch(() => {
                delete this.eventManagers[key];
            });
            return promise;
        }
        async initAndGetManager(auth) {
            const iframe = await _openIframe(auth);
            const manager = new AuthEventManager(auth);
            iframe.register('authEvent', (iframeEvent) => {
                _assert(iframeEvent === null || iframeEvent === void 0 ? void 0 : iframeEvent.authEvent, auth, "invalid-auth-event" /* AuthErrorCode.INVALID_AUTH_EVENT */);
                // TODO: Consider splitting redirect and popup events earlier on
                const handled = manager.onEvent(iframeEvent.authEvent);
                return { status: handled ? "ACK" /* GapiOutcome.ACK */ : "ERROR" /* GapiOutcome.ERROR */ };
            }, gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
            this.eventManagers[auth._key()] = { manager };
            this.iframes[auth._key()] = iframe;
            return manager;
        }
        _isIframeWebStorageSupported(auth, cb) {
            const iframe = this.iframes[auth._key()];
            iframe.send(WEB_STORAGE_SUPPORT_KEY, { type: WEB_STORAGE_SUPPORT_KEY }, result => {
                var _a;
                const isSupported = (_a = result === null || result === void 0 ? void 0 : result[0]) === null || _a === void 0 ? void 0 : _a[WEB_STORAGE_SUPPORT_KEY];
                if (isSupported !== undefined) {
                    cb(!!isSupported);
                }
                _fail(auth, "internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
            }, gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
        }
        _originValidation(auth) {
            const key = auth._key();
            if (!this.originValidationPromises[key]) {
                this.originValidationPromises[key] = _validateOrigin(auth);
            }
            return this.originValidationPromises[key];
        }
        get _shouldInitProactively() {
            // Mobile browsers and Safari need to optimistically initialize
            return _isMobileBrowser() || _isSafari() || _isIOS();
        }
    }
    /**
     * An implementation of {@link PopupRedirectResolver} suitable for browser
     * based applications.
     *
     * @remarks
     * This method does not work in a Node.js environment.
     *
     * @public
     */
    const browserPopupRedirectResolver = BrowserPopupRedirectResolver;

    var name = "@firebase/auth";
    var version = "1.10.1";

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class AuthInterop {
        constructor(auth) {
            this.auth = auth;
            this.internalListeners = new Map();
        }
        getUid() {
            var _a;
            this.assertAuthConfigured();
            return ((_a = this.auth.currentUser) === null || _a === void 0 ? void 0 : _a.uid) || null;
        }
        async getToken(forceRefresh) {
            this.assertAuthConfigured();
            await this.auth._initializationPromise;
            if (!this.auth.currentUser) {
                return null;
            }
            const accessToken = await this.auth.currentUser.getIdToken(forceRefresh);
            return { accessToken };
        }
        addAuthTokenListener(listener) {
            this.assertAuthConfigured();
            if (this.internalListeners.has(listener)) {
                return;
            }
            const unsubscribe = this.auth.onIdTokenChanged(user => {
                listener((user === null || user === void 0 ? void 0 : user.stsTokenManager.accessToken) || null);
            });
            this.internalListeners.set(listener, unsubscribe);
            this.updateProactiveRefresh();
        }
        removeAuthTokenListener(listener) {
            this.assertAuthConfigured();
            const unsubscribe = this.internalListeners.get(listener);
            if (!unsubscribe) {
                return;
            }
            this.internalListeners.delete(listener);
            unsubscribe();
            this.updateProactiveRefresh();
        }
        assertAuthConfigured() {
            _assert(this.auth._initializationPromise, "dependent-sdk-initialized-before-auth" /* AuthErrorCode.DEPENDENT_SDK_INIT_BEFORE_AUTH */);
        }
        updateProactiveRefresh() {
            if (this.internalListeners.size > 0) {
                this.auth._startProactiveRefresh();
            }
            else {
                this.auth._stopProactiveRefresh();
            }
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function getVersionForPlatform(clientPlatform) {
        switch (clientPlatform) {
            case "Node" /* ClientPlatform.NODE */:
                return 'node';
            case "ReactNative" /* ClientPlatform.REACT_NATIVE */:
                return 'rn';
            case "Worker" /* ClientPlatform.WORKER */:
                return 'webworker';
            case "Cordova" /* ClientPlatform.CORDOVA */:
                return 'cordova';
            case "WebExtension" /* ClientPlatform.WEB_EXTENSION */:
                return 'web-extension';
            default:
                return undefined;
        }
    }
    /** @internal */
    function registerAuth(clientPlatform) {
        _registerComponent(new Component("auth" /* _ComponentName.AUTH */, (container, { options: deps }) => {
            const app = container.getProvider('app').getImmediate();
            const heartbeatServiceProvider = container.getProvider('heartbeat');
            const appCheckServiceProvider = container.getProvider('app-check-internal');
            const { apiKey, authDomain } = app.options;
            _assert(apiKey && !apiKey.includes(':'), "invalid-api-key" /* AuthErrorCode.INVALID_API_KEY */, { appName: app.name });
            const config = {
                apiKey,
                authDomain,
                clientPlatform,
                apiHost: "identitytoolkit.googleapis.com" /* DefaultConfig.API_HOST */,
                tokenApiHost: "securetoken.googleapis.com" /* DefaultConfig.TOKEN_API_HOST */,
                apiScheme: "https" /* DefaultConfig.API_SCHEME */,
                sdkClientVersion: _getClientVersion(clientPlatform)
            };
            const authInstance = new AuthImpl(app, heartbeatServiceProvider, appCheckServiceProvider, config);
            _initializeAuthInstance(authInstance, deps);
            return authInstance;
        }, "PUBLIC" /* ComponentType.PUBLIC */)
            /**
             * Auth can only be initialized by explicitly calling getAuth() or initializeAuth()
             * For why we do this, See go/firebase-next-auth-init
             */
            .setInstantiationMode("EXPLICIT" /* InstantiationMode.EXPLICIT */)
            /**
             * Because all firebase products that depend on auth depend on auth-internal directly,
             * we need to initialize auth-internal after auth is initialized to make it available to other firebase products.
             */
            .setInstanceCreatedCallback((container, _instanceIdentifier, _instance) => {
            const authInternalProvider = container.getProvider("auth-internal" /* _ComponentName.AUTH_INTERNAL */);
            authInternalProvider.initialize();
        }));
        _registerComponent(new Component("auth-internal" /* _ComponentName.AUTH_INTERNAL */, container => {
            const auth = _castAuth(container.getProvider("auth" /* _ComponentName.AUTH */).getImmediate());
            return (auth => new AuthInterop(auth))(auth);
        }, "PRIVATE" /* ComponentType.PRIVATE */).setInstantiationMode("EXPLICIT" /* InstantiationMode.EXPLICIT */));
        registerVersion(name, version, getVersionForPlatform(clientPlatform));
        // BUILD_TARGET will be replaced by values like esm2017, cjs2017, etc during the compilation
        registerVersion(name, version, 'esm2017');
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DEFAULT_ID_TOKEN_MAX_AGE = 5 * 60;
    const authIdTokenMaxAge = getExperimentalSetting('authIdTokenMaxAge') || DEFAULT_ID_TOKEN_MAX_AGE;
    let lastPostedIdToken = null;
    const mintCookieFactory = (url) => async (user) => {
        const idTokenResult = user && (await user.getIdTokenResult());
        const idTokenAge = idTokenResult &&
            (new Date().getTime() - Date.parse(idTokenResult.issuedAtTime)) / 1000;
        if (idTokenAge && idTokenAge > authIdTokenMaxAge) {
            return;
        }
        // Specifically trip null => undefined when logged out, to delete any existing cookie
        const idToken = idTokenResult === null || idTokenResult === void 0 ? void 0 : idTokenResult.token;
        if (lastPostedIdToken === idToken) {
            return;
        }
        lastPostedIdToken = idToken;
        await fetch(url, {
            method: idToken ? 'POST' : 'DELETE',
            headers: idToken
                ? {
                    'Authorization': `Bearer ${idToken}`
                }
                : {}
        });
    };
    /**
     * Returns the Auth instance associated with the provided {@link @firebase/app#FirebaseApp}.
     * If no instance exists, initializes an Auth instance with platform-specific default dependencies.
     *
     * @param app - The Firebase App.
     *
     * @public
     */
    function getAuth(app = getApp()) {
        const provider = _getProvider(app, 'auth');
        if (provider.isInitialized()) {
            return provider.getImmediate();
        }
        const auth = initializeAuth(app, {
            popupRedirectResolver: browserPopupRedirectResolver,
            persistence: [
                indexedDBLocalPersistence,
                browserLocalPersistence,
                browserSessionPersistence
            ]
        });
        const authTokenSyncPath = getExperimentalSetting('authTokenSyncURL');
        // Only do the Cookie exchange in a secure context
        if (authTokenSyncPath &&
            typeof isSecureContext === 'boolean' &&
            isSecureContext) {
            // Don't allow urls (XSS possibility), only paths on the same domain
            const authTokenSyncUrl = new URL(authTokenSyncPath, location.origin);
            if (location.origin === authTokenSyncUrl.origin) {
                const mintCookie = mintCookieFactory(authTokenSyncUrl.toString());
                beforeAuthStateChanged(auth, mintCookie, () => mintCookie(auth.currentUser));
                onIdTokenChanged(auth, user => mintCookie(user));
            }
        }
        const authEmulatorHost = getDefaultEmulatorHost('auth');
        if (authEmulatorHost) {
            connectAuthEmulator(auth, `http://${authEmulatorHost}`);
        }
        return auth;
    }
    function getScriptParentElement() {
        var _a, _b;
        return (_b = (_a = document.getElementsByTagName('head')) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : document;
    }
    _setExternalJSProvider({
        loadJS(url) {
            // TODO: consider adding timeout support & cancellation
            return new Promise((resolve, reject) => {
                const el = document.createElement('script');
                el.setAttribute('src', url);
                el.onload = resolve;
                el.onerror = e => {
                    const error = _createError("internal-error" /* AuthErrorCode.INTERNAL_ERROR */);
                    error.customData = e;
                    reject(error);
                };
                el.type = 'text/javascript';
                el.charset = 'UTF-8';
                getScriptParentElement().appendChild(el);
            });
        },
        gapiScript: 'https://apis.google.com/js/api.js',
        recaptchaV2Script: 'https://www.google.com/recaptcha/api.js',
        recaptchaEnterpriseScript: 'https://www.google.com/recaptcha/enterprise.js?render='
    });
    registerAuth("Browser" /* ClientPlatform.BROWSER */);

    var commonjsGlobal$1 = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    /** @license
    Copyright The Closure Library Authors.
    SPDX-License-Identifier: Apache-2.0
    */

    var Integer;
    (function() {var h;/** @license

     Copyright The Closure Library Authors.
     SPDX-License-Identifier: Apache-2.0
    */
    function k(f,a){function c(){}c.prototype=a.prototype;f.D=a.prototype;f.prototype=new c;f.prototype.constructor=f;f.C=function(d,e,g){for(var b=Array(arguments.length-2),r=2;r<arguments.length;r++)b[r-2]=arguments[r];return a.prototype[e].apply(d,b)};}function l(){this.blockSize=-1;}function m(){this.blockSize=-1;this.blockSize=64;this.g=Array(4);this.B=Array(this.blockSize);this.o=this.h=0;this.s();}k(m,l);m.prototype.s=function(){this.g[0]=1732584193;this.g[1]=4023233417;this.g[2]=2562383102;this.g[3]=271733878;this.o=this.h=0;};
    function n(f,a,c){c||(c=0);var d=Array(16);if("string"===typeof a)for(var e=0;16>e;++e)d[e]=a.charCodeAt(c++)|a.charCodeAt(c++)<<8|a.charCodeAt(c++)<<16|a.charCodeAt(c++)<<24;else for(e=0;16>e;++e)d[e]=a[c++]|a[c++]<<8|a[c++]<<16|a[c++]<<24;a=f.g[0];c=f.g[1];e=f.g[2];var g=f.g[3];var b=a+(g^c&(e^g))+d[0]+3614090360&4294967295;a=c+(b<<7&4294967295|b>>>25);b=g+(e^a&(c^e))+d[1]+3905402710&4294967295;g=a+(b<<12&4294967295|b>>>20);b=e+(c^g&(a^c))+d[2]+606105819&4294967295;e=g+(b<<17&4294967295|b>>>15);
    b=c+(a^e&(g^a))+d[3]+3250441966&4294967295;c=e+(b<<22&4294967295|b>>>10);b=a+(g^c&(e^g))+d[4]+4118548399&4294967295;a=c+(b<<7&4294967295|b>>>25);b=g+(e^a&(c^e))+d[5]+1200080426&4294967295;g=a+(b<<12&4294967295|b>>>20);b=e+(c^g&(a^c))+d[6]+2821735955&4294967295;e=g+(b<<17&4294967295|b>>>15);b=c+(a^e&(g^a))+d[7]+4249261313&4294967295;c=e+(b<<22&4294967295|b>>>10);b=a+(g^c&(e^g))+d[8]+1770035416&4294967295;a=c+(b<<7&4294967295|b>>>25);b=g+(e^a&(c^e))+d[9]+2336552879&4294967295;g=a+(b<<12&4294967295|
    b>>>20);b=e+(c^g&(a^c))+d[10]+4294925233&4294967295;e=g+(b<<17&4294967295|b>>>15);b=c+(a^e&(g^a))+d[11]+2304563134&4294967295;c=e+(b<<22&4294967295|b>>>10);b=a+(g^c&(e^g))+d[12]+1804603682&4294967295;a=c+(b<<7&4294967295|b>>>25);b=g+(e^a&(c^e))+d[13]+4254626195&4294967295;g=a+(b<<12&4294967295|b>>>20);b=e+(c^g&(a^c))+d[14]+2792965006&4294967295;e=g+(b<<17&4294967295|b>>>15);b=c+(a^e&(g^a))+d[15]+1236535329&4294967295;c=e+(b<<22&4294967295|b>>>10);b=a+(e^g&(c^e))+d[1]+4129170786&4294967295;a=c+(b<<
    5&4294967295|b>>>27);b=g+(c^e&(a^c))+d[6]+3225465664&4294967295;g=a+(b<<9&4294967295|b>>>23);b=e+(a^c&(g^a))+d[11]+643717713&4294967295;e=g+(b<<14&4294967295|b>>>18);b=c+(g^a&(e^g))+d[0]+3921069994&4294967295;c=e+(b<<20&4294967295|b>>>12);b=a+(e^g&(c^e))+d[5]+3593408605&4294967295;a=c+(b<<5&4294967295|b>>>27);b=g+(c^e&(a^c))+d[10]+38016083&4294967295;g=a+(b<<9&4294967295|b>>>23);b=e+(a^c&(g^a))+d[15]+3634488961&4294967295;e=g+(b<<14&4294967295|b>>>18);b=c+(g^a&(e^g))+d[4]+3889429448&4294967295;c=
    e+(b<<20&4294967295|b>>>12);b=a+(e^g&(c^e))+d[9]+568446438&4294967295;a=c+(b<<5&4294967295|b>>>27);b=g+(c^e&(a^c))+d[14]+3275163606&4294967295;g=a+(b<<9&4294967295|b>>>23);b=e+(a^c&(g^a))+d[3]+4107603335&4294967295;e=g+(b<<14&4294967295|b>>>18);b=c+(g^a&(e^g))+d[8]+1163531501&4294967295;c=e+(b<<20&4294967295|b>>>12);b=a+(e^g&(c^e))+d[13]+2850285829&4294967295;a=c+(b<<5&4294967295|b>>>27);b=g+(c^e&(a^c))+d[2]+4243563512&4294967295;g=a+(b<<9&4294967295|b>>>23);b=e+(a^c&(g^a))+d[7]+1735328473&4294967295;
    e=g+(b<<14&4294967295|b>>>18);b=c+(g^a&(e^g))+d[12]+2368359562&4294967295;c=e+(b<<20&4294967295|b>>>12);b=a+(c^e^g)+d[5]+4294588738&4294967295;a=c+(b<<4&4294967295|b>>>28);b=g+(a^c^e)+d[8]+2272392833&4294967295;g=a+(b<<11&4294967295|b>>>21);b=e+(g^a^c)+d[11]+1839030562&4294967295;e=g+(b<<16&4294967295|b>>>16);b=c+(e^g^a)+d[14]+4259657740&4294967295;c=e+(b<<23&4294967295|b>>>9);b=a+(c^e^g)+d[1]+2763975236&4294967295;a=c+(b<<4&4294967295|b>>>28);b=g+(a^c^e)+d[4]+1272893353&4294967295;g=a+(b<<11&4294967295|
    b>>>21);b=e+(g^a^c)+d[7]+4139469664&4294967295;e=g+(b<<16&4294967295|b>>>16);b=c+(e^g^a)+d[10]+3200236656&4294967295;c=e+(b<<23&4294967295|b>>>9);b=a+(c^e^g)+d[13]+681279174&4294967295;a=c+(b<<4&4294967295|b>>>28);b=g+(a^c^e)+d[0]+3936430074&4294967295;g=a+(b<<11&4294967295|b>>>21);b=e+(g^a^c)+d[3]+3572445317&4294967295;e=g+(b<<16&4294967295|b>>>16);b=c+(e^g^a)+d[6]+76029189&4294967295;c=e+(b<<23&4294967295|b>>>9);b=a+(c^e^g)+d[9]+3654602809&4294967295;a=c+(b<<4&4294967295|b>>>28);b=g+(a^c^e)+d[12]+
    3873151461&4294967295;g=a+(b<<11&4294967295|b>>>21);b=e+(g^a^c)+d[15]+530742520&4294967295;e=g+(b<<16&4294967295|b>>>16);b=c+(e^g^a)+d[2]+3299628645&4294967295;c=e+(b<<23&4294967295|b>>>9);b=a+(e^(c|~g))+d[0]+4096336452&4294967295;a=c+(b<<6&4294967295|b>>>26);b=g+(c^(a|~e))+d[7]+1126891415&4294967295;g=a+(b<<10&4294967295|b>>>22);b=e+(a^(g|~c))+d[14]+2878612391&4294967295;e=g+(b<<15&4294967295|b>>>17);b=c+(g^(e|~a))+d[5]+4237533241&4294967295;c=e+(b<<21&4294967295|b>>>11);b=a+(e^(c|~g))+d[12]+1700485571&
    4294967295;a=c+(b<<6&4294967295|b>>>26);b=g+(c^(a|~e))+d[3]+2399980690&4294967295;g=a+(b<<10&4294967295|b>>>22);b=e+(a^(g|~c))+d[10]+4293915773&4294967295;e=g+(b<<15&4294967295|b>>>17);b=c+(g^(e|~a))+d[1]+2240044497&4294967295;c=e+(b<<21&4294967295|b>>>11);b=a+(e^(c|~g))+d[8]+1873313359&4294967295;a=c+(b<<6&4294967295|b>>>26);b=g+(c^(a|~e))+d[15]+4264355552&4294967295;g=a+(b<<10&4294967295|b>>>22);b=e+(a^(g|~c))+d[6]+2734768916&4294967295;e=g+(b<<15&4294967295|b>>>17);b=c+(g^(e|~a))+d[13]+1309151649&
    4294967295;c=e+(b<<21&4294967295|b>>>11);b=a+(e^(c|~g))+d[4]+4149444226&4294967295;a=c+(b<<6&4294967295|b>>>26);b=g+(c^(a|~e))+d[11]+3174756917&4294967295;g=a+(b<<10&4294967295|b>>>22);b=e+(a^(g|~c))+d[2]+718787259&4294967295;e=g+(b<<15&4294967295|b>>>17);b=c+(g^(e|~a))+d[9]+3951481745&4294967295;f.g[0]=f.g[0]+a&4294967295;f.g[1]=f.g[1]+(e+(b<<21&4294967295|b>>>11))&4294967295;f.g[2]=f.g[2]+e&4294967295;f.g[3]=f.g[3]+g&4294967295;}
    m.prototype.u=function(f,a){ void 0===a&&(a=f.length);for(var c=a-this.blockSize,d=this.B,e=this.h,g=0;g<a;){if(0==e)for(;g<=c;)n(this,f,g),g+=this.blockSize;if("string"===typeof f)for(;g<a;){if(d[e++]=f.charCodeAt(g++),e==this.blockSize){n(this,d);e=0;break}}else for(;g<a;)if(d[e++]=f[g++],e==this.blockSize){n(this,d);e=0;break}}this.h=e;this.o+=a;};
    m.prototype.v=function(){var f=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);f[0]=128;for(var a=1;a<f.length-8;++a)f[a]=0;var c=8*this.o;for(a=f.length-8;a<f.length;++a)f[a]=c&255,c/=256;this.u(f);f=Array(16);for(a=c=0;4>a;++a)for(var d=0;32>d;d+=8)f[c++]=this.g[a]>>>d&255;return f};function p(f,a){var c=q;return Object.prototype.hasOwnProperty.call(c,f)?c[f]:c[f]=a(f)}function t(f,a){this.h=a;for(var c=[],d=true,e=f.length-1;0<=e;e--){var g=f[e]|0;d&&g==a||(c[e]=g,d=false);}this.g=c;}var q={};function u(f){return -128<=f&&128>f?p(f,function(a){return new t([a|0],0>a?-1:0)}):new t([f|0],0>f?-1:0)}function v(f){if(isNaN(f)||!isFinite(f))return w;if(0>f)return x(v(-f));for(var a=[],c=1,d=0;f>=c;d++)a[d]=f/c|0,c*=4294967296;return new t(a,0)}
    function y(f,a){if(0==f.length)throw Error("number format error: empty string");a=a||10;if(2>a||36<a)throw Error("radix out of range: "+a);if("-"==f.charAt(0))return x(y(f.substring(1),a));if(0<=f.indexOf("-"))throw Error('number format error: interior "-" character');for(var c=v(Math.pow(a,8)),d=w,e=0;e<f.length;e+=8){var g=Math.min(8,f.length-e),b=parseInt(f.substring(e,e+g),a);8>g?(g=v(Math.pow(a,g)),d=d.j(g).add(v(b))):(d=d.j(c),d=d.add(v(b)));}return d}var w=u(0),z=u(1),A=u(16777216);h=t.prototype;
    h.m=function(){if(B(this))return -x(this).m();for(var f=0,a=1,c=0;c<this.g.length;c++){var d=this.i(c);f+=(0<=d?d:4294967296+d)*a;a*=4294967296;}return f};h.toString=function(f){f=f||10;if(2>f||36<f)throw Error("radix out of range: "+f);if(C(this))return "0";if(B(this))return "-"+x(this).toString(f);for(var a=v(Math.pow(f,6)),c=this,d="";;){var e=D(c,a).g;c=F(c,e.j(a));var g=((0<c.g.length?c.g[0]:c.h)>>>0).toString(f);c=e;if(C(c))return g+d;for(;6>g.length;)g="0"+g;d=g+d;}};
    h.i=function(f){return 0>f?0:f<this.g.length?this.g[f]:this.h};function C(f){if(0!=f.h)return false;for(var a=0;a<f.g.length;a++)if(0!=f.g[a])return false;return true}function B(f){return -1==f.h}h.l=function(f){f=F(this,f);return B(f)?-1:C(f)?0:1};function x(f){for(var a=f.g.length,c=[],d=0;d<a;d++)c[d]=~f.g[d];return (new t(c,~f.h)).add(z)}h.abs=function(){return B(this)?x(this):this};
    h.add=function(f){for(var a=Math.max(this.g.length,f.g.length),c=[],d=0,e=0;e<=a;e++){var g=d+(this.i(e)&65535)+(f.i(e)&65535),b=(g>>>16)+(this.i(e)>>>16)+(f.i(e)>>>16);d=b>>>16;g&=65535;b&=65535;c[e]=b<<16|g;}return new t(c,c[c.length-1]&-2147483648?-1:0)};function F(f,a){return f.add(x(a))}
    h.j=function(f){if(C(this)||C(f))return w;if(B(this))return B(f)?x(this).j(x(f)):x(x(this).j(f));if(B(f))return x(this.j(x(f)));if(0>this.l(A)&&0>f.l(A))return v(this.m()*f.m());for(var a=this.g.length+f.g.length,c=[],d=0;d<2*a;d++)c[d]=0;for(d=0;d<this.g.length;d++)for(var e=0;e<f.g.length;e++){var g=this.i(d)>>>16,b=this.i(d)&65535,r=f.i(e)>>>16,E=f.i(e)&65535;c[2*d+2*e]+=b*E;G(c,2*d+2*e);c[2*d+2*e+1]+=g*E;G(c,2*d+2*e+1);c[2*d+2*e+1]+=b*r;G(c,2*d+2*e+1);c[2*d+2*e+2]+=g*r;G(c,2*d+2*e+2);}for(d=0;d<
    a;d++)c[d]=c[2*d+1]<<16|c[2*d];for(d=a;d<2*a;d++)c[d]=0;return new t(c,0)};function G(f,a){for(;(f[a]&65535)!=f[a];)f[a+1]+=f[a]>>>16,f[a]&=65535,a++;}function H(f,a){this.g=f;this.h=a;}
    function D(f,a){if(C(a))throw Error("division by zero");if(C(f))return new H(w,w);if(B(f))return a=D(x(f),a),new H(x(a.g),x(a.h));if(B(a))return a=D(f,x(a)),new H(x(a.g),a.h);if(30<f.g.length){if(B(f)||B(a))throw Error("slowDivide_ only works with positive integers.");for(var c=z,d=a;0>=d.l(f);)c=I(c),d=I(d);var e=J(c,1),g=J(d,1);d=J(d,2);for(c=J(c,2);!C(d);){var b=g.add(d);0>=b.l(f)&&(e=e.add(c),g=b);d=J(d,1);c=J(c,1);}a=F(f,e.j(a));return new H(e,a)}for(e=w;0<=f.l(a);){c=Math.max(1,Math.floor(f.m()/
    a.m()));d=Math.ceil(Math.log(c)/Math.LN2);d=48>=d?1:Math.pow(2,d-48);g=v(c);for(b=g.j(a);B(b)||0<b.l(f);)c-=d,g=v(c),b=g.j(a);C(g)&&(g=z);e=e.add(g);f=F(f,b);}return new H(e,f)}h.A=function(f){return D(this,f).h};h.and=function(f){for(var a=Math.max(this.g.length,f.g.length),c=[],d=0;d<a;d++)c[d]=this.i(d)&f.i(d);return new t(c,this.h&f.h)};h.or=function(f){for(var a=Math.max(this.g.length,f.g.length),c=[],d=0;d<a;d++)c[d]=this.i(d)|f.i(d);return new t(c,this.h|f.h)};
    h.xor=function(f){for(var a=Math.max(this.g.length,f.g.length),c=[],d=0;d<a;d++)c[d]=this.i(d)^f.i(d);return new t(c,this.h^f.h)};function I(f){for(var a=f.g.length+1,c=[],d=0;d<a;d++)c[d]=f.i(d)<<1|f.i(d-1)>>>31;return new t(c,f.h)}function J(f,a){var c=a>>5;a%=32;for(var d=f.g.length-c,e=[],g=0;g<d;g++)e[g]=0<a?f.i(g+c)>>>a|f.i(g+c+1)<<32-a:f.i(g+c);return new t(e,f.h)}m.prototype.digest=m.prototype.v;m.prototype.reset=m.prototype.s;m.prototype.update=m.prototype.u;t.prototype.add=t.prototype.add;t.prototype.multiply=t.prototype.j;t.prototype.modulo=t.prototype.A;t.prototype.compare=t.prototype.l;t.prototype.toNumber=t.prototype.m;t.prototype.toString=t.prototype.toString;t.prototype.getBits=t.prototype.i;t.fromNumber=v;t.fromString=y;Integer = t;}).apply( typeof commonjsGlobal$1 !== 'undefined' ? commonjsGlobal$1 : typeof self !== 'undefined' ? self  : typeof window !== 'undefined' ? window  : {});

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    /** @license
    Copyright The Closure Library Authors.
    SPDX-License-Identifier: Apache-2.0
    */

    var XhrIo;
    var WebChannel;
    var EventType;
    var ErrorCode;
    var Stat;
    var Event;
    var getStatEventTarget;
    var createWebChannelTransport;
    (function() {var h,aa="function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,c){if(a==Array.prototype||a==Object.prototype)return a;a[b]=c.value;return a};function ba(a){a=["object"==typeof globalThis&&globalThis,a,"object"==typeof window&&window,"object"==typeof self&&self,"object"==typeof commonjsGlobal&&commonjsGlobal];for(var b=0;b<a.length;++b){var c=a[b];if(c&&c.Math==Math)return c}throw Error("Cannot find global object");}var ca=ba(this);
    function da(a,b){if(b)a:{var c=ca;a=a.split(".");for(var d=0;d<a.length-1;d++){var e=a[d];if(!(e in c))break a;c=c[e];}a=a[a.length-1];d=c[a];b=b(d);b!=d&&null!=b&&aa(c,a,{configurable:true,writable:true,value:b});}}function ea(a,b){a instanceof String&&(a+="");var c=0,d=false,e={next:function(){if(!d&&c<a.length){var f=c++;return {value:b(f,a[f]),done:false}}d=true;return {done:true,value:void 0}}};e[Symbol.iterator]=function(){return e};return e}
    da("Array.prototype.values",function(a){return a?a:function(){return ea(this,function(b,c){return c})}});/** @license

     Copyright The Closure Library Authors.
     SPDX-License-Identifier: Apache-2.0
    */
    var fa=fa||{},k=this||self;function ha(a){var b=typeof a;b="object"!=b?b:a?Array.isArray(a)?"array":b:"null";return "array"==b||"object"==b&&"number"==typeof a.length}function n(a){var b=typeof a;return "object"==b&&null!=a||"function"==b}function ia(a,b,c){return a.call.apply(a.bind,arguments)}
    function ja(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var e=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(e,d);return a.apply(b,e)}}return function(){return a.apply(b,arguments)}}function p(a,b,c){p=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?ia:ja;return p.apply(null,arguments)}
    function ka(a,b){var c=Array.prototype.slice.call(arguments,1);return function(){var d=c.slice();d.push.apply(d,arguments);return a.apply(this,d)}}function r(a,b){function c(){}c.prototype=b.prototype;a.aa=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.Qb=function(d,e,f){for(var g=Array(arguments.length-2),m=2;m<arguments.length;m++)g[m-2]=arguments[m];return b.prototype[e].apply(d,g)};}function la(a){const b=a.length;if(0<b){const c=Array(b);for(let d=0;d<b;d++)c[d]=a[d];return c}return []}function ma(a,b){for(let c=1;c<arguments.length;c++){const d=arguments[c];if(ha(d)){const e=a.length||0,f=d.length||0;a.length=e+f;for(let g=0;g<f;g++)a[e+g]=d[g];}else a.push(d);}}class na{constructor(a,b){this.i=a;this.j=b;this.h=0;this.g=null;}get(){let a;0<this.h?(this.h--,a=this.g,this.g=a.next,a.next=null):a=this.i();return a}}function t(a){return /^[\s\xa0]*$/.test(a)}function u(){var a=k.navigator;return a&&(a=a.userAgent)?a:""}function oa(a){oa[" "](a);return a}oa[" "]=function(){};var pa=-1!=u().indexOf("Gecko")&&!(-1!=u().toLowerCase().indexOf("webkit")&&-1==u().indexOf("Edge"))&&!(-1!=u().indexOf("Trident")||-1!=u().indexOf("MSIE"))&&-1==u().indexOf("Edge");function qa(a,b,c){for(const d in a)b.call(c,a[d],d,a);}function ra(a,b){for(const c in a)b.call(void 0,a[c],c,a);}function sa(a){const b={};for(const c in a)b[c]=a[c];return b}const ta="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function ua(a,b){let c,d;for(let e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(let f=0;f<ta.length;f++)c=ta[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c]);}}function va(a){var b=1;a=a.split(":");const c=[];for(;0<b&&a.length;)c.push(a.shift()),b--;a.length&&c.push(a.join(":"));return c}function wa(a){k.setTimeout(()=>{throw a;},0);}function xa(){var a=za;let b=null;a.g&&(b=a.g,a.g=a.g.next,a.g||(a.h=null),b.next=null);return b}class Aa{constructor(){this.h=this.g=null;}add(a,b){const c=Ba.get();c.set(a,b);this.h?this.h.next=c:this.g=c;this.h=c;}}var Ba=new na(()=>new Ca,a=>a.reset());class Ca{constructor(){this.next=this.g=this.h=null;}set(a,b){this.h=a;this.g=b;this.next=null;}reset(){this.next=this.g=this.h=null;}}let x,y=false,za=new Aa,Ea=()=>{const a=k.Promise.resolve(void 0);x=()=>{a.then(Da);};};var Da=()=>{for(var a;a=xa();){try{a.h.call(a.g);}catch(c){wa(c);}var b=Ba;b.j(a);100>b.h&&(b.h++,a.next=b.g,b.g=a);}y=false;};function z(){this.s=this.s;this.C=this.C;}z.prototype.s=false;z.prototype.ma=function(){this.s||(this.s=true,this.N());};z.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()();};function A(a,b){this.type=a;this.g=this.target=b;this.defaultPrevented=false;}A.prototype.h=function(){this.defaultPrevented=true;};var Fa=function(){if(!k.addEventListener||!Object.defineProperty)return false;var a=false,b=Object.defineProperty({},"passive",{get:function(){a=true;}});try{const c=()=>{};k.addEventListener("test",c,b);k.removeEventListener("test",c,b);}catch(c){}return a}();function C(a,b){A.call(this,a?a.type:"");this.relatedTarget=this.g=this.target=null;this.button=this.screenY=this.screenX=this.clientY=this.clientX=0;this.key="";this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=false;this.state=null;this.pointerId=0;this.pointerType="";this.i=null;if(a){var c=this.type=a.type,d=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement;this.g=b;if(b=a.relatedTarget){if(pa){a:{try{oa(b.nodeName);var e=!0;break a}catch(f){}e=
    false;}e||(b=null);}}else "mouseover"==c?b=a.fromElement:"mouseout"==c&&(b=a.toElement);this.relatedTarget=b;d?(this.clientX=void 0!==d.clientX?d.clientX:d.pageX,this.clientY=void 0!==d.clientY?d.clientY:d.pageY,this.screenX=d.screenX||0,this.screenY=d.screenY||0):(this.clientX=void 0!==a.clientX?a.clientX:a.pageX,this.clientY=void 0!==a.clientY?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0);this.button=a.button;this.key=a.key||"";this.ctrlKey=a.ctrlKey;this.altKey=a.altKey;this.shiftKey=
    a.shiftKey;this.metaKey=a.metaKey;this.pointerId=a.pointerId||0;this.pointerType="string"===typeof a.pointerType?a.pointerType:Ga[a.pointerType]||"";this.state=a.state;this.i=a;a.defaultPrevented&&C.aa.h.call(this);}}r(C,A);var Ga={2:"touch",3:"pen",4:"mouse"};C.prototype.h=function(){C.aa.h.call(this);var a=this.i;a.preventDefault?a.preventDefault():a.returnValue=false;};var D="closure_listenable_"+(1E6*Math.random()|0);var Ha=0;function Ia(a,b,c,d,e){this.listener=a;this.proxy=null;this.src=b;this.type=c;this.capture=!!d;this.ha=e;this.key=++Ha;this.da=this.fa=false;}function Ja(a){a.da=true;a.listener=null;a.proxy=null;a.src=null;a.ha=null;}function Ka(a){this.src=a;this.g={};this.h=0;}Ka.prototype.add=function(a,b,c,d,e){var f=a.toString();a=this.g[f];a||(a=this.g[f]=[],this.h++);var g=La(a,b,d,e);-1<g?(b=a[g],c||(b.fa=false)):(b=new Ia(b,this.src,f,!!d,e),b.fa=c,a.push(b));return b};function Ma(a,b){var c=b.type;if(c in a.g){var d=a.g[c],e=Array.prototype.indexOf.call(d,b,void 0),f;(f=0<=e)&&Array.prototype.splice.call(d,e,1);f&&(Ja(b),0==a.g[c].length&&(delete a.g[c],a.h--));}}
    function La(a,b,c,d){for(var e=0;e<a.length;++e){var f=a[e];if(!f.da&&f.listener==b&&f.capture==!!c&&f.ha==d)return e}return -1}var Na="closure_lm_"+(1E6*Math.random()|0),Oa={};function Qa(a,b,c,d,e){if(Array.isArray(b)){for(var f=0;f<b.length;f++)Qa(a,b[f],c,d,e);return null}c=Sa(c);return a&&a[D]?a.K(b,c,n(d)?!!d.capture:false,e):Ta(a,b,c,false,d,e)}
    function Ta(a,b,c,d,e,f){if(!b)throw Error("Invalid event type");var g=n(e)?!!e.capture:!!e,m=Ua(a);m||(a[Na]=m=new Ka(a));c=m.add(b,c,d,g,f);if(c.proxy)return c;d=Va();c.proxy=d;d.src=a;d.listener=c;if(a.addEventListener)Fa||(e=g),void 0===e&&(e=false),a.addEventListener(b.toString(),d,e);else if(a.attachEvent)a.attachEvent(Wa(b.toString()),d);else if(a.addListener&&a.removeListener)a.addListener(d);else throw Error("addEventListener and attachEvent are unavailable.");return c}
    function Va(){function a(c){return b.call(a.src,a.listener,c)}const b=Xa;return a}function Ya(a,b,c,d,e){if(Array.isArray(b))for(var f=0;f<b.length;f++)Ya(a,b[f],c,d,e);else (d=n(d)?!!d.capture:!!d,c=Sa(c),a&&a[D])?(a=a.i,b=String(b).toString(),b in a.g&&(f=a.g[b],c=La(f,c,d,e),-1<c&&(Ja(f[c]),Array.prototype.splice.call(f,c,1),0==f.length&&(delete a.g[b],a.h--)))):a&&(a=Ua(a))&&(b=a.g[b.toString()],a=-1,b&&(a=La(b,c,d,e)),(c=-1<a?b[a]:null)&&Za(c));}
    function Za(a){if("number"!==typeof a&&a&&!a.da){var b=a.src;if(b&&b[D])Ma(b.i,a);else {var c=a.type,d=a.proxy;b.removeEventListener?b.removeEventListener(c,d,a.capture):b.detachEvent?b.detachEvent(Wa(c),d):b.addListener&&b.removeListener&&b.removeListener(d);(c=Ua(b))?(Ma(c,a),0==c.h&&(c.src=null,b[Na]=null)):Ja(a);}}}function Wa(a){return a in Oa?Oa[a]:Oa[a]="on"+a}function Xa(a,b){if(a.da)a=true;else {b=new C(b,this);var c=a.listener,d=a.ha||a.src;a.fa&&Za(a);a=c.call(d,b);}return a}
    function Ua(a){a=a[Na];return a instanceof Ka?a:null}var $a="__closure_events_fn_"+(1E9*Math.random()>>>0);function Sa(a){if("function"===typeof a)return a;a[$a]||(a[$a]=function(b){return a.handleEvent(b)});return a[$a]}function E(){z.call(this);this.i=new Ka(this);this.M=this;this.F=null;}r(E,z);E.prototype[D]=true;E.prototype.removeEventListener=function(a,b,c,d){Ya(this,a,b,c,d);};
    function F(a,b){var c,d=a.F;if(d)for(c=[];d;d=d.F)c.push(d);a=a.M;d=b.type||b;if("string"===typeof b)b=new A(b,a);else if(b instanceof A)b.target=b.target||a;else {var e=b;b=new A(d,a);ua(b,e);}e=true;if(c)for(var f=c.length-1;0<=f;f--){var g=b.g=c[f];e=ab(g,d,true,b)&&e;}g=b.g=a;e=ab(g,d,true,b)&&e;e=ab(g,d,false,b)&&e;if(c)for(f=0;f<c.length;f++)g=b.g=c[f],e=ab(g,d,false,b)&&e;}
    E.prototype.N=function(){E.aa.N.call(this);if(this.i){var a=this.i,c;for(c in a.g){for(var d=a.g[c],e=0;e<d.length;e++)Ja(d[e]);delete a.g[c];a.h--;}}this.F=null;};E.prototype.K=function(a,b,c,d){return this.i.add(String(a),b,false,c,d)};E.prototype.L=function(a,b,c,d){return this.i.add(String(a),b,true,c,d)};
    function ab(a,b,c,d){b=a.i.g[String(b)];if(!b)return true;b=b.concat();for(var e=true,f=0;f<b.length;++f){var g=b[f];if(g&&!g.da&&g.capture==c){var m=g.listener,q=g.ha||g.src;g.fa&&Ma(a.i,g);e=false!==m.call(q,d)&&e;}}return e&&!d.defaultPrevented}function bb(a,b,c){if("function"===typeof a)c&&(a=p(a,c));else if(a&&"function"==typeof a.handleEvent)a=p(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<Number(b)?-1:k.setTimeout(a,b||0)}function cb(a){a.g=bb(()=>{a.g=null;a.i&&(a.i=false,cb(a));},a.l);const b=a.h;a.h=null;a.m.apply(null,b);}class eb extends z{constructor(a,b){super();this.m=a;this.l=b;this.h=null;this.i=false;this.g=null;}j(a){this.h=arguments;this.g?this.i=true:cb(this);}N(){super.N();this.g&&(k.clearTimeout(this.g),this.g=null,this.i=false,this.h=null);}}function G(a){z.call(this);this.h=a;this.g={};}r(G,z);var fb=[];function gb(a){qa(a.g,function(b,c){this.g.hasOwnProperty(c)&&Za(b);},a);a.g={};}G.prototype.N=function(){G.aa.N.call(this);gb(this);};G.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented");};var hb=k.JSON.stringify;var ib=k.JSON.parse;var jb=class{stringify(a){return k.JSON.stringify(a,void 0)}parse(a){return k.JSON.parse(a,void 0)}};function kb(){}kb.prototype.h=null;function lb(a){return a.h||(a.h=a.i())}function mb(){}var H={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function nb(){A.call(this,"d");}r(nb,A);function ob(){A.call(this,"c");}r(ob,A);var I={},pb=null;function qb(){return pb=pb||new E}I.La="serverreachability";function rb(a){A.call(this,I.La,a);}r(rb,A);function J(a){const b=qb();F(b,new rb(b));}I.STAT_EVENT="statevent";function sb(a,b){A.call(this,I.STAT_EVENT,a);this.stat=b;}r(sb,A);function K(a){const b=qb();F(b,new sb(b,a));}I.Ma="timingevent";function tb(a,b){A.call(this,I.Ma,a);this.size=b;}r(tb,A);
    function ub(a,b){if("function"!==typeof a)throw Error("Fn must not be null and must be a function");return k.setTimeout(function(){a();},b)}function vb(){this.g=true;}vb.prototype.xa=function(){this.g=false;};function wb(a,b,c,d,e,f){a.info(function(){if(a.g)if(f){var g="";for(var m=f.split("&"),q=0;q<m.length;q++){var l=m[q].split("=");if(1<l.length){var v=l[0];l=l[1];var w=v.split("_");g=2<=w.length&&"type"==w[1]?g+(v+"="+l+"&"):g+(v+"=redacted&");}}}else g=null;else g=f;return "XMLHTTP REQ ("+d+") [attempt "+e+"]: "+b+"\n"+c+"\n"+g});}
    function xb(a,b,c,d,e,f,g){a.info(function(){return "XMLHTTP RESP ("+d+") [ attempt "+e+"]: "+b+"\n"+c+"\n"+f+" "+g});}function L(a,b,c,d){a.info(function(){return "XMLHTTP TEXT ("+b+"): "+yb(a,c)+(d?" "+d:"")});}function zb(a,b){a.info(function(){return "TIMEOUT: "+b});}vb.prototype.info=function(){};
    function yb(a,b){if(!a.g)return b;if(!b)return null;try{var c=JSON.parse(b);if(c)for(a=0;a<c.length;a++)if(Array.isArray(c[a])){var d=c[a];if(!(2>d.length)){var e=d[1];if(Array.isArray(e)&&!(1>e.length)){var f=e[0];if("noop"!=f&&"stop"!=f&&"close"!=f)for(var g=1;g<e.length;g++)e[g]="";}}}return hb(c)}catch(m){return b}}var Ab={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9};var Bb={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"};var Cb;function Db(){}r(Db,kb);Db.prototype.g=function(){return new XMLHttpRequest};Db.prototype.i=function(){return {}};Cb=new Db;function M(a,b,c,d){this.j=a;this.i=b;this.l=c;this.R=d||1;this.U=new G(this);this.I=45E3;this.H=null;this.o=false;this.m=this.A=this.v=this.L=this.F=this.S=this.B=null;this.D=[];this.g=null;this.C=0;this.s=this.u=null;this.X=-1;this.J=false;this.O=0;this.M=null;this.W=this.K=this.T=this.P=false;this.h=new Eb;}function Eb(){this.i=null;this.g="";this.h=false;}var Fb={},Gb={};function Hb(a,b,c){a.L=1;a.v=Ib(N(b));a.m=c;a.P=true;Jb(a,null);}
    function Jb(a,b){a.F=Date.now();Kb(a);a.A=N(a.v);var c=a.A,d=a.R;Array.isArray(d)||(d=[String(d)]);Lb(c.i,"t",d);a.C=0;c=a.j.J;a.h=new Eb;a.g=Mb(a.j,c?b:null,!a.m);0<a.O&&(a.M=new eb(p(a.Y,a,a.g),a.O));b=a.U;c=a.g;d=a.ca;var e="readystatechange";Array.isArray(e)||(e&&(fb[0]=e.toString()),e=fb);for(var f=0;f<e.length;f++){var g=Qa(c,e[f],d||b.handleEvent,false,b.h||b);if(!g)break;b.g[g.key]=g;}b=a.H?sa(a.H):{};a.m?(a.u||(a.u="POST"),b["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.A,a.u,
    a.m,b)):(a.u="GET",a.g.ea(a.A,a.u,null,b));J();wb(a.i,a.u,a.A,a.l,a.R,a.m);}M.prototype.ca=function(a){a=a.target;const b=this.M;b&&3==P(a)?b.j():this.Y(a);};
    M.prototype.Y=function(a){try{if(a==this.g)a:{const w=P(this.g);var b=this.g.Ba();const O=this.g.Z();if(!(3>w)&&(3!=w||this.g&&(this.h.h||this.g.oa()||Nb(this.g)))){this.J||4!=w||7==b||(8==b||0>=O?J(3):J(2));Ob(this);var c=this.g.Z();this.X=c;b:if(Pb(this)){var d=Nb(this.g);a="";var e=d.length,f=4==P(this.g);if(!this.h.i){if("undefined"===typeof TextDecoder){Q(this);Qb(this);var g="";break b}this.h.i=new k.TextDecoder;}for(b=0;b<e;b++)this.h.h=!0,a+=this.h.i.decode(d[b],{stream:!(f&&b==e-1)});d.length=
    0;this.h.g+=a;this.C=0;g=this.h.g;}else g=this.g.oa();this.o=200==c;xb(this.i,this.u,this.A,this.l,this.R,w,c);if(this.o){if(this.T&&!this.K){b:{if(this.g){var m,q=this.g;if((m=q.g?q.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!t(m)){var l=m;break b}}l=null;}if(c=l)L(this.i,this.l,c,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,Rb(this,c);else {this.o=!1;this.s=3;K(12);Q(this);Qb(this);break a}}if(this.P){c=!0;let B;for(;!this.J&&this.C<g.length;)if(B=Sb(this,g),B==Gb){4==
    w&&(this.s=4,K(14),c=!1);L(this.i,this.l,null,"[Incomplete Response]");break}else if(B==Fb){this.s=4;K(15);L(this.i,this.l,g,"[Invalid Chunk]");c=!1;break}else L(this.i,this.l,B,null),Rb(this,B);Pb(this)&&0!=this.C&&(this.h.g=this.h.g.slice(this.C),this.C=0);4!=w||0!=g.length||this.h.h||(this.s=1,K(16),c=!1);this.o=this.o&&c;if(!c)L(this.i,this.l,g,"[Invalid Chunked Response]"),Q(this),Qb(this);else if(0<g.length&&!this.W){this.W=!0;var v=this.j;v.g==this&&v.ba&&!v.M&&(v.j.info("Great, no buffering proxy detected. Bytes received: "+
    g.length),Tb(v),v.M=!0,K(11));}}else L(this.i,this.l,g,null),Rb(this,g);4==w&&Q(this);this.o&&!this.J&&(4==w?Ub(this.j,this):(this.o=!1,Kb(this)));}else Vb(this.g),400==c&&0<g.indexOf("Unknown SID")?(this.s=3,K(12)):(this.s=0,K(13)),Q(this),Qb(this);}}}catch(w){}finally{}};function Pb(a){return a.g?"GET"==a.u&&2!=a.L&&a.j.Ca:false}
    function Sb(a,b){var c=a.C,d=b.indexOf("\n",c);if(-1==d)return Gb;c=Number(b.substring(c,d));if(isNaN(c))return Fb;d+=1;if(d+c>b.length)return Gb;b=b.slice(d,d+c);a.C=d+c;return b}M.prototype.cancel=function(){this.J=true;Q(this);};function Kb(a){a.S=Date.now()+a.I;Wb(a,a.I);}function Wb(a,b){if(null!=a.B)throw Error("WatchDog timer not null");a.B=ub(p(a.ba,a),b);}function Ob(a){a.B&&(k.clearTimeout(a.B),a.B=null);}
    M.prototype.ba=function(){this.B=null;const a=Date.now();0<=a-this.S?(zb(this.i,this.A),2!=this.L&&(J(),K(17)),Q(this),this.s=2,Qb(this)):Wb(this,this.S-a);};function Qb(a){0==a.j.G||a.J||Ub(a.j,a);}function Q(a){Ob(a);var b=a.M;b&&"function"==typeof b.ma&&b.ma();a.M=null;gb(a.U);a.g&&(b=a.g,a.g=null,b.abort(),b.ma());}
    function Rb(a,b){try{var c=a.j;if(0!=c.G&&(c.g==a||Xb(c.h,a)))if(!a.K&&Xb(c.h,a)&&3==c.G){try{var d=c.Da.g.parse(b);}catch(l){d=null;}if(Array.isArray(d)&&3==d.length){var e=d;if(0==e[0])a:{if(!c.u){if(c.g)if(c.g.F+3E3<a.F)Yb(c),Zb(c);else break a;$b(c);K(18);}}else c.za=e[1],0<c.za-c.T&&37500>e[2]&&c.F&&0==c.v&&!c.C&&(c.C=ub(p(c.Za,c),6E3));if(1>=ac(c.h)&&c.ca){try{c.ca();}catch(l){}c.ca=void 0;}}else R(c,11);}else if((a.K||c.g==a)&&Yb(c),!t(b))for(e=c.Da.g.parse(b),b=0;b<e.length;b++){let l=e[b];c.T=
    l[0];l=l[1];if(2==c.G)if("c"==l[0]){c.K=l[1];c.ia=l[2];const v=l[3];null!=v&&(c.la=v,c.j.info("VER="+c.la));const w=l[4];null!=w&&(c.Aa=w,c.j.info("SVER="+c.Aa));const O=l[5];null!=O&&"number"===typeof O&&0<O&&(d=1.5*O,c.L=d,c.j.info("backChannelRequestTimeoutMs_="+d));d=c;const B=a.g;if(B){const ya=B.g?B.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(ya){var f=d.h;f.g||-1==ya.indexOf("spdy")&&-1==ya.indexOf("quic")&&-1==ya.indexOf("h2")||(f.j=f.l,f.g=new Set,f.h&&(bc(f,f.h),f.h=null));}if(d.D){const db=
    B.g?B.g.getResponseHeader("X-HTTP-Session-Id"):null;db&&(d.ya=db,S(d.I,d.D,db));}}c.G=3;c.l&&c.l.ua();c.ba&&(c.R=Date.now()-a.F,c.j.info("Handshake RTT: "+c.R+"ms"));d=c;var g=a;d.qa=cc(d,d.J?d.ia:null,d.W);if(g.K){dc(d.h,g);var m=g,q=d.L;q&&(m.I=q);m.B&&(Ob(m),Kb(m));d.g=g;}else ec(d);0<c.i.length&&fc(c);}else "stop"!=l[0]&&"close"!=l[0]||R(c,7);else 3==c.G&&("stop"==l[0]||"close"==l[0]?"stop"==l[0]?R(c,7):gc(c):"noop"!=l[0]&&c.l&&c.l.ta(l),c.v=0);}J(4);}catch(l){}}var hc=class{constructor(a,b){this.g=a;this.map=b;}};function ic(a){this.l=a||10;k.PerformanceNavigationTiming?(a=k.performance.getEntriesByType("navigation"),a=0<a.length&&("hq"==a[0].nextHopProtocol||"h2"==a[0].nextHopProtocol)):a=!!(k.chrome&&k.chrome.loadTimes&&k.chrome.loadTimes()&&k.chrome.loadTimes().wasFetchedViaSpdy);this.j=a?this.l:1;this.g=null;1<this.j&&(this.g=new Set);this.h=null;this.i=[];}function jc(a){return a.h?true:a.g?a.g.size>=a.j:false}function ac(a){return a.h?1:a.g?a.g.size:0}function Xb(a,b){return a.h?a.h==b:a.g?a.g.has(b):false}
    function bc(a,b){a.g?a.g.add(b):a.h=b;}function dc(a,b){a.h&&a.h==b?a.h=null:a.g&&a.g.has(b)&&a.g.delete(b);}ic.prototype.cancel=function(){this.i=kc(this);if(this.h)this.h.cancel(),this.h=null;else if(this.g&&0!==this.g.size){for(const a of this.g.values())a.cancel();this.g.clear();}};function kc(a){if(null!=a.h)return a.i.concat(a.h.D);if(null!=a.g&&0!==a.g.size){let b=a.i;for(const c of a.g.values())b=b.concat(c.D);return b}return la(a.i)}function lc(a){if(a.V&&"function"==typeof a.V)return a.V();if("undefined"!==typeof Map&&a instanceof Map||"undefined"!==typeof Set&&a instanceof Set)return Array.from(a.values());if("string"===typeof a)return a.split("");if(ha(a)){for(var b=[],c=a.length,d=0;d<c;d++)b.push(a[d]);return b}b=[];c=0;for(d in a)b[c++]=a[d];return b}
    function mc(a){if(a.na&&"function"==typeof a.na)return a.na();if(!a.V||"function"!=typeof a.V){if("undefined"!==typeof Map&&a instanceof Map)return Array.from(a.keys());if(!("undefined"!==typeof Set&&a instanceof Set)){if(ha(a)||"string"===typeof a){var b=[];a=a.length;for(var c=0;c<a;c++)b.push(c);return b}b=[];c=0;for(const d in a)b[c++]=d;return b}}}
    function nc(a,b){if(a.forEach&&"function"==typeof a.forEach)a.forEach(b,void 0);else if(ha(a)||"string"===typeof a)Array.prototype.forEach.call(a,b,void 0);else for(var c=mc(a),d=lc(a),e=d.length,f=0;f<e;f++)b.call(void 0,d[f],c&&c[f],a);}var oc=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function pc(a,b){if(a){a=a.split("&");for(var c=0;c<a.length;c++){var d=a[c].indexOf("="),e=null;if(0<=d){var f=a[c].substring(0,d);e=a[c].substring(d+1);}else f=a[c];b(f,e?decodeURIComponent(e.replace(/\+/g," ")):"");}}}function T(a){this.g=this.o=this.j="";this.s=null;this.m=this.l="";this.h=false;if(a instanceof T){this.h=a.h;qc(this,a.j);this.o=a.o;this.g=a.g;rc(this,a.s);this.l=a.l;var b=a.i;var c=new sc;c.i=b.i;b.g&&(c.g=new Map(b.g),c.h=b.h);tc(this,c);this.m=a.m;}else a&&(b=String(a).match(oc))?(this.h=false,qc(this,b[1]||"",true),this.o=uc(b[2]||""),this.g=uc(b[3]||"",true),rc(this,b[4]),this.l=uc(b[5]||"",true),tc(this,b[6]||"",true),this.m=uc(b[7]||"")):(this.h=false,this.i=new sc(null,this.h));}
    T.prototype.toString=function(){var a=[],b=this.j;b&&a.push(vc(b,wc,true),":");var c=this.g;if(c||"file"==b)a.push("//"),(b=this.o)&&a.push(vc(b,wc,true),"@"),a.push(encodeURIComponent(String(c)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),c=this.s,null!=c&&a.push(":",String(c));if(c=this.l)this.g&&"/"!=c.charAt(0)&&a.push("/"),a.push(vc(c,"/"==c.charAt(0)?xc:yc,true));(c=this.i.toString())&&a.push("?",c);(c=this.m)&&a.push("#",vc(c,zc));return a.join("")};function N(a){return new T(a)}
    function qc(a,b,c){a.j=c?uc(b,true):b;a.j&&(a.j=a.j.replace(/:$/,""));}function rc(a,b){if(b){b=Number(b);if(isNaN(b)||0>b)throw Error("Bad port number "+b);a.s=b;}else a.s=null;}function tc(a,b,c){b instanceof sc?(a.i=b,Ac(a.i,a.h)):(c||(b=vc(b,Bc)),a.i=new sc(b,a.h));}function S(a,b,c){a.i.set(b,c);}function Ib(a){S(a,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36));return a}
    function uc(a,b){return a?b?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function vc(a,b,c){return "string"===typeof a?(a=encodeURI(a).replace(b,Cc),c&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function Cc(a){a=a.charCodeAt(0);return "%"+(a>>4&15).toString(16)+(a&15).toString(16)}var wc=/[#\/\?@]/g,yc=/[#\?:]/g,xc=/[#\?]/g,Bc=/[#\?@]/g,zc=/#/g;function sc(a,b){this.h=this.g=null;this.i=a||null;this.j=!!b;}
    function U(a){a.g||(a.g=new Map,a.h=0,a.i&&pc(a.i,function(b,c){a.add(decodeURIComponent(b.replace(/\+/g," ")),c);}));}h=sc.prototype;h.add=function(a,b){U(this);this.i=null;a=V(this,a);var c=this.g.get(a);c||this.g.set(a,c=[]);c.push(b);this.h+=1;return this};function Dc(a,b){U(a);b=V(a,b);a.g.has(b)&&(a.i=null,a.h-=a.g.get(b).length,a.g.delete(b));}function Ec(a,b){U(a);b=V(a,b);return a.g.has(b)}
    h.forEach=function(a,b){U(this);this.g.forEach(function(c,d){c.forEach(function(e){a.call(b,e,d,this);},this);},this);};h.na=function(){U(this);const a=Array.from(this.g.values()),b=Array.from(this.g.keys()),c=[];for(let d=0;d<b.length;d++){const e=a[d];for(let f=0;f<e.length;f++)c.push(b[d]);}return c};h.V=function(a){U(this);let b=[];if("string"===typeof a)Ec(this,a)&&(b=b.concat(this.g.get(V(this,a))));else {a=Array.from(this.g.values());for(let c=0;c<a.length;c++)b=b.concat(a[c]);}return b};
    h.set=function(a,b){U(this);this.i=null;a=V(this,a);Ec(this,a)&&(this.h-=this.g.get(a).length);this.g.set(a,[b]);this.h+=1;return this};h.get=function(a,b){if(!a)return b;a=this.V(a);return 0<a.length?String(a[0]):b};function Lb(a,b,c){Dc(a,b);0<c.length&&(a.i=null,a.g.set(V(a,b),la(c)),a.h+=c.length);}
    h.toString=function(){if(this.i)return this.i;if(!this.g)return "";const a=[],b=Array.from(this.g.keys());for(var c=0;c<b.length;c++){var d=b[c];const f=encodeURIComponent(String(d)),g=this.V(d);for(d=0;d<g.length;d++){var e=f;""!==g[d]&&(e+="="+encodeURIComponent(String(g[d])));a.push(e);}}return this.i=a.join("&")};function V(a,b){b=String(b);a.j&&(b=b.toLowerCase());return b}
    function Ac(a,b){b&&!a.j&&(U(a),a.i=null,a.g.forEach(function(c,d){var e=d.toLowerCase();d!=e&&(Dc(this,d),Lb(this,e,c));},a));a.j=b;}function Fc(a,b){const c=new vb;if(k.Image){const d=new Image;d.onload=ka(W,c,"TestLoadImage: loaded",true,b,d);d.onerror=ka(W,c,"TestLoadImage: error",false,b,d);d.onabort=ka(W,c,"TestLoadImage: abort",false,b,d);d.ontimeout=ka(W,c,"TestLoadImage: timeout",false,b,d);k.setTimeout(function(){if(d.ontimeout)d.ontimeout();},1E4);d.src=a;}else b(false);}
    function Gc(a,b){const c=new vb,d=new AbortController,e=setTimeout(()=>{d.abort();W(c,"TestPingServer: timeout",false,b);},1E4);fetch(a,{signal:d.signal}).then(f=>{clearTimeout(e);f.ok?W(c,"TestPingServer: ok",true,b):W(c,"TestPingServer: server error",false,b);}).catch(()=>{clearTimeout(e);W(c,"TestPingServer: error",false,b);});}function W(a,b,c,d,e){try{e&&(e.onload=null,e.onerror=null,e.onabort=null,e.ontimeout=null),d(c);}catch(f){}}function Hc(){this.g=new jb;}function Ic(a,b,c){const d=c||"";try{nc(a,function(e,f){let g=e;n(e)&&(g=hb(e));b.push(d+f+"="+encodeURIComponent(g));});}catch(e){throw b.push(d+"type="+encodeURIComponent("_badmap")),e;}}function Jc(a){this.l=a.Ub||null;this.j=a.eb||false;}r(Jc,kb);Jc.prototype.g=function(){return new Kc(this.l,this.j)};Jc.prototype.i=function(a){return function(){return a}}({});function Kc(a,b){E.call(this);this.D=a;this.o=b;this.m=void 0;this.status=this.readyState=0;this.responseType=this.responseText=this.response=this.statusText="";this.onreadystatechange=null;this.u=new Headers;this.h=null;this.B="GET";this.A="";this.g=false;this.v=this.j=this.l=null;}r(Kc,E);h=Kc.prototype;
    h.open=function(a,b){if(0!=this.readyState)throw this.abort(),Error("Error reopening a connection");this.B=a;this.A=b;this.readyState=1;Lc(this);};h.send=function(a){if(1!=this.readyState)throw this.abort(),Error("need to call open() first. ");this.g=true;const b={headers:this.u,method:this.B,credentials:this.m,cache:void 0};a&&(b.body=a);(this.D||k).fetch(new Request(this.A,b)).then(this.Sa.bind(this),this.ga.bind(this));};
    h.abort=function(){this.response=this.responseText="";this.u=new Headers;this.status=0;this.j&&this.j.cancel("Request was aborted.").catch(()=>{});1<=this.readyState&&this.g&&4!=this.readyState&&(this.g=false,Mc(this));this.readyState=0;};
    h.Sa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,Lc(this)),this.g&&(this.readyState=3,Lc(this),this.g)))if("arraybuffer"===this.responseType)a.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if("undefined"!==typeof k.ReadableStream&&"body"in a){this.j=a.body.getReader();if(this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=
    [];}else this.response=this.responseText="",this.v=new TextDecoder;Nc(this);}else a.text().then(this.Ra.bind(this),this.ga.bind(this));};function Nc(a){a.j.read().then(a.Pa.bind(a)).catch(a.ga.bind(a));}h.Pa=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var b=a.value?a.value:new Uint8Array(0);if(b=this.v.decode(b,{stream:!a.done}))this.response=this.responseText+=b;}a.done?Mc(this):Lc(this);3==this.readyState&&Nc(this);}};
    h.Ra=function(a){this.g&&(this.response=this.responseText=a,Mc(this));};h.Qa=function(a){this.g&&(this.response=a,Mc(this));};h.ga=function(){this.g&&Mc(this);};function Mc(a){a.readyState=4;a.l=null;a.j=null;a.v=null;Lc(a);}h.setRequestHeader=function(a,b){this.u.append(a,b);};h.getResponseHeader=function(a){return this.h?this.h.get(a.toLowerCase())||"":""};
    h.getAllResponseHeaders=function(){if(!this.h)return "";const a=[],b=this.h.entries();for(var c=b.next();!c.done;)c=c.value,a.push(c[0]+": "+c[1]),c=b.next();return a.join("\r\n")};function Lc(a){a.onreadystatechange&&a.onreadystatechange.call(a);}Object.defineProperty(Kc.prototype,"withCredentials",{get:function(){return "include"===this.m},set:function(a){this.m=a?"include":"same-origin";}});function Oc(a){let b="";qa(a,function(c,d){b+=d;b+=":";b+=c;b+="\r\n";});return b}function Pc(a,b,c){a:{for(d in c){var d=false;break a}d=true;}d||(c=Oc(c),"string"===typeof a?(null!=c&&encodeURIComponent(String(c))):S(a,b,c));}function X(a){E.call(this);this.headers=new Map;this.o=a||null;this.h=false;this.v=this.g=null;this.D="";this.m=0;this.l="";this.j=this.B=this.u=this.A=false;this.I=null;this.H="";this.J=false;}r(X,E);var Qc=/^https?$/i,Rc=["POST","PUT"];h=X.prototype;h.Ha=function(a){this.J=a;};
    h.ea=function(a,b,c,d){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);b=b?b.toUpperCase():"GET";this.D=a;this.l="";this.m=0;this.A=false;this.h=true;this.g=this.o?this.o.g():Cb.g();this.v=this.o?lb(this.o):lb(Cb);this.g.onreadystatechange=p(this.Ea,this);try{this.B=!0,this.g.open(b,String(a),!0),this.B=!1;}catch(f){Sc(this,f);return}a=c||"";c=new Map(this.headers);if(d)if(Object.getPrototypeOf(d)===Object.prototype)for(var e in d)c.set(e,d[e]);else if("function"===
    typeof d.keys&&"function"===typeof d.get)for(const f of d.keys())c.set(f,d.get(f));else throw Error("Unknown input type for opt_headers: "+String(d));d=Array.from(c.keys()).find(f=>"content-type"==f.toLowerCase());e=k.FormData&&a instanceof k.FormData;!(0<=Array.prototype.indexOf.call(Rc,b,void 0))||d||e||c.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const [f,g]of c)this.g.setRequestHeader(f,g);this.H&&(this.g.responseType=this.H);"withCredentials"in this.g&&this.g.withCredentials!==
    this.J&&(this.g.withCredentials=this.J);try{Tc(this),this.u=!0,this.g.send(a),this.u=!1;}catch(f){Sc(this,f);}};function Sc(a,b){a.h=false;a.g&&(a.j=true,a.g.abort(),a.j=false);a.l=b;a.m=5;Uc(a);Vc(a);}function Uc(a){a.A||(a.A=true,F(a,"complete"),F(a,"error"));}h.abort=function(a){this.g&&this.h&&(this.h=false,this.j=true,this.g.abort(),this.j=false,this.m=a||7,F(this,"complete"),F(this,"abort"),Vc(this));};h.N=function(){this.g&&(this.h&&(this.h=false,this.j=true,this.g.abort(),this.j=false),Vc(this,true));X.aa.N.call(this);};
    h.Ea=function(){this.s||(this.B||this.u||this.j?Wc(this):this.bb());};h.bb=function(){Wc(this);};
    function Wc(a){if(a.h&&"undefined"!=typeof fa&&(!a.v[1]||4!=P(a)||2!=a.Z()))if(a.u&&4==P(a))bb(a.Ea,0,a);else if(F(a,"readystatechange"),4==P(a)){a.h=false;try{const g=a.Z();a:switch(g){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var b=!0;break a;default:b=!1;}var c;if(!(c=b)){var d;if(d=0===g){var e=String(a.D).match(oc)[1]||null;!e&&k.self&&k.self.location&&(e=k.self.location.protocol.slice(0,-1));d=!Qc.test(e?e.toLowerCase():"");}c=d;}if(c)F(a,"complete"),F(a,"success");else {a.m=
    6;try{var f=2<P(a)?a.g.statusText:"";}catch(m){f="";}a.l=f+" ["+a.Z()+"]";Uc(a);}}finally{Vc(a);}}}function Vc(a,b){if(a.g){Tc(a);const c=a.g,d=a.v[0]?()=>{}:null;a.g=null;a.v=null;b||F(a,"ready");try{c.onreadystatechange=d;}catch(e){}}}function Tc(a){a.I&&(k.clearTimeout(a.I),a.I=null);}h.isActive=function(){return !!this.g};function P(a){return a.g?a.g.readyState:0}h.Z=function(){try{return 2<P(this)?this.g.status:-1}catch(a){return -1}};h.oa=function(){try{return this.g?this.g.responseText:""}catch(a){return ""}};
    h.Oa=function(a){if(this.g){var b=this.g.responseText;a&&0==b.indexOf(a)&&(b=b.substring(a.length));return ib(b)}};function Nb(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.H){case "":case "text":return a.g.responseText;case "arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch(b){return null}}
    function Vb(a){const b={};a=(a.g&&2<=P(a)?a.g.getAllResponseHeaders()||"":"").split("\r\n");for(let d=0;d<a.length;d++){if(t(a[d]))continue;var c=va(a[d]);const e=c[0];c=c[1];if("string"!==typeof c)continue;c=c.trim();const f=b[e]||[];b[e]=f;f.push(c);}ra(b,function(d){return d.join(", ")});}h.Ba=function(){return this.m};h.Ka=function(){return "string"===typeof this.l?this.l:String(this.l)};function Xc(a,b,c){return c&&c.internalChannelParams?c.internalChannelParams[a]||b:b}
    function Yc(a){this.Aa=0;this.i=[];this.j=new vb;this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null;this.Ya=this.U=0;this.Va=Xc("failFast",false,a);this.F=this.C=this.u=this.s=this.l=null;this.X=true;this.za=this.T=-1;this.Y=this.v=this.B=0;this.Ta=Xc("baseRetryDelayMs",5E3,a);this.cb=Xc("retryDelaySeedMs",1E4,a);this.Wa=Xc("forwardChannelMaxRetries",2,a);this.wa=Xc("forwardChannelRequestTimeoutMs",2E4,a);this.pa=a&&a.xmlHttpFactory||void 0;this.Xa=a&&a.Tb||void 0;this.Ca=
    a&&a.useFetchStreams||false;this.L=void 0;this.J=a&&a.supportsCrossDomainXhr||false;this.K="";this.h=new ic(a&&a.concurrentRequestLimit);this.Da=new Hc;this.P=a&&a.fastHandshake||false;this.O=a&&a.encodeInitMessageHeaders||false;this.P&&this.O&&(this.O=false);this.Ua=a&&a.Rb||false;a&&a.xa&&this.j.xa();a&&a.forceLongPolling&&(this.X=false);this.ba=!this.P&&this.X&&a&&a.detectBufferingProxy||false;this.ja=void 0;a&&a.longPollingTimeout&&0<a.longPollingTimeout&&(this.ja=a.longPollingTimeout);this.ca=void 0;this.R=0;this.M=
    false;this.ka=this.A=null;}h=Yc.prototype;h.la=8;h.G=1;h.connect=function(a,b,c,d){K(0);this.W=a;this.H=b||{};c&&void 0!==d&&(this.H.OSID=c,this.H.OAID=d);this.F=this.X;this.I=cc(this,null,this.W);fc(this);};
    function gc(a){Zc(a);if(3==a.G){var b=a.U++,c=N(a.I);S(c,"SID",a.K);S(c,"RID",b);S(c,"TYPE","terminate");$c(a,c);b=new M(a,a.j,b);b.L=2;b.v=Ib(N(c));c=false;if(k.navigator&&k.navigator.sendBeacon)try{c=k.navigator.sendBeacon(b.v.toString(),"");}catch(d){}!c&&k.Image&&((new Image).src=b.v,c=true);c||(b.g=Mb(b.j,null),b.g.ea(b.v));b.F=Date.now();Kb(b);}ad(a);}function Zb(a){a.g&&(Tb(a),a.g.cancel(),a.g=null);}
    function Zc(a){Zb(a);a.u&&(k.clearTimeout(a.u),a.u=null);Yb(a);a.h.cancel();a.s&&("number"===typeof a.s&&k.clearTimeout(a.s),a.s=null);}function fc(a){if(!jc(a.h)&&!a.s){a.s=true;var b=a.Ga;x||Ea();y||(x(),y=true);za.add(b,a);a.B=0;}}function bd(a,b){if(ac(a.h)>=a.h.j-(a.s?1:0))return false;if(a.s)return a.i=b.D.concat(a.i),true;if(1==a.G||2==a.G||a.B>=(a.Va?0:a.Wa))return false;a.s=ub(p(a.Ga,a,b),cd(a,a.B));a.B++;return true}
    h.Ga=function(a){if(this.s)if(this.s=null,1==this.G){if(!a){this.U=Math.floor(1E5*Math.random());a=this.U++;const e=new M(this,this.j,a);let f=this.o;this.S&&(f?(f=sa(f),ua(f,this.S)):f=this.S);null!==this.m||this.O||(e.H=f,f=null);if(this.P)a:{var b=0;for(var c=0;c<this.i.length;c++){b:{var d=this.i[c];if("__data__"in d.map&&(d=d.map.__data__,"string"===typeof d)){d=d.length;break b}d=void 0;}if(void 0===d)break;b+=d;if(4096<b){b=c;break a}if(4096===b||c===this.i.length-1){b=c+1;break a}}b=1E3;}else b=
    1E3;b=dd(this,e,b);c=N(this.I);S(c,"RID",a);S(c,"CVER",22);this.D&&S(c,"X-HTTP-Session-Id",this.D);$c(this,c);f&&(this.O?b="headers="+encodeURIComponent(String(Oc(f)))+"&"+b:this.m&&Pc(c,this.m,f));bc(this.h,e);this.Ua&&S(c,"TYPE","init");this.P?(S(c,"$req",b),S(c,"SID","null"),e.T=true,Hb(e,c,null)):Hb(e,c,b);this.G=2;}}else 3==this.G&&(a?ed(this,a):0==this.i.length||jc(this.h)||ed(this));};
    function ed(a,b){var c;b?c=b.l:c=a.U++;const d=N(a.I);S(d,"SID",a.K);S(d,"RID",c);S(d,"AID",a.T);$c(a,d);a.m&&a.o&&Pc(d,a.m,a.o);c=new M(a,a.j,c,a.B+1);null===a.m&&(c.H=a.o);b&&(a.i=b.D.concat(a.i));b=dd(a,c,1E3);c.I=Math.round(.5*a.wa)+Math.round(.5*a.wa*Math.random());bc(a.h,c);Hb(c,d,b);}function $c(a,b){a.H&&qa(a.H,function(c,d){S(b,d,c);});a.l&&nc({},function(c,d){S(b,d,c);});}
    function dd(a,b,c){c=Math.min(a.i.length,c);var d=a.l?p(a.l.Na,a.l,a):null;a:{var e=a.i;let f=-1;for(;;){const g=["count="+c];-1==f?0<c?(f=e[0].g,g.push("ofs="+f)):f=0:g.push("ofs="+f);let m=true;for(let q=0;q<c;q++){let l=e[q].g;const v=e[q].map;l-=f;if(0>l)f=Math.max(0,e[q].g-100),m=false;else try{Ic(v,g,"req"+l+"_");}catch(w){d&&d(v);}}if(m){d=g.join("&");break a}}}a=a.i.splice(0,c);b.D=a;return d}function ec(a){if(!a.g&&!a.u){a.Y=1;var b=a.Fa;x||Ea();y||(x(),y=true);za.add(b,a);a.v=0;}}
    function $b(a){if(a.g||a.u||3<=a.v)return false;a.Y++;a.u=ub(p(a.Fa,a),cd(a,a.v));a.v++;return true}h.Fa=function(){this.u=null;fd(this);if(this.ba&&!(this.M||null==this.g||0>=this.R)){var a=2*this.R;this.j.info("BP detection timer enabled: "+a);this.A=ub(p(this.ab,this),a);}};h.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=false,this.M=true,K(10),Zb(this),fd(this));};
    function Tb(a){null!=a.A&&(k.clearTimeout(a.A),a.A=null);}function fd(a){a.g=new M(a,a.j,"rpc",a.Y);null===a.m&&(a.g.H=a.o);a.g.O=0;var b=N(a.qa);S(b,"RID","rpc");S(b,"SID",a.K);S(b,"AID",a.T);S(b,"CI",a.F?"0":"1");!a.F&&a.ja&&S(b,"TO",a.ja);S(b,"TYPE","xmlhttp");$c(a,b);a.m&&a.o&&Pc(b,a.m,a.o);a.L&&(a.g.I=a.L);var c=a.g;a=a.ia;c.L=1;c.v=Ib(N(b));c.m=null;c.P=true;Jb(c,a);}h.Za=function(){null!=this.C&&(this.C=null,Zb(this),$b(this),K(19));};function Yb(a){null!=a.C&&(k.clearTimeout(a.C),a.C=null);}
    function Ub(a,b){var c=null;if(a.g==b){Yb(a);Tb(a);a.g=null;var d=2;}else if(Xb(a.h,b))c=b.D,dc(a.h,b),d=1;else return;if(0!=a.G)if(b.o)if(1==d){c=b.m?b.m.length:0;b=Date.now()-b.F;var e=a.B;d=qb();F(d,new tb(d,c));fc(a);}else ec(a);else if(e=b.s,3==e||0==e&&0<b.X||!(1==d&&bd(a,b)||2==d&&$b(a)))switch(c&&0<c.length&&(b=a.h,b.i=b.i.concat(c)),e){case 1:R(a,5);break;case 4:R(a,10);break;case 3:R(a,6);break;default:R(a,2);}}
    function cd(a,b){let c=a.Ta+Math.floor(Math.random()*a.cb);a.isActive()||(c*=2);return c*b}function R(a,b){a.j.info("Error code "+b);if(2==b){var c=p(a.fb,a),d=a.Xa;const e=!d;d=new T(d||"//www.google.com/images/cleardot.gif");k.location&&"http"==k.location.protocol||qc(d,"https");Ib(d);e?Fc(d.toString(),c):Gc(d.toString(),c);}else K(2);a.G=0;a.l&&a.l.sa(b);ad(a);Zc(a);}h.fb=function(a){a?(this.j.info("Successfully pinged google.com"),K(2)):(this.j.info("Failed to ping google.com"),K(1));};
    function ad(a){a.G=0;a.ka=[];if(a.l){const b=kc(a.h);if(0!=b.length||0!=a.i.length)ma(a.ka,b),ma(a.ka,a.i),a.h.i.length=0,la(a.i),a.i.length=0;a.l.ra();}}function cc(a,b,c){var d=c instanceof T?N(c):new T(c);if(""!=d.g)b&&(d.g=b+"."+d.g),rc(d,d.s);else {var e=k.location;d=e.protocol;b=b?b+"."+e.hostname:e.hostname;e=+e.port;var f=new T(null);d&&qc(f,d);b&&(f.g=b);e&&rc(f,e);c&&(f.l=c);d=f;}c=a.D;b=a.ya;c&&b&&S(d,c,b);S(d,"VER",a.la);$c(a,d);return d}
    function Mb(a,b,c){if(b&&!a.J)throw Error("Can't create secondary domain capable XhrIo object.");b=a.Ca&&!a.pa?new X(new Jc({eb:c})):new X(a.pa);b.Ha(a.J);return b}h.isActive=function(){return !!this.l&&this.l.isActive(this)};function gd(){}h=gd.prototype;h.ua=function(){};h.ta=function(){};h.sa=function(){};h.ra=function(){};h.isActive=function(){return true};h.Na=function(){};function hd(){}hd.prototype.g=function(a,b){return new Y(a,b)};
    function Y(a,b){E.call(this);this.g=new Yc(b);this.l=a;this.h=b&&b.messageUrlParams||null;a=b&&b.messageHeaders||null;b&&b.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"});this.g.o=a;a=b&&b.initMessageHeaders||null;b&&b.messageContentType&&(a?a["X-WebChannel-Content-Type"]=b.messageContentType:a={"X-WebChannel-Content-Type":b.messageContentType});b&&b.va&&(a?a["X-WebChannel-Client-Profile"]=b.va:a={"X-WebChannel-Client-Profile":b.va});this.g.S=
    a;(a=b&&b.Sb)&&!t(a)&&(this.g.m=a);this.v=b&&b.supportsCrossDomainXhr||false;this.u=b&&b.sendRawJson||false;(b=b&&b.httpSessionIdParam)&&!t(b)&&(this.g.D=b,a=this.h,null!==a&&b in a&&(a=this.h,b in a&&delete a[b]));this.j=new Z(this);}r(Y,E);Y.prototype.m=function(){this.g.l=this.j;this.v&&(this.g.J=true);this.g.connect(this.l,this.h||void 0);};Y.prototype.close=function(){gc(this.g);};
    Y.prototype.o=function(a){var b=this.g;if("string"===typeof a){var c={};c.__data__=a;a=c;}else this.u&&(c={},c.__data__=hb(a),a=c);b.i.push(new hc(b.Ya++,a));3==b.G&&fc(b);};Y.prototype.N=function(){this.g.l=null;delete this.j;gc(this.g);delete this.g;Y.aa.N.call(this);};
    function id(a){nb.call(this);a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var b=a.__sm__;if(b){a:{for(const c in b){a=c;break a}a=void 0;}if(this.i=a)a=this.i,b=null!==b&&a in b?b[a]:void 0;this.data=b;}else this.data=a;}r(id,nb);function jd(){ob.call(this);this.status=1;}r(jd,ob);function Z(a){this.g=a;}r(Z,gd);Z.prototype.ua=function(){F(this.g,"a");};Z.prototype.ta=function(a){F(this.g,new id(a));};
    Z.prototype.sa=function(a){F(this.g,new jd());};Z.prototype.ra=function(){F(this.g,"b");};hd.prototype.createWebChannel=hd.prototype.g;Y.prototype.send=Y.prototype.o;Y.prototype.open=Y.prototype.m;Y.prototype.close=Y.prototype.close;createWebChannelTransport = function(){return new hd};getStatEventTarget = function(){return qb()};Event = I;Stat = {mb:0,pb:1,qb:2,Jb:3,Ob:4,Lb:5,Mb:6,Kb:7,Ib:8,Nb:9,PROXY:10,NOPROXY:11,Gb:12,Cb:13,Db:14,Bb:15,Eb:16,Fb:17,ib:18,hb:19,jb:20};Ab.NO_ERROR=0;Ab.TIMEOUT=8;Ab.HTTP_ERROR=6;
    ErrorCode = Ab;Bb.COMPLETE="complete";EventType = Bb;mb.EventType=H;H.OPEN="a";H.CLOSE="b";H.ERROR="c";H.MESSAGE="d";E.prototype.listen=E.prototype.K;WebChannel = mb;X.prototype.listenOnce=X.prototype.L;X.prototype.getLastError=X.prototype.Ka;X.prototype.getLastErrorCode=X.prototype.Ba;X.prototype.getStatus=X.prototype.Z;X.prototype.getResponseJson=X.prototype.Oa;X.prototype.getResponseText=X.prototype.oa;
    X.prototype.send=X.prototype.ea;X.prototype.setWithCredentials=X.prototype.Ha;XhrIo = X;}).apply( typeof commonjsGlobal !== 'undefined' ? commonjsGlobal : typeof self !== 'undefined' ? self  : typeof window !== 'undefined' ? window  : {});

    const S = "@firebase/firestore", D = "4.7.11";

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Simple wrapper around a nullable UID. Mostly exists to make code more
     * readable.
     */
    class User {
        constructor(e) {
            this.uid = e;
        }
        isAuthenticated() {
            return null != this.uid;
        }
        /**
         * Returns a key representing this user, suitable for inclusion in a
         * dictionary.
         */    toKey() {
            return this.isAuthenticated() ? "uid:" + this.uid : "anonymous-user";
        }
        isEqual(e) {
            return e.uid === this.uid;
        }
    }

    /** A user with a null UID. */ User.UNAUTHENTICATED = new User(null), 
    // TODO(mikelehen): Look into getting a proper uid-equivalent for
    // non-FirebaseAuth providers.
    User.GOOGLE_CREDENTIALS = new User("google-credentials-uid"), User.FIRST_PARTY = new User("first-party-uid"), 
    User.MOCK_USER = new User("mock-user");

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    let v = "11.6.1";

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const C = new Logger("@firebase/firestore");

    // Helper methods are needed because variables can't be exported as read/write
    function __PRIVATE_getLogLevel() {
        return C.logLevel;
    }

    function __PRIVATE_logDebug(e, ...t) {
        if (C.logLevel <= LogLevel.DEBUG) {
            const n = t.map(__PRIVATE_argToString);
            C.debug(`Firestore (${v}): ${e}`, ...n);
        }
    }

    function __PRIVATE_logError(e, ...t) {
        if (C.logLevel <= LogLevel.ERROR) {
            const n = t.map(__PRIVATE_argToString);
            C.error(`Firestore (${v}): ${e}`, ...n);
        }
    }

    /**
     * @internal
     */ function __PRIVATE_logWarn(e, ...t) {
        if (C.logLevel <= LogLevel.WARN) {
            const n = t.map(__PRIVATE_argToString);
            C.warn(`Firestore (${v}): ${e}`, ...n);
        }
    }

    /**
     * Converts an additional log parameter to a string representation.
     */ function __PRIVATE_argToString(e) {
        if ("string" == typeof e) return e;
        try {
            /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
            /** Formats an object as a JSON string, suitable for logging. */
            return function __PRIVATE_formatJSON(e) {
                return JSON.stringify(e);
            }(e);
        } catch (t) {
            // Converting to JSON failed, just log the object directly
            return e;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ function fail(e, t, n) {
        let r = "Unexpected state";
        "string" == typeof t ? r = t : n = t, __PRIVATE__fail(e, r, n);
    }

    function __PRIVATE__fail(e, t, n) {
        // Log the failure in addition to throw an exception, just in case the
        // exception is swallowed.
        let r = `FIRESTORE (${v}) INTERNAL ASSERTION FAILED: ${t} (ID: ${e.toString(16)})`;
        if (void 0 !== n) try {
            r += " CONTEXT: " + JSON.stringify(n);
        } catch (e) {
            r += " CONTEXT: " + n;
        }
        // NOTE: We don't use FirestoreError here because these are internal failures
        // that cannot be handled by the user. (Also it would create a circular
        // dependency between the error and assert modules which doesn't work.)
        throw __PRIVATE_logError(r), new Error(r);
    }

    function __PRIVATE_hardAssert(e, t, n, r) {
        let i = "Unexpected state";
        "string" == typeof n ? i = n : r = n, e || __PRIVATE__fail(t, i, r);
    }

    /**
     * Casts `obj` to `T`. In non-production builds, verifies that `obj` is an
     * instance of `T` before casting.
     */ function __PRIVATE_debugCast(e, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t) {
        return e;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const F = {
        // Causes are copied from:
        // https://github.com/grpc/grpc/blob/bceec94ea4fc5f0085d81235d8e1c06798dc341a/include/grpc%2B%2B/impl/codegen/status_code_enum.h
        /** Not an error; returned on success. */
        OK: "ok",
        /** The operation was cancelled (typically by the caller). */
        CANCELLED: "cancelled",
        /** Unknown error or an error from a different error domain. */
        UNKNOWN: "unknown",
        /**
         * Client specified an invalid argument. Note that this differs from
         * FAILED_PRECONDITION. INVALID_ARGUMENT indicates arguments that are
         * problematic regardless of the state of the system (e.g., a malformed file
         * name).
         */
        INVALID_ARGUMENT: "invalid-argument",
        /**
         * Deadline expired before operation could complete. For operations that
         * change the state of the system, this error may be returned even if the
         * operation has completed successfully. For example, a successful response
         * from a server could have been delayed long enough for the deadline to
         * expire.
         */
        DEADLINE_EXCEEDED: "deadline-exceeded",
        /** Some requested entity (e.g., file or directory) was not found. */
        NOT_FOUND: "not-found",
        /**
         * Some entity that we attempted to create (e.g., file or directory) already
         * exists.
         */
        ALREADY_EXISTS: "already-exists",
        /**
         * The caller does not have permission to execute the specified operation.
         * PERMISSION_DENIED must not be used for rejections caused by exhausting
         * some resource (use RESOURCE_EXHAUSTED instead for those errors).
         * PERMISSION_DENIED must not be used if the caller cannot be identified
         * (use UNAUTHENTICATED instead for those errors).
         */
        PERMISSION_DENIED: "permission-denied",
        /**
         * The request does not have valid authentication credentials for the
         * operation.
         */
        UNAUTHENTICATED: "unauthenticated",
        /**
         * Some resource has been exhausted, perhaps a per-user quota, or perhaps the
         * entire file system is out of space.
         */
        RESOURCE_EXHAUSTED: "resource-exhausted",
        /**
         * Operation was rejected because the system is not in a state required for
         * the operation's execution. For example, directory to be deleted may be
         * non-empty, an rmdir operation is applied to a non-directory, etc.
         *
         * A litmus test that may help a service implementor in deciding
         * between FAILED_PRECONDITION, ABORTED, and UNAVAILABLE:
         *  (a) Use UNAVAILABLE if the client can retry just the failing call.
         *  (b) Use ABORTED if the client should retry at a higher-level
         *      (e.g., restarting a read-modify-write sequence).
         *  (c) Use FAILED_PRECONDITION if the client should not retry until
         *      the system state has been explicitly fixed. E.g., if an "rmdir"
         *      fails because the directory is non-empty, FAILED_PRECONDITION
         *      should be returned since the client should not retry unless
         *      they have first fixed up the directory by deleting files from it.
         *  (d) Use FAILED_PRECONDITION if the client performs conditional
         *      REST Get/Update/Delete on a resource and the resource on the
         *      server does not match the condition. E.g., conflicting
         *      read-modify-write on the same resource.
         */
        FAILED_PRECONDITION: "failed-precondition",
        /**
         * The operation was aborted, typically due to a concurrency issue like
         * sequencer check failures, transaction aborts, etc.
         *
         * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
         * and UNAVAILABLE.
         */
        ABORTED: "aborted",
        /**
         * Operation was attempted past the valid range. E.g., seeking or reading
         * past end of file.
         *
         * Unlike INVALID_ARGUMENT, this error indicates a problem that may be fixed
         * if the system state changes. For example, a 32-bit file system will
         * generate INVALID_ARGUMENT if asked to read at an offset that is not in the
         * range [0,2^32-1], but it will generate OUT_OF_RANGE if asked to read from
         * an offset past the current file size.
         *
         * There is a fair bit of overlap between FAILED_PRECONDITION and
         * OUT_OF_RANGE. We recommend using OUT_OF_RANGE (the more specific error)
         * when it applies so that callers who are iterating through a space can
         * easily look for an OUT_OF_RANGE error to detect when they are done.
         */
        OUT_OF_RANGE: "out-of-range",
        /** Operation is not implemented or not supported/enabled in this service. */
        UNIMPLEMENTED: "unimplemented",
        /**
         * Internal errors. Means some invariants expected by underlying System has
         * been broken. If you see one of these errors, Something is very broken.
         */
        INTERNAL: "internal",
        /**
         * The service is currently unavailable. This is a most likely a transient
         * condition and may be corrected by retrying with a backoff.
         *
         * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
         * and UNAVAILABLE.
         */
        UNAVAILABLE: "unavailable",
        /** Unrecoverable data loss or corruption. */
        DATA_LOSS: "data-loss"
    };

    /** An error returned by a Firestore operation. */ class FirestoreError extends FirebaseError {
        /** @hideconstructor */
        constructor(
        /**
         * The backend error code associated with this error.
         */
        e, 
        /**
         * A custom error description.
         */
        t) {
            super(e, t), this.code = e, this.message = t, 
            // HACK: We write a toString property directly because Error is not a real
            // class and so inheritance does not work correctly. We could alternatively
            // do the same "back-door inheritance" trick that FirebaseError does.
            this.toString = () => `${this.name}: [code=${this.code}]: ${this.message}`;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_Deferred {
        constructor() {
            this.promise = new Promise(((e, t) => {
                this.resolve = e, this.reject = t;
            }));
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_OAuthToken {
        constructor(e, t) {
            this.user = t, this.type = "OAuth", this.headers = new Map, this.headers.set("Authorization", `Bearer ${e}`);
        }
    }

    /**
     * A CredentialsProvider that always yields an empty token.
     * @internal
     */ class __PRIVATE_EmptyAuthCredentialsProvider {
        getToken() {
            return Promise.resolve(null);
        }
        invalidateToken() {}
        start(e, t) {
            // Fire with initial user.
            e.enqueueRetryable((() => t(User.UNAUTHENTICATED)));
        }
        shutdown() {}
    }

    /**
     * A CredentialsProvider that always returns a constant token. Used for
     * emulator token mocking.
     */ class __PRIVATE_EmulatorAuthCredentialsProvider {
        constructor(e) {
            this.token = e, 
            /**
             * Stores the listener registered with setChangeListener()
             * This isn't actually necessary since the UID never changes, but we use this
             * to verify the listen contract is adhered to in tests.
             */
            this.changeListener = null;
        }
        getToken() {
            return Promise.resolve(this.token);
        }
        invalidateToken() {}
        start(e, t) {
            this.changeListener = t, 
            // Fire with initial user.
            e.enqueueRetryable((() => t(this.token.user)));
        }
        shutdown() {
            this.changeListener = null;
        }
    }

    class __PRIVATE_FirebaseAuthCredentialsProvider {
        constructor(e) {
            this.t = e, 
            /** Tracks the current User. */
            this.currentUser = User.UNAUTHENTICATED, 
            /**
             * Counter used to detect if the token changed while a getToken request was
             * outstanding.
             */
            this.i = 0, this.forceRefresh = false, this.auth = null;
        }
        start(e, t) {
            __PRIVATE_hardAssert(void 0 === this.o, 42304);
            let n = this.i;
            // A change listener that prevents double-firing for the same token change.
                    const __PRIVATE_guardedChangeListener = e => this.i !== n ? (n = this.i, 
            t(e)) : Promise.resolve();
            // A promise that can be waited on to block on the next token change.
            // This promise is re-created after each change.
                    let r = new __PRIVATE_Deferred;
            this.o = () => {
                this.i++, this.currentUser = this.u(), r.resolve(), r = new __PRIVATE_Deferred, 
                e.enqueueRetryable((() => __PRIVATE_guardedChangeListener(this.currentUser)));
            };
            const __PRIVATE_awaitNextToken = () => {
                const t = r;
                e.enqueueRetryable((async () => {
                    await t.promise, await __PRIVATE_guardedChangeListener(this.currentUser);
                }));
            }, __PRIVATE_registerAuth = e => {
                __PRIVATE_logDebug("FirebaseAuthCredentialsProvider", "Auth detected"), this.auth = e, 
                this.o && (this.auth.addAuthTokenListener(this.o), __PRIVATE_awaitNextToken());
            };
            this.t.onInit((e => __PRIVATE_registerAuth(e))), 
            // Our users can initialize Auth right after Firestore, so we give it
            // a chance to register itself with the component framework before we
            // determine whether to start up in unauthenticated mode.
            setTimeout((() => {
                if (!this.auth) {
                    const e = this.t.getImmediate({
                        optional: true
                    });
                    e ? __PRIVATE_registerAuth(e) : (
                    // If auth is still not available, proceed with `null` user
                    __PRIVATE_logDebug("FirebaseAuthCredentialsProvider", "Auth not yet detected"), 
                    r.resolve(), r = new __PRIVATE_Deferred);
                }
            }), 0), __PRIVATE_awaitNextToken();
        }
        getToken() {
            // Take note of the current value of the tokenCounter so that this method
            // can fail (with an ABORTED error) if there is a token change while the
            // request is outstanding.
            const e = this.i, t = this.forceRefresh;
            return this.forceRefresh = false, this.auth ? this.auth.getToken(t).then((t => 
            // Cancel the request since the token changed while the request was
            // outstanding so the response is potentially for a previous user (which
            // user, we can't be sure).
            this.i !== e ? (__PRIVATE_logDebug("FirebaseAuthCredentialsProvider", "getToken aborted due to token change."), 
            this.getToken()) : t ? (__PRIVATE_hardAssert("string" == typeof t.accessToken, 31837, {
                l: t
            }), new __PRIVATE_OAuthToken(t.accessToken, this.currentUser)) : null)) : Promise.resolve(null);
        }
        invalidateToken() {
            this.forceRefresh = true;
        }
        shutdown() {
            this.auth && this.o && this.auth.removeAuthTokenListener(this.o), this.o = void 0;
        }
        // Auth.getUid() can return null even with a user logged in. It is because
        // getUid() is synchronous, but the auth code populating Uid is asynchronous.
        // This method should only be called in the AuthTokenListener callback
        // to guarantee to get the actual user.
        u() {
            const e = this.auth && this.auth.getUid();
            return __PRIVATE_hardAssert(null === e || "string" == typeof e, 2055, {
                h: e
            }), new User(e);
        }
    }

    /*
     * FirstPartyToken provides a fresh token each time its value
     * is requested, because if the token is too old, requests will be rejected.
     * Technically this may no longer be necessary since the SDK should gracefully
     * recover from unauthenticated errors (see b/33147818 for context), but it's
     * safer to keep the implementation as-is.
     */ class __PRIVATE_FirstPartyToken {
        constructor(e, t, n) {
            this.P = e, this.T = t, this.I = n, this.type = "FirstParty", this.user = User.FIRST_PARTY, 
            this.A = new Map;
        }
        /**
         * Gets an authorization token, using a provided factory function, or return
         * null.
         */    R() {
            return this.I ? this.I() : null;
        }
        get headers() {
            this.A.set("X-Goog-AuthUser", this.P);
            // Use array notation to prevent minification
            const e = this.R();
            return e && this.A.set("Authorization", e), this.T && this.A.set("X-Goog-Iam-Authorization-Token", this.T), 
            this.A;
        }
    }

    /*
     * Provides user credentials required for the Firestore JavaScript SDK
     * to authenticate the user, using technique that is only available
     * to applications hosted by Google.
     */ class __PRIVATE_FirstPartyAuthCredentialsProvider {
        constructor(e, t, n) {
            this.P = e, this.T = t, this.I = n;
        }
        getToken() {
            return Promise.resolve(new __PRIVATE_FirstPartyToken(this.P, this.T, this.I));
        }
        start(e, t) {
            // Fire with initial uid.
            e.enqueueRetryable((() => t(User.FIRST_PARTY)));
        }
        shutdown() {}
        invalidateToken() {}
    }

    class AppCheckToken {
        constructor(e) {
            this.value = e, this.type = "AppCheck", this.headers = new Map, e && e.length > 0 && this.headers.set("x-firebase-appcheck", this.value);
        }
    }

    class __PRIVATE_FirebaseAppCheckTokenProvider {
        constructor(t, n) {
            this.V = n, this.forceRefresh = false, this.appCheck = null, this.m = null, this.p = null, 
            _isFirebaseServerApp(t) && t.settings.appCheckToken && (this.p = t.settings.appCheckToken);
        }
        start(e, t) {
            __PRIVATE_hardAssert(void 0 === this.o, 3512);
            const onTokenChanged = e => {
                null != e.error && __PRIVATE_logDebug("FirebaseAppCheckTokenProvider", `Error getting App Check token; using placeholder token instead. Error: ${e.error.message}`);
                const n = e.token !== this.m;
                return this.m = e.token, __PRIVATE_logDebug("FirebaseAppCheckTokenProvider", `Received ${n ? "new" : "existing"} token.`), 
                n ? t(e.token) : Promise.resolve();
            };
            this.o = t => {
                e.enqueueRetryable((() => onTokenChanged(t)));
            };
            const __PRIVATE_registerAppCheck = e => {
                __PRIVATE_logDebug("FirebaseAppCheckTokenProvider", "AppCheck detected"), this.appCheck = e, 
                this.o && this.appCheck.addTokenListener(this.o);
            };
            this.V.onInit((e => __PRIVATE_registerAppCheck(e))), 
            // Our users can initialize AppCheck after Firestore, so we give it
            // a chance to register itself with the component framework.
            setTimeout((() => {
                if (!this.appCheck) {
                    const e = this.V.getImmediate({
                        optional: true
                    });
                    e ? __PRIVATE_registerAppCheck(e) : 
                    // If AppCheck is still not available, proceed without it.
                    __PRIVATE_logDebug("FirebaseAppCheckTokenProvider", "AppCheck not yet detected");
                }
            }), 0);
        }
        getToken() {
            if (this.p) return Promise.resolve(new AppCheckToken(this.p));
            const e = this.forceRefresh;
            return this.forceRefresh = false, this.appCheck ? this.appCheck.getToken(e).then((e => e ? (__PRIVATE_hardAssert("string" == typeof e.token, 44558, {
                tokenResult: e
            }), this.m = e.token, new AppCheckToken(e.token)) : null)) : Promise.resolve(null);
        }
        invalidateToken() {
            this.forceRefresh = true;
        }
        shutdown() {
            this.appCheck && this.o && this.appCheck.removeTokenListener(this.o), this.o = void 0;
        }
    }

    /**
     * Builds a CredentialsProvider depending on the type of
     * the credentials passed in.
     */
    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Generates `nBytes` of random bytes.
     *
     * If `nBytes < 0` , an error will be thrown.
     */
    function __PRIVATE_randomBytes(e) {
        // Polyfills for IE and WebWorker by using `self` and `msCrypto` when `crypto` is not available.
        const t = 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "undefined" != typeof self && (self.crypto || self.msCrypto), n = new Uint8Array(e);
        if (t && "function" == typeof t.getRandomValues) t.getRandomValues(n); else 
        // Falls back to Math.random
        for (let t = 0; t < e; t++) n[t] = Math.floor(256 * Math.random());
        return n;
    }

    /**
     * @license
     * Copyright 2023 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An instance of the Platform's 'TextEncoder' implementation.
     */ function __PRIVATE_newTextEncoder() {
        return new TextEncoder;
    }

    /**
     * An instance of the Platform's 'TextDecoder' implementation.
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A utility class for generating unique alphanumeric IDs of a specified length.
     *
     * @internal
     * Exported internally for testing purposes.
     */
    class __PRIVATE_AutoId {
        static newId() {
            // Alphanumeric characters
            const e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", t = 62 * Math.floor(256 / 62);
            // The largest byte value that is a multiple of `char.length`.
                    let n = "";
            for (;n.length < 20; ) {
                const r = __PRIVATE_randomBytes(40);
                for (let i = 0; i < r.length; ++i) 
                // Only accept values that are [0, maxMultiple), this ensures they can
                // be evenly mapped to indices of `chars` via a modulo operation.
                n.length < 20 && r[i] < t && (n += e.charAt(r[i] % 62));
            }
            return n;
        }
    }

    function __PRIVATE_primitiveComparator(e, t) {
        return e < t ? -1 : e > t ? 1 : 0;
    }

    /** Compare strings in UTF-8 encoded byte order */ function __PRIVATE_compareUtf8Strings(e, t) {
        let n = 0;
        for (;n < e.length && n < t.length; ) {
            const r = e.codePointAt(n), i = t.codePointAt(n);
            if (r !== i) {
                if (r < 128 && i < 128) 
                // ASCII comparison
                return __PRIVATE_primitiveComparator(r, i);
                {
                    // Lazy instantiate TextEncoder
                    const s = __PRIVATE_newTextEncoder(), o = __PRIVATE_compareByteArrays$1(s.encode(__PRIVATE_getUtf8SafeSubstring(e, n)), s.encode(__PRIVATE_getUtf8SafeSubstring(t, n)));
                    // UTF-8 encode the character at index i for byte comparison.
                                    return 0 !== o ? o : __PRIVATE_primitiveComparator(r, i);
                }
            }
            // Increment by 2 for surrogate pairs, 1 otherwise
                    n += r > 65535 ? 2 : 1;
        }
        // Compare lengths if all characters are equal
            return __PRIVATE_primitiveComparator(e.length, t.length);
    }

    function __PRIVATE_getUtf8SafeSubstring(e, t) {
        return e.codePointAt(t) > 65535 ? e.substring(t, t + 2) : e.substring(t, t + 1);
    }

    function __PRIVATE_compareByteArrays$1(e, t) {
        for (let n = 0; n < e.length && n < t.length; ++n) if (e[n] !== t[n]) return __PRIVATE_primitiveComparator(e[n], t[n]);
        return __PRIVATE_primitiveComparator(e.length, t.length);
    }

    /** Helper to compare arrays using isEqual(). */ function __PRIVATE_arrayEquals(e, t, n) {
        return e.length === t.length && e.every(((e, r) => n(e, t[r])));
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // The earliest date supported by Firestore timestamps (0001-01-01T00:00:00Z).
    const M = -62135596800, x = 1e6;

    // Number of nanoseconds in a millisecond.
    /**
     * A `Timestamp` represents a point in time independent of any time zone or
     * calendar, represented as seconds and fractions of seconds at nanosecond
     * resolution in UTC Epoch time.
     *
     * It is encoded using the Proleptic Gregorian Calendar which extends the
     * Gregorian calendar backwards to year one. It is encoded assuming all minutes
     * are 60 seconds long, i.e. leap seconds are "smeared" so that no leap second
     * table is needed for interpretation. Range is from 0001-01-01T00:00:00Z to
     * 9999-12-31T23:59:59.999999999Z.
     *
     * For examples and further specifications, refer to the
     * {@link https://github.com/google/protobuf/blob/master/src/google/protobuf/timestamp.proto | Timestamp definition}.
     */
    class Timestamp {
        /**
         * Creates a new timestamp with the current date, with millisecond precision.
         *
         * @returns a new timestamp representing the current date.
         */
        static now() {
            return Timestamp.fromMillis(Date.now());
        }
        /**
         * Creates a new timestamp from the given date.
         *
         * @param date - The date to initialize the `Timestamp` from.
         * @returns A new `Timestamp` representing the same point in time as the given
         *     date.
         */    static fromDate(e) {
            return Timestamp.fromMillis(e.getTime());
        }
        /**
         * Creates a new timestamp from the given number of milliseconds.
         *
         * @param milliseconds - Number of milliseconds since Unix epoch
         *     1970-01-01T00:00:00Z.
         * @returns A new `Timestamp` representing the same point in time as the given
         *     number of milliseconds.
         */    static fromMillis(e) {
            const t = Math.floor(e / 1e3), n = Math.floor((e - 1e3 * t) * x);
            return new Timestamp(t, n);
        }
        /**
         * Creates a new timestamp.
         *
         * @param seconds - The number of seconds of UTC time since Unix epoch
         *     1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to
         *     9999-12-31T23:59:59Z inclusive.
         * @param nanoseconds - The non-negative fractions of a second at nanosecond
         *     resolution. Negative second values with fractions must still have
         *     non-negative nanoseconds values that count forward in time. Must be
         *     from 0 to 999,999,999 inclusive.
         */    constructor(
        /**
         * The number of seconds of UTC time since Unix epoch 1970-01-01T00:00:00Z.
         */
        e, 
        /**
         * The fractions of a second at nanosecond resolution.*
         */
        t) {
            if (this.seconds = e, this.nanoseconds = t, t < 0) throw new FirestoreError(F.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + t);
            if (t >= 1e9) throw new FirestoreError(F.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + t);
            if (e < M) throw new FirestoreError(F.INVALID_ARGUMENT, "Timestamp seconds out of range: " + e);
            // This will break in the year 10,000.
                    if (e >= 253402300800) throw new FirestoreError(F.INVALID_ARGUMENT, "Timestamp seconds out of range: " + e);
        }
        /**
         * Converts a `Timestamp` to a JavaScript `Date` object. This conversion
         * causes a loss of precision since `Date` objects only support millisecond
         * precision.
         *
         * @returns JavaScript `Date` object representing the same point in time as
         *     this `Timestamp`, with millisecond precision.
         */    toDate() {
            return new Date(this.toMillis());
        }
        /**
         * Converts a `Timestamp` to a numeric timestamp (in milliseconds since
         * epoch). This operation causes a loss of precision.
         *
         * @returns The point in time corresponding to this timestamp, represented as
         *     the number of milliseconds since Unix epoch 1970-01-01T00:00:00Z.
         */    toMillis() {
            return 1e3 * this.seconds + this.nanoseconds / x;
        }
        _compareTo(e) {
            return this.seconds === e.seconds ? __PRIVATE_primitiveComparator(this.nanoseconds, e.nanoseconds) : __PRIVATE_primitiveComparator(this.seconds, e.seconds);
        }
        /**
         * Returns true if this `Timestamp` is equal to the provided one.
         *
         * @param other - The `Timestamp` to compare against.
         * @returns true if this `Timestamp` is equal to the provided one.
         */    isEqual(e) {
            return e.seconds === this.seconds && e.nanoseconds === this.nanoseconds;
        }
        /** Returns a textual representation of this `Timestamp`. */    toString() {
            return "Timestamp(seconds=" + this.seconds + ", nanoseconds=" + this.nanoseconds + ")";
        }
        /** Returns a JSON-serializable representation of this `Timestamp`. */    toJSON() {
            return {
                seconds: this.seconds,
                nanoseconds: this.nanoseconds
            };
        }
        /**
         * Converts this object to a primitive string, which allows `Timestamp` objects
         * to be compared using the `>`, `<=`, `>=` and `>` operators.
         */    valueOf() {
            // This method returns a string of the form <seconds>.<nanoseconds> where
            // <seconds> is translated to have a non-negative value and both <seconds>
            // and <nanoseconds> are left-padded with zeroes to be a consistent length.
            // Strings with this format then have a lexicographical ordering that matches
            // the expected ordering. The <seconds> translation is done to avoid having
            // a leading negative sign (i.e. a leading '-' character) in its string
            // representation, which would affect its lexicographical ordering.
            const e = this.seconds - M;
            // Note: Up to 12 decimal digits are required to represent all valid
            // 'seconds' values.
                    return String(e).padStart(12, "0") + "." + String(this.nanoseconds).padStart(9, "0");
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A version of a document in Firestore. This corresponds to the version
     * timestamp, such as update_time or read_time.
     */ class SnapshotVersion {
        static fromTimestamp(e) {
            return new SnapshotVersion(e);
        }
        static min() {
            return new SnapshotVersion(new Timestamp(0, 0));
        }
        static max() {
            return new SnapshotVersion(new Timestamp(253402300799, 999999999));
        }
        constructor(e) {
            this.timestamp = e;
        }
        compareTo(e) {
            return this.timestamp._compareTo(e.timestamp);
        }
        isEqual(e) {
            return this.timestamp.isEqual(e.timestamp);
        }
        /** Returns a number representation of the version for use in spec tests. */    toMicroseconds() {
            // Convert to microseconds.
            return 1e6 * this.timestamp.seconds + this.timestamp.nanoseconds / 1e3;
        }
        toString() {
            return "SnapshotVersion(" + this.timestamp.toString() + ")";
        }
        toTimestamp() {
            return this.timestamp;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const O = "__name__";

    /**
     * Path represents an ordered sequence of string segments.
     */ class BasePath {
        constructor(e, t, n) {
            void 0 === t ? t = 0 : t > e.length && fail(637, {
                offset: t,
                range: e.length
            }), void 0 === n ? n = e.length - t : n > e.length - t && fail(1746, {
                length: n,
                range: e.length - t
            }), this.segments = e, this.offset = t, this.len = n;
        }
        get length() {
            return this.len;
        }
        isEqual(e) {
            return 0 === BasePath.comparator(this, e);
        }
        child(e) {
            const t = this.segments.slice(this.offset, this.limit());
            return e instanceof BasePath ? e.forEach((e => {
                t.push(e);
            })) : t.push(e), this.construct(t);
        }
        /** The index of one past the last segment of the path. */    limit() {
            return this.offset + this.length;
        }
        popFirst(e) {
            return e = void 0 === e ? 1 : e, this.construct(this.segments, this.offset + e, this.length - e);
        }
        popLast() {
            return this.construct(this.segments, this.offset, this.length - 1);
        }
        firstSegment() {
            return this.segments[this.offset];
        }
        lastSegment() {
            return this.get(this.length - 1);
        }
        get(e) {
            return this.segments[this.offset + e];
        }
        isEmpty() {
            return 0 === this.length;
        }
        isPrefixOf(e) {
            if (e.length < this.length) return false;
            for (let t = 0; t < this.length; t++) if (this.get(t) !== e.get(t)) return false;
            return true;
        }
        isImmediateParentOf(e) {
            if (this.length + 1 !== e.length) return false;
            for (let t = 0; t < this.length; t++) if (this.get(t) !== e.get(t)) return false;
            return true;
        }
        forEach(e) {
            for (let t = this.offset, n = this.limit(); t < n; t++) e(this.segments[t]);
        }
        toArray() {
            return this.segments.slice(this.offset, this.limit());
        }
        /**
         * Compare 2 paths segment by segment, prioritizing numeric IDs
         * (e.g., "__id123__") in numeric ascending order, followed by string
         * segments in lexicographical order.
         */    static comparator(e, t) {
            const n = Math.min(e.length, t.length);
            for (let r = 0; r < n; r++) {
                const n = BasePath.compareSegments(e.get(r), t.get(r));
                if (0 !== n) return n;
            }
            return __PRIVATE_primitiveComparator(e.length, t.length);
        }
        static compareSegments(e, t) {
            const n = BasePath.isNumericId(e), r = BasePath.isNumericId(t);
            return n && !r ? -1 : !n && r ? 1 : n && r ? BasePath.extractNumericId(e).compare(BasePath.extractNumericId(t)) : __PRIVATE_compareUtf8Strings(e, t);
        }
        // Checks if a segment is a numeric ID (starts with "__id" and ends with "__").
        static isNumericId(e) {
            return e.startsWith("__id") && e.endsWith("__");
        }
        static extractNumericId(e) {
            return Integer.fromString(e.substring(4, e.length - 2));
        }
    }

    /**
     * A slash-separated path for navigating resources (documents and collections)
     * within Firestore.
     *
     * @internal
     */ class ResourcePath extends BasePath {
        construct(e, t, n) {
            return new ResourcePath(e, t, n);
        }
        canonicalString() {
            // NOTE: The client is ignorant of any path segments containing escape
            // sequences (e.g. __id123__) and just passes them through raw (they exist
            // for legacy reasons and should not be used frequently).
            return this.toArray().join("/");
        }
        toString() {
            return this.canonicalString();
        }
        /**
         * Returns a string representation of this path
         * where each path segment has been encoded with
         * `encodeURIComponent`.
         */    toUriEncodedString() {
            return this.toArray().map(encodeURIComponent).join("/");
        }
        /**
         * Creates a resource path from the given slash-delimited string. If multiple
         * arguments are provided, all components are combined. Leading and trailing
         * slashes from all components are ignored.
         */    static fromString(...e) {
            // NOTE: The client is ignorant of any path segments containing escape
            // sequences (e.g. __id123__) and just passes them through raw (they exist
            // for legacy reasons and should not be used frequently).
            const t = [];
            for (const n of e) {
                if (n.indexOf("//") >= 0) throw new FirestoreError(F.INVALID_ARGUMENT, `Invalid segment (${n}). Paths must not contain // in them.`);
                // Strip leading and trailing slashed.
                            t.push(...n.split("/").filter((e => e.length > 0)));
            }
            return new ResourcePath(t);
        }
        static emptyPath() {
            return new ResourcePath([]);
        }
    }

    const N = /^[_a-zA-Z][_a-zA-Z0-9]*$/;

    /**
     * A dot-separated path for navigating sub-objects within a document.
     * @internal
     */ class FieldPath$1 extends BasePath {
        construct(e, t, n) {
            return new FieldPath$1(e, t, n);
        }
        /**
         * Returns true if the string could be used as a segment in a field path
         * without escaping.
         */    static isValidIdentifier(e) {
            return N.test(e);
        }
        canonicalString() {
            return this.toArray().map((e => (e = e.replace(/\\/g, "\\\\").replace(/`/g, "\\`"), 
            FieldPath$1.isValidIdentifier(e) || (e = "`" + e + "`"), e))).join(".");
        }
        toString() {
            return this.canonicalString();
        }
        /**
         * Returns true if this field references the key of a document.
         */    isKeyField() {
            return 1 === this.length && this.get(0) === O;
        }
        /**
         * The field designating the key of a document.
         */    static keyField() {
            return new FieldPath$1([ O ]);
        }
        /**
         * Parses a field string from the given server-formatted string.
         *
         * - Splitting the empty string is not allowed (for now at least).
         * - Empty segments within the string (e.g. if there are two consecutive
         *   separators) are not allowed.
         *
         * TODO(b/37244157): we should make this more strict. Right now, it allows
         * non-identifier path components, even if they aren't escaped.
         */    static fromServerFormat(e) {
            const t = [];
            let n = "", r = 0;
            const __PRIVATE_addCurrentSegment = () => {
                if (0 === n.length) throw new FirestoreError(F.INVALID_ARGUMENT, `Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
                t.push(n), n = "";
            };
            let i = false;
            for (;r < e.length; ) {
                const t = e[r];
                if ("\\" === t) {
                    if (r + 1 === e.length) throw new FirestoreError(F.INVALID_ARGUMENT, "Path has trailing escape character: " + e);
                    const t = e[r + 1];
                    if ("\\" !== t && "." !== t && "`" !== t) throw new FirestoreError(F.INVALID_ARGUMENT, "Path has invalid escape sequence: " + e);
                    n += t, r += 2;
                } else "`" === t ? (i = !i, r++) : "." !== t || i ? (n += t, r++) : (__PRIVATE_addCurrentSegment(), 
                r++);
            }
            if (__PRIVATE_addCurrentSegment(), i) throw new FirestoreError(F.INVALID_ARGUMENT, "Unterminated ` in path: " + e);
            return new FieldPath$1(t);
        }
        static emptyPath() {
            return new FieldPath$1([]);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @internal
     */ class DocumentKey {
        constructor(e) {
            this.path = e;
        }
        static fromPath(e) {
            return new DocumentKey(ResourcePath.fromString(e));
        }
        static fromName(e) {
            return new DocumentKey(ResourcePath.fromString(e).popFirst(5));
        }
        static empty() {
            return new DocumentKey(ResourcePath.emptyPath());
        }
        get collectionGroup() {
            return this.path.popLast().lastSegment();
        }
        /** Returns true if the document is in the specified collectionId. */    hasCollectionId(e) {
            return this.path.length >= 2 && this.path.get(this.path.length - 2) === e;
        }
        /** Returns the collection group (i.e. the name of the parent collection) for this key. */    getCollectionGroup() {
            return this.path.get(this.path.length - 2);
        }
        /** Returns the fully qualified path to the parent collection. */    getCollectionPath() {
            return this.path.popLast();
        }
        isEqual(e) {
            return null !== e && 0 === ResourcePath.comparator(this.path, e.path);
        }
        toString() {
            return this.path.toString();
        }
        static comparator(e, t) {
            return ResourcePath.comparator(e.path, t.path);
        }
        static isDocumentKey(e) {
            return e.length % 2 == 0;
        }
        /**
         * Creates and returns a new document key with the given segments.
         *
         * @param segments - The segments of the path to the document
         * @returns A new instance of DocumentKey
         */    static fromSegments(e) {
            return new DocumentKey(new ResourcePath(e.slice()));
        }
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The initial mutation batch id for each index. Gets updated during index
     * backfill.
     */ const B = -1;

    /**
     * Creates an offset that matches all documents with a read time higher than
     * `readTime`.
     */ function __PRIVATE_newIndexOffsetSuccessorFromReadTime(e, t) {
        // We want to create an offset that matches all documents with a read time
        // greater than the provided read time. To do so, we technically need to
        // create an offset for `(readTime, MAX_DOCUMENT_KEY)`. While we could use
        // Unicode codepoints to generate MAX_DOCUMENT_KEY, it is much easier to use
        // `(readTime + 1, DocumentKey.empty())` since `> DocumentKey.empty()` matches
        // all valid document IDs.
        const n = e.toTimestamp().seconds, r = e.toTimestamp().nanoseconds + 1, i = SnapshotVersion.fromTimestamp(1e9 === r ? new Timestamp(n + 1, 0) : new Timestamp(n, r));
        return new IndexOffset(i, DocumentKey.empty(), t);
    }

    /** Creates a new offset based on the provided document. */ function __PRIVATE_newIndexOffsetFromDocument(e) {
        return new IndexOffset(e.readTime, e.key, B);
    }

    /**
     * Stores the latest read time, document and batch ID that were processed for an
     * index.
     */ class IndexOffset {
        constructor(
        /**
         * The latest read time version that has been indexed by Firestore for this
         * field index.
         */
        e, 
        /**
         * The key of the last document that was indexed for this query. Use
         * `DocumentKey.empty()` if no document has been indexed.
         */
        t, 
        /*
         * The largest mutation batch id that's been processed by Firestore.
         */
        n) {
            this.readTime = e, this.documentKey = t, this.largestBatchId = n;
        }
        /** Returns an offset that sorts before all regular offsets. */    static min() {
            return new IndexOffset(SnapshotVersion.min(), DocumentKey.empty(), B);
        }
        /** Returns an offset that sorts after all regular offsets. */    static max() {
            return new IndexOffset(SnapshotVersion.max(), DocumentKey.empty(), B);
        }
    }

    function __PRIVATE_indexOffsetComparator(e, t) {
        let n = e.readTime.compareTo(t.readTime);
        return 0 !== n ? n : (n = DocumentKey.comparator(e.documentKey, t.documentKey), 
        0 !== n ? n : __PRIVATE_primitiveComparator(e.largestBatchId, t.largestBatchId));
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const L = "The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";

    /**
     * A base class representing a persistence transaction, encapsulating both the
     * transaction's sequence numbers as well as a list of onCommitted listeners.
     *
     * When you call Persistence.runTransaction(), it will create a transaction and
     * pass it to your callback. You then pass it to any method that operates
     * on persistence.
     */ class PersistenceTransaction {
        constructor() {
            this.onCommittedListeners = [];
        }
        addOnCommittedListener(e) {
            this.onCommittedListeners.push(e);
        }
        raiseOnCommittedEvent() {
            this.onCommittedListeners.forEach((e => e()));
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Verifies the error thrown by a LocalStore operation. If a LocalStore
     * operation fails because the primary lease has been taken by another client,
     * we ignore the error (the persistence layer will immediately call
     * `applyPrimaryLease` to propagate the primary state change). All other errors
     * are re-thrown.
     *
     * @param err - An error returned by a LocalStore operation.
     * @returns A Promise that resolves after we recovered, or the original error.
     */ async function __PRIVATE_ignoreIfPrimaryLeaseLoss(e) {
        if (e.code !== F.FAILED_PRECONDITION || e.message !== L) throw e;
        __PRIVATE_logDebug("LocalStore", "Unexpectedly lost primary lease");
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * PersistencePromise is essentially a re-implementation of Promise except
     * it has a .next() method instead of .then() and .next() and .catch() callbacks
     * are executed synchronously when a PersistencePromise resolves rather than
     * asynchronously (Promise implementations use setImmediate() or similar).
     *
     * This is necessary to interoperate with IndexedDB which will automatically
     * commit transactions if control is returned to the event loop without
     * synchronously initiating another operation on the transaction.
     *
     * NOTE: .then() and .catch() only allow a single consumer, unlike normal
     * Promises.
     */ class PersistencePromise {
        constructor(e) {
            // NOTE: next/catchCallback will always point to our own wrapper functions,
            // not the user's raw next() or catch() callbacks.
            this.nextCallback = null, this.catchCallback = null, 
            // When the operation resolves, we'll set result or error and mark isDone.
            this.result = void 0, this.error = void 0, this.isDone = false, 
            // Set to true when .then() or .catch() are called and prevents additional
            // chaining.
            this.callbackAttached = false, e((e => {
                this.isDone = true, this.result = e, this.nextCallback && 
                // value should be defined unless T is Void, but we can't express
                // that in the type system.
                this.nextCallback(e);
            }), (e => {
                this.isDone = true, this.error = e, this.catchCallback && this.catchCallback(e);
            }));
        }
        catch(e) {
            return this.next(void 0, e);
        }
        next(e, t) {
            return this.callbackAttached && fail(59440), this.callbackAttached = true, this.isDone ? this.error ? this.wrapFailure(t, this.error) : this.wrapSuccess(e, this.result) : new PersistencePromise(((n, r) => {
                this.nextCallback = t => {
                    this.wrapSuccess(e, t).next(n, r);
                }, this.catchCallback = e => {
                    this.wrapFailure(t, e).next(n, r);
                };
            }));
        }
        toPromise() {
            return new Promise(((e, t) => {
                this.next(e, t);
            }));
        }
        wrapUserFunction(e) {
            try {
                const t = e();
                return t instanceof PersistencePromise ? t : PersistencePromise.resolve(t);
            } catch (e) {
                return PersistencePromise.reject(e);
            }
        }
        wrapSuccess(e, t) {
            return e ? this.wrapUserFunction((() => e(t))) : PersistencePromise.resolve(t);
        }
        wrapFailure(e, t) {
            return e ? this.wrapUserFunction((() => e(t))) : PersistencePromise.reject(t);
        }
        static resolve(e) {
            return new PersistencePromise(((t, n) => {
                t(e);
            }));
        }
        static reject(e) {
            return new PersistencePromise(((t, n) => {
                n(e);
            }));
        }
        static waitFor(
        // Accept all Promise types in waitFor().
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        e) {
            return new PersistencePromise(((t, n) => {
                let r = 0, i = 0, s = false;
                e.forEach((e => {
                    ++r, e.next((() => {
                        ++i, s && i === r && t();
                    }), (e => n(e)));
                })), s = true, i === r && t();
            }));
        }
        /**
         * Given an array of predicate functions that asynchronously evaluate to a
         * boolean, implements a short-circuiting `or` between the results. Predicates
         * will be evaluated until one of them returns `true`, then stop. The final
         * result will be whether any of them returned `true`.
         */    static or(e) {
            let t = PersistencePromise.resolve(false);
            for (const n of e) t = t.next((e => e ? PersistencePromise.resolve(e) : n()));
            return t;
        }
        static forEach(e, t) {
            const n = [];
            return e.forEach(((e, r) => {
                n.push(t.call(this, e, r));
            })), this.waitFor(n);
        }
        /**
         * Concurrently map all array elements through asynchronous function.
         */    static mapArray(e, t) {
            return new PersistencePromise(((n, r) => {
                const i = e.length, s = new Array(i);
                let o = 0;
                for (let _ = 0; _ < i; _++) {
                    const a = _;
                    t(e[a]).next((e => {
                        s[a] = e, ++o, o === i && n(s);
                    }), (e => r(e)));
                }
            }));
        }
        /**
         * An alternative to recursive PersistencePromise calls, that avoids
         * potential memory problems from unbounded chains of promises.
         *
         * The `action` will be called repeatedly while `condition` is true.
         */    static doWhile(e, t) {
            return new PersistencePromise(((n, r) => {
                const process = () => {
                    true === e() ? t().next((() => {
                        process();
                    }), r) : n();
                };
                process();
            }));
        }
    }

    /** Parse User Agent to determine Android version. Returns -1 if not found. */ function __PRIVATE_getAndroidVersion(e) {
        const t = e.match(/Android ([\d.]+)/i), n = t ? t[1].split(".").slice(0, 2).join(".") : "-1";
        return Number(n);
    }

    /** Verifies whether `e` is an IndexedDbTransactionError. */ function __PRIVATE_isIndexedDbTransactionError(e) {
        // Use name equality, as instanceof checks on errors don't work with errors
        // that wrap other errors.
        return "IndexedDbTransactionError" === e.name;
    }

    /**
     * @license
     * Copyright 2018 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * `ListenSequence` is a monotonic sequence. It is initialized with a minimum value to
     * exceed. All subsequent calls to next will return increasing values. If provided with a
     * `SequenceNumberSyncer`, it will additionally bump its next value when told of a new value, as
     * well as write out sequence numbers that it produces via `next()`.
     */ class __PRIVATE_ListenSequence {
        constructor(e, t) {
            this.previousValue = e, t && (t.sequenceNumberHandler = e => this.ue(e), this.ce = e => t.writeSequenceNumber(e));
        }
        ue(e) {
            return this.previousValue = Math.max(e, this.previousValue), this.previousValue;
        }
        next() {
            const e = ++this.previousValue;
            return this.ce && this.ce(e), e;
        }
    }

    __PRIVATE_ListenSequence.le = -1;

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Sentinel value that sorts before any Mutation Batch ID. */
    const $ = -1;

    /**
     * Returns whether a variable is either undefined or null.
     */ function __PRIVATE_isNullOrUndefined(e) {
        return null == e;
    }

    /** Returns whether the value represents -0. */ function __PRIVATE_isNegativeZero(e) {
        // Detect if the value is -0.0. Based on polyfill from
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
        return 0 === e && 1 / e == -1 / 0;
    }

    /**
     * Returns whether a value is an integer and in the safe integer range
     * @param value - The value to test for being an integer and in the safe range
     */ function isSafeInteger(e) {
        return "number" == typeof e && Number.isInteger(e) && !__PRIVATE_isNegativeZero(e) && e <= Number.MAX_SAFE_INTEGER && e >= Number.MIN_SAFE_INTEGER;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const U = "";

    /**
     * Encodes a resource path into a IndexedDb-compatible string form.
     */
    function __PRIVATE_encodeResourcePath(e) {
        let t = "";
        for (let n = 0; n < e.length; n++) t.length > 0 && (t = __PRIVATE_encodeSeparator(t)), 
        t = __PRIVATE_encodeSegment(e.get(n), t);
        return __PRIVATE_encodeSeparator(t);
    }

    /** Encodes a single segment of a resource path into the given result */ function __PRIVATE_encodeSegment(e, t) {
        let n = t;
        const r = e.length;
        for (let t = 0; t < r; t++) {
            const r = e.charAt(t);
            switch (r) {
              case "\0":
                n += "";
                break;

              case U:
                n += "";
                break;

              default:
                n += r;
            }
        }
        return n;
    }

    /** Encodes a path separator into the given result */ function __PRIVATE_encodeSeparator(e) {
        return e + U + "";
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ function __PRIVATE_objectSize(e) {
        let t = 0;
        for (const n in e) Object.prototype.hasOwnProperty.call(e, n) && t++;
        return t;
    }

    function forEach(e, t) {
        for (const n in e) Object.prototype.hasOwnProperty.call(e, n) && t(n, e[n]);
    }

    function isEmpty(e) {
        for (const t in e) if (Object.prototype.hasOwnProperty.call(e, t)) return false;
        return true;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // An immutable sorted map implementation, based on a Left-leaning Red-Black
    // tree.
    class SortedMap {
        constructor(e, t) {
            this.comparator = e, this.root = t || LLRBNode.EMPTY;
        }
        // Returns a copy of the map, with the specified key/value added or replaced.
        insert(e, t) {
            return new SortedMap(this.comparator, this.root.insert(e, t, this.comparator).copy(null, null, LLRBNode.BLACK, null, null));
        }
        // Returns a copy of the map, with the specified key removed.
        remove(e) {
            return new SortedMap(this.comparator, this.root.remove(e, this.comparator).copy(null, null, LLRBNode.BLACK, null, null));
        }
        // Returns the value of the node with the given key, or null.
        get(e) {
            let t = this.root;
            for (;!t.isEmpty(); ) {
                const n = this.comparator(e, t.key);
                if (0 === n) return t.value;
                n < 0 ? t = t.left : n > 0 && (t = t.right);
            }
            return null;
        }
        // Returns the index of the element in this sorted map, or -1 if it doesn't
        // exist.
        indexOf(e) {
            // Number of nodes that were pruned when descending right
            let t = 0, n = this.root;
            for (;!n.isEmpty(); ) {
                const r = this.comparator(e, n.key);
                if (0 === r) return t + n.left.size;
                r < 0 ? n = n.left : (
                // Count all nodes left of the node plus the node itself
                t += n.left.size + 1, n = n.right);
            }
            // Node not found
                    return -1;
        }
        isEmpty() {
            return this.root.isEmpty();
        }
        // Returns the total number of nodes in the map.
        get size() {
            return this.root.size;
        }
        // Returns the minimum key in the map.
        minKey() {
            return this.root.minKey();
        }
        // Returns the maximum key in the map.
        maxKey() {
            return this.root.maxKey();
        }
        // Traverses the map in key order and calls the specified action function
        // for each key/value pair. If action returns true, traversal is aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        inorderTraversal(e) {
            return this.root.inorderTraversal(e);
        }
        forEach(e) {
            this.inorderTraversal(((t, n) => (e(t, n), false)));
        }
        toString() {
            const e = [];
            return this.inorderTraversal(((t, n) => (e.push(`${t}:${n}`), false))), `{${e.join(", ")}}`;
        }
        // Traverses the map in reverse key order and calls the specified action
        // function for each key/value pair. If action returns true, traversal is
        // aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        reverseTraversal(e) {
            return this.root.reverseTraversal(e);
        }
        // Returns an iterator over the SortedMap.
        getIterator() {
            return new SortedMapIterator(this.root, null, this.comparator, false);
        }
        getIteratorFrom(e) {
            return new SortedMapIterator(this.root, e, this.comparator, false);
        }
        getReverseIterator() {
            return new SortedMapIterator(this.root, null, this.comparator, true);
        }
        getReverseIteratorFrom(e) {
            return new SortedMapIterator(this.root, e, this.comparator, true);
        }
    }

     // end SortedMap
    // An iterator over an LLRBNode.
    class SortedMapIterator {
        constructor(e, t, n, r) {
            this.isReverse = r, this.nodeStack = [];
            let i = 1;
            for (;!e.isEmpty(); ) if (i = t ? n(e.key, t) : 1, 
            // flip the comparison if we're going in reverse
            t && r && (i *= -1), i < 0) 
            // This node is less than our start key. ignore it
            e = this.isReverse ? e.left : e.right; else {
                if (0 === i) {
                    // This node is exactly equal to our start key. Push it on the stack,
                    // but stop iterating;
                    this.nodeStack.push(e);
                    break;
                }
                // This node is greater than our start key, add it to the stack and move
                // to the next one
                this.nodeStack.push(e), e = this.isReverse ? e.right : e.left;
            }
        }
        getNext() {
            let e = this.nodeStack.pop();
            const t = {
                key: e.key,
                value: e.value
            };
            if (this.isReverse) for (e = e.left; !e.isEmpty(); ) this.nodeStack.push(e), e = e.right; else for (e = e.right; !e.isEmpty(); ) this.nodeStack.push(e), 
            e = e.left;
            return t;
        }
        hasNext() {
            return this.nodeStack.length > 0;
        }
        peek() {
            if (0 === this.nodeStack.length) return null;
            const e = this.nodeStack[this.nodeStack.length - 1];
            return {
                key: e.key,
                value: e.value
            };
        }
    }

     // end SortedMapIterator
    // Represents a node in a Left-leaning Red-Black tree.
    class LLRBNode {
        constructor(e, t, n, r, i) {
            this.key = e, this.value = t, this.color = null != n ? n : LLRBNode.RED, this.left = null != r ? r : LLRBNode.EMPTY, 
            this.right = null != i ? i : LLRBNode.EMPTY, this.size = this.left.size + 1 + this.right.size;
        }
        // Returns a copy of the current node, optionally replacing pieces of it.
        copy(e, t, n, r, i) {
            return new LLRBNode(null != e ? e : this.key, null != t ? t : this.value, null != n ? n : this.color, null != r ? r : this.left, null != i ? i : this.right);
        }
        isEmpty() {
            return false;
        }
        // Traverses the tree in key order and calls the specified action function
        // for each node. If action returns true, traversal is aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        inorderTraversal(e) {
            return this.left.inorderTraversal(e) || e(this.key, this.value) || this.right.inorderTraversal(e);
        }
        // Traverses the tree in reverse key order and calls the specified action
        // function for each node. If action returns true, traversal is aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        reverseTraversal(e) {
            return this.right.reverseTraversal(e) || e(this.key, this.value) || this.left.reverseTraversal(e);
        }
        // Returns the minimum node in the tree.
        min() {
            return this.left.isEmpty() ? this : this.left.min();
        }
        // Returns the maximum key in the tree.
        minKey() {
            return this.min().key;
        }
        // Returns the maximum key in the tree.
        maxKey() {
            return this.right.isEmpty() ? this.key : this.right.maxKey();
        }
        // Returns new tree, with the key/value added.
        insert(e, t, n) {
            let r = this;
            const i = n(e, r.key);
            return r = i < 0 ? r.copy(null, null, null, r.left.insert(e, t, n), null) : 0 === i ? r.copy(null, t, null, null, null) : r.copy(null, null, null, null, r.right.insert(e, t, n)), 
            r.fixUp();
        }
        removeMin() {
            if (this.left.isEmpty()) return LLRBNode.EMPTY;
            let e = this;
            return e.left.isRed() || e.left.left.isRed() || (e = e.moveRedLeft()), e = e.copy(null, null, null, e.left.removeMin(), null), 
            e.fixUp();
        }
        // Returns new tree, with the specified item removed.
        remove(e, t) {
            let n, r = this;
            if (t(e, r.key) < 0) r.left.isEmpty() || r.left.isRed() || r.left.left.isRed() || (r = r.moveRedLeft()), 
            r = r.copy(null, null, null, r.left.remove(e, t), null); else {
                if (r.left.isRed() && (r = r.rotateRight()), r.right.isEmpty() || r.right.isRed() || r.right.left.isRed() || (r = r.moveRedRight()), 
                0 === t(e, r.key)) {
                    if (r.right.isEmpty()) return LLRBNode.EMPTY;
                    n = r.right.min(), r = r.copy(n.key, n.value, null, null, r.right.removeMin());
                }
                r = r.copy(null, null, null, null, r.right.remove(e, t));
            }
            return r.fixUp();
        }
        isRed() {
            return this.color;
        }
        // Returns new tree after performing any needed rotations.
        fixUp() {
            let e = this;
            return e.right.isRed() && !e.left.isRed() && (e = e.rotateLeft()), e.left.isRed() && e.left.left.isRed() && (e = e.rotateRight()), 
            e.left.isRed() && e.right.isRed() && (e = e.colorFlip()), e;
        }
        moveRedLeft() {
            let e = this.colorFlip();
            return e.right.left.isRed() && (e = e.copy(null, null, null, null, e.right.rotateRight()), 
            e = e.rotateLeft(), e = e.colorFlip()), e;
        }
        moveRedRight() {
            let e = this.colorFlip();
            return e.left.left.isRed() && (e = e.rotateRight(), e = e.colorFlip()), e;
        }
        rotateLeft() {
            const e = this.copy(null, null, LLRBNode.RED, null, this.right.left);
            return this.right.copy(null, null, this.color, e, null);
        }
        rotateRight() {
            const e = this.copy(null, null, LLRBNode.RED, this.left.right, null);
            return this.left.copy(null, null, this.color, null, e);
        }
        colorFlip() {
            const e = this.left.copy(null, null, !this.left.color, null, null), t = this.right.copy(null, null, !this.right.color, null, null);
            return this.copy(null, null, !this.color, e, t);
        }
        // For testing.
        checkMaxDepth() {
            const e = this.check();
            return Math.pow(2, e) <= this.size + 1;
        }
        // In a balanced RB tree, the black-depth (number of black nodes) from root to
        // leaves is equal on both sides.  This function verifies that or asserts.
        check() {
            if (this.isRed() && this.left.isRed()) throw fail(43730, {
                key: this.key,
                value: this.value
            });
            if (this.right.isRed()) throw fail(14113, {
                key: this.key,
                value: this.value
            });
            const e = this.left.check();
            if (e !== this.right.check()) throw fail(27949);
            return e + (this.isRed() ? 0 : 1);
        }
    }

     // end LLRBNode
    // Empty node is shared between all LLRB trees.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    LLRBNode.EMPTY = null, LLRBNode.RED = true, LLRBNode.BLACK = false;

    // end LLRBEmptyNode
    LLRBNode.EMPTY = new 
    // Represents an empty node (a leaf node in the Red-Black Tree).
    class LLRBEmptyNode {
        constructor() {
            this.size = 0;
        }
        get key() {
            throw fail(57766);
        }
        get value() {
            throw fail(16141);
        }
        get color() {
            throw fail(16727);
        }
        get left() {
            throw fail(29726);
        }
        get right() {
            throw fail(36894);
        }
        // Returns a copy of the current node.
        copy(e, t, n, r, i) {
            return this;
        }
        // Returns a copy of the tree, with the specified key/value added.
        insert(e, t, n) {
            return new LLRBNode(e, t);
        }
        // Returns a copy of the tree, with the specified key removed.
        remove(e, t) {
            return this;
        }
        isEmpty() {
            return true;
        }
        inorderTraversal(e) {
            return false;
        }
        reverseTraversal(e) {
            return false;
        }
        minKey() {
            return null;
        }
        maxKey() {
            return null;
        }
        isRed() {
            return false;
        }
        // For testing.
        checkMaxDepth() {
            return true;
        }
        check() {
            return 0;
        }
    };

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * SortedSet is an immutable (copy-on-write) collection that holds elements
     * in order specified by the provided comparator.
     *
     * NOTE: if provided comparator returns 0 for two elements, we consider them to
     * be equal!
     */
    class SortedSet {
        constructor(e) {
            this.comparator = e, this.data = new SortedMap(this.comparator);
        }
        has(e) {
            return null !== this.data.get(e);
        }
        first() {
            return this.data.minKey();
        }
        last() {
            return this.data.maxKey();
        }
        get size() {
            return this.data.size;
        }
        indexOf(e) {
            return this.data.indexOf(e);
        }
        /** Iterates elements in order defined by "comparator" */    forEach(e) {
            this.data.inorderTraversal(((t, n) => (e(t), false)));
        }
        /** Iterates over `elem`s such that: range[0] &lt;= elem &lt; range[1]. */    forEachInRange(e, t) {
            const n = this.data.getIteratorFrom(e[0]);
            for (;n.hasNext(); ) {
                const r = n.getNext();
                if (this.comparator(r.key, e[1]) >= 0) return;
                t(r.key);
            }
        }
        /**
         * Iterates over `elem`s such that: start &lt;= elem until false is returned.
         */    forEachWhile(e, t) {
            let n;
            for (n = void 0 !== t ? this.data.getIteratorFrom(t) : this.data.getIterator(); n.hasNext(); ) {
                if (!e(n.getNext().key)) return;
            }
        }
        /** Finds the least element greater than or equal to `elem`. */    firstAfterOrEqual(e) {
            const t = this.data.getIteratorFrom(e);
            return t.hasNext() ? t.getNext().key : null;
        }
        getIterator() {
            return new SortedSetIterator(this.data.getIterator());
        }
        getIteratorFrom(e) {
            return new SortedSetIterator(this.data.getIteratorFrom(e));
        }
        /** Inserts or updates an element */    add(e) {
            return this.copy(this.data.remove(e).insert(e, true));
        }
        /** Deletes an element */    delete(e) {
            return this.has(e) ? this.copy(this.data.remove(e)) : this;
        }
        isEmpty() {
            return this.data.isEmpty();
        }
        unionWith(e) {
            let t = this;
            // Make sure `result` always refers to the larger one of the two sets.
                    return t.size < e.size && (t = e, e = this), e.forEach((e => {
                t = t.add(e);
            })), t;
        }
        isEqual(e) {
            if (!(e instanceof SortedSet)) return false;
            if (this.size !== e.size) return false;
            const t = this.data.getIterator(), n = e.data.getIterator();
            for (;t.hasNext(); ) {
                const e = t.getNext().key, r = n.getNext().key;
                if (0 !== this.comparator(e, r)) return false;
            }
            return true;
        }
        toArray() {
            const e = [];
            return this.forEach((t => {
                e.push(t);
            })), e;
        }
        toString() {
            const e = [];
            return this.forEach((t => e.push(t))), "SortedSet(" + e.toString() + ")";
        }
        copy(e) {
            const t = new SortedSet(this.comparator);
            return t.data = e, t;
        }
    }

    class SortedSetIterator {
        constructor(e) {
            this.iter = e;
        }
        getNext() {
            return this.iter.getNext().key;
        }
        hasNext() {
            return this.iter.hasNext();
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provides a set of fields that can be used to partially patch a document.
     * FieldMask is used in conjunction with ObjectValue.
     * Examples:
     *   foo - Overwrites foo entirely with the provided value. If foo is not
     *         present in the companion ObjectValue, the field is deleted.
     *   foo.bar - Overwrites only the field bar of the object foo.
     *             If foo is not an object, foo is replaced with an object
     *             containing foo
     */ class FieldMask {
        constructor(e) {
            this.fields = e, 
            // TODO(dimond): validation of FieldMask
            // Sort the field mask to support `FieldMask.isEqual()` and assert below.
            e.sort(FieldPath$1.comparator);
        }
        static empty() {
            return new FieldMask([]);
        }
        /**
         * Returns a new FieldMask object that is the result of adding all the given
         * fields paths to this field mask.
         */    unionWith(e) {
            let t = new SortedSet(FieldPath$1.comparator);
            for (const e of this.fields) t = t.add(e);
            for (const n of e) t = t.add(n);
            return new FieldMask(t.toArray());
        }
        /**
         * Verifies that `fieldPath` is included by at least one field in this field
         * mask.
         *
         * This is an O(n) operation, where `n` is the size of the field mask.
         */    covers(e) {
            for (const t of this.fields) if (t.isPrefixOf(e)) return true;
            return false;
        }
        isEqual(e) {
            return __PRIVATE_arrayEquals(this.fields, e.fields, ((e, t) => e.isEqual(t)));
        }
    }

    /**
     * @license
     * Copyright 2023 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An error encountered while decoding base64 string.
     */ class __PRIVATE_Base64DecodeError extends Error {
        constructor() {
            super(...arguments), this.name = "Base64DecodeError";
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Immutable class that represents a "proto" byte string.
     *
     * Proto byte strings can either be Base64-encoded strings or Uint8Arrays when
     * sent on the wire. This class abstracts away this differentiation by holding
     * the proto byte string in a common class that must be converted into a string
     * before being sent as a proto.
     * @internal
     */ class ByteString {
        constructor(e) {
            this.binaryString = e;
        }
        static fromBase64String(e) {
            const t = function __PRIVATE_decodeBase64(e) {
                try {
                    return atob(e);
                } catch (e) {
                    // Check that `DOMException` is defined before using it to avoid
                    // "ReferenceError: Property 'DOMException' doesn't exist" in react-native.
                    // (https://github.com/firebase/firebase-js-sdk/issues/7115)
                    throw "undefined" != typeof DOMException && e instanceof DOMException ? new __PRIVATE_Base64DecodeError("Invalid base64 string: " + e) : e;
                }
            }
            /** Converts a binary string to a Base64 encoded string. */ (e);
            return new ByteString(t);
        }
        static fromUint8Array(e) {
            // TODO(indexing); Remove the copy of the byte string here as this method
            // is frequently called during indexing.
            const t = 
            /**
     * Helper function to convert an Uint8array to a binary string.
     */
            function __PRIVATE_binaryStringFromUint8Array(e) {
                let t = "";
                for (let n = 0; n < e.length; ++n) t += String.fromCharCode(e[n]);
                return t;
            }
            /**
     * Helper function to convert a binary string to an Uint8Array.
     */ (e);
            return new ByteString(t);
        }
        [Symbol.iterator]() {
            let e = 0;
            return {
                next: () => e < this.binaryString.length ? {
                    value: this.binaryString.charCodeAt(e++),
                    done: false
                } : {
                    value: void 0,
                    done: true
                }
            };
        }
        toBase64() {
            return function __PRIVATE_encodeBase64(e) {
                return btoa(e);
            }(this.binaryString);
        }
        toUint8Array() {
            return function __PRIVATE_uint8ArrayFromBinaryString(e) {
                const t = new Uint8Array(e.length);
                for (let n = 0; n < e.length; n++) t[n] = e.charCodeAt(n);
                return t;
            }
            /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
            // A RegExp matching ISO 8601 UTC timestamps with optional fraction.
            (this.binaryString);
        }
        approximateByteSize() {
            return 2 * this.binaryString.length;
        }
        compareTo(e) {
            return __PRIVATE_primitiveComparator(this.binaryString, e.binaryString);
        }
        isEqual(e) {
            return this.binaryString === e.binaryString;
        }
    }

    ByteString.EMPTY_BYTE_STRING = new ByteString("");

    const Xe = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);

    /**
     * Converts the possible Proto values for a timestamp value into a "seconds and
     * nanos" representation.
     */ function __PRIVATE_normalizeTimestamp(e) {
        // The json interface (for the browser) will return an iso timestamp string,
        // while the proto js library (for node) will return a
        // google.protobuf.Timestamp instance.
        if (__PRIVATE_hardAssert(!!e, 39018), "string" == typeof e) {
            // The date string can have higher precision (nanos) than the Date class
            // (millis), so we do some custom parsing here.
            // Parse the nanos right out of the string.
            let t = 0;
            const n = Xe.exec(e);
            if (__PRIVATE_hardAssert(!!n, 46558, {
                timestamp: e
            }), n[1]) {
                // Pad the fraction out to 9 digits (nanos).
                let e = n[1];
                e = (e + "000000000").substr(0, 9), t = Number(e);
            }
            // Parse the date to get the seconds.
                    const r = new Date(e);
            return {
                seconds: Math.floor(r.getTime() / 1e3),
                nanos: t
            };
        }
        return {
            seconds: __PRIVATE_normalizeNumber(e.seconds),
            nanos: __PRIVATE_normalizeNumber(e.nanos)
        };
    }

    /**
     * Converts the possible Proto types for numbers into a JavaScript number.
     * Returns 0 if the value is not numeric.
     */ function __PRIVATE_normalizeNumber(e) {
        // TODO(bjornick): Handle int64 greater than 53 bits.
        return "number" == typeof e ? e : "string" == typeof e ? Number(e) : 0;
    }

    /** Converts the possible Proto types for Blobs into a ByteString. */ function __PRIVATE_normalizeByteString(e) {
        return "string" == typeof e ? ByteString.fromBase64String(e) : ByteString.fromUint8Array(e);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents a locally-applied ServerTimestamp.
     *
     * Server Timestamps are backed by MapValues that contain an internal field
     * `__type__` with a value of `server_timestamp`. The previous value and local
     * write time are stored in its `__previous_value__` and `__local_write_time__`
     * fields respectively.
     *
     * Notes:
     * - ServerTimestampValue instances are created as the result of applying a
     *   transform. They can only exist in the local view of a document. Therefore
     *   they do not need to be parsed or serialized.
     * - When evaluated locally (e.g. for snapshot.data()), they by default
     *   evaluate to `null`. This behavior can be configured by passing custom
     *   FieldValueOptions to value().
     * - With respect to other ServerTimestampValues, they sort by their
     *   localWriteTime.
     */ const et = "server_timestamp", tt = "__type__", nt = "__previous_value__", rt = "__local_write_time__";

    function __PRIVATE_isServerTimestamp(e) {
        var t, n;
        return (null === (n = ((null === (t = null == e ? void 0 : e.mapValue) || void 0 === t ? void 0 : t.fields) || {})[tt]) || void 0 === n ? void 0 : n.stringValue) === et;
    }

    /**
     * Creates a new ServerTimestamp proto value (using the internal format).
     */
    /**
     * Returns the value of the field before this ServerTimestamp was set.
     *
     * Preserving the previous values allows the user to display the last resoled
     * value until the backend responds with the timestamp.
     */
    function __PRIVATE_getPreviousValue(e) {
        const t = e.mapValue.fields[nt];
        return __PRIVATE_isServerTimestamp(t) ? __PRIVATE_getPreviousValue(t) : t;
    }

    /**
     * Returns the local time at which this timestamp was first set.
     */ function __PRIVATE_getLocalWriteTime(e) {
        const t = __PRIVATE_normalizeTimestamp(e.mapValue.fields[rt].timestampValue);
        return new Timestamp(t.seconds, t.nanos);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class DatabaseInfo {
        /**
         * Constructs a DatabaseInfo using the provided host, databaseId and
         * persistenceKey.
         *
         * @param databaseId - The database to use.
         * @param appId - The Firebase App Id.
         * @param persistenceKey - A unique identifier for this Firestore's local
         * storage (used in conjunction with the databaseId).
         * @param host - The Firestore backend host to connect to.
         * @param ssl - Whether to use SSL when connecting.
         * @param forceLongPolling - Whether to use the forceLongPolling option
         * when using WebChannel as the network transport.
         * @param autoDetectLongPolling - Whether to use the detectBufferingProxy
         * option when using WebChannel as the network transport.
         * @param longPollingOptions Options that configure long-polling.
         * @param useFetchStreams Whether to use the Fetch API instead of
         * XMLHTTPRequest
         */
        constructor(e, t, n, r, i, s, o, _, a) {
            this.databaseId = e, this.appId = t, this.persistenceKey = n, this.host = r, this.ssl = i, 
            this.forceLongPolling = s, this.autoDetectLongPolling = o, this.longPollingOptions = _, 
            this.useFetchStreams = a;
        }
    }

    /** The default database name for a project. */ const it = "(default)";

    /**
     * Represents the database ID a Firestore client is associated with.
     * @internal
     */ class DatabaseId {
        constructor(e, t) {
            this.projectId = e, this.database = t || it;
        }
        static empty() {
            return new DatabaseId("", "");
        }
        get isDefaultDatabase() {
            return this.database === it;
        }
        isEqual(e) {
            return e instanceof DatabaseId && e.projectId === this.projectId && e.database === this.database;
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const st = "__type__", ot = "__max__", _t = {
        mapValue: {
            }
    }, at = "__vector__", ut = "value";

    /** Extracts the backend's type order for the provided value. */
    function __PRIVATE_typeOrder(e) {
        return "nullValue" in e ? 0 /* TypeOrder.NullValue */ : "booleanValue" in e ? 1 /* TypeOrder.BooleanValue */ : "integerValue" in e || "doubleValue" in e ? 2 /* TypeOrder.NumberValue */ : "timestampValue" in e ? 3 /* TypeOrder.TimestampValue */ : "stringValue" in e ? 5 /* TypeOrder.StringValue */ : "bytesValue" in e ? 6 /* TypeOrder.BlobValue */ : "referenceValue" in e ? 7 /* TypeOrder.RefValue */ : "geoPointValue" in e ? 8 /* TypeOrder.GeoPointValue */ : "arrayValue" in e ? 9 /* TypeOrder.ArrayValue */ : "mapValue" in e ? __PRIVATE_isServerTimestamp(e) ? 4 /* TypeOrder.ServerTimestampValue */ : __PRIVATE_isMaxValue(e) ? 9007199254740991 /* TypeOrder.MaxValue */ : __PRIVATE_isVectorValue(e) ? 10 /* TypeOrder.VectorValue */ : 11 /* TypeOrder.ObjectValue */ : fail(28295, {
            value: e
        });
    }

    /** Tests `left` and `right` for equality based on the backend semantics. */ function __PRIVATE_valueEquals(e, t) {
        if (e === t) return true;
        const n = __PRIVATE_typeOrder(e);
        if (n !== __PRIVATE_typeOrder(t)) return false;
        switch (n) {
          case 0 /* TypeOrder.NullValue */ :
          case 9007199254740991 /* TypeOrder.MaxValue */ :
            return true;

          case 1 /* TypeOrder.BooleanValue */ :
            return e.booleanValue === t.booleanValue;

          case 4 /* TypeOrder.ServerTimestampValue */ :
            return __PRIVATE_getLocalWriteTime(e).isEqual(__PRIVATE_getLocalWriteTime(t));

          case 3 /* TypeOrder.TimestampValue */ :
            return function __PRIVATE_timestampEquals(e, t) {
                if ("string" == typeof e.timestampValue && "string" == typeof t.timestampValue && e.timestampValue.length === t.timestampValue.length) 
                // Use string equality for ISO 8601 timestamps
                return e.timestampValue === t.timestampValue;
                const n = __PRIVATE_normalizeTimestamp(e.timestampValue), r = __PRIVATE_normalizeTimestamp(t.timestampValue);
                return n.seconds === r.seconds && n.nanos === r.nanos;
            }(e, t);

          case 5 /* TypeOrder.StringValue */ :
            return e.stringValue === t.stringValue;

          case 6 /* TypeOrder.BlobValue */ :
            return function __PRIVATE_blobEquals(e, t) {
                return __PRIVATE_normalizeByteString(e.bytesValue).isEqual(__PRIVATE_normalizeByteString(t.bytesValue));
            }(e, t);

          case 7 /* TypeOrder.RefValue */ :
            return e.referenceValue === t.referenceValue;

          case 8 /* TypeOrder.GeoPointValue */ :
            return function __PRIVATE_geoPointEquals(e, t) {
                return __PRIVATE_normalizeNumber(e.geoPointValue.latitude) === __PRIVATE_normalizeNumber(t.geoPointValue.latitude) && __PRIVATE_normalizeNumber(e.geoPointValue.longitude) === __PRIVATE_normalizeNumber(t.geoPointValue.longitude);
            }(e, t);

          case 2 /* TypeOrder.NumberValue */ :
            return function __PRIVATE_numberEquals(e, t) {
                if ("integerValue" in e && "integerValue" in t) return __PRIVATE_normalizeNumber(e.integerValue) === __PRIVATE_normalizeNumber(t.integerValue);
                if ("doubleValue" in e && "doubleValue" in t) {
                    const n = __PRIVATE_normalizeNumber(e.doubleValue), r = __PRIVATE_normalizeNumber(t.doubleValue);
                    return n === r ? __PRIVATE_isNegativeZero(n) === __PRIVATE_isNegativeZero(r) : isNaN(n) && isNaN(r);
                }
                return false;
            }(e, t);

          case 9 /* TypeOrder.ArrayValue */ :
            return __PRIVATE_arrayEquals(e.arrayValue.values || [], t.arrayValue.values || [], __PRIVATE_valueEquals);

          case 10 /* TypeOrder.VectorValue */ :
          case 11 /* TypeOrder.ObjectValue */ :
            return function __PRIVATE_objectEquals(e, t) {
                const n = e.mapValue.fields || {}, r = t.mapValue.fields || {};
                if (__PRIVATE_objectSize(n) !== __PRIVATE_objectSize(r)) return false;
                for (const e in n) if (n.hasOwnProperty(e) && (void 0 === r[e] || !__PRIVATE_valueEquals(n[e], r[e]))) return false;
                return true;
            }
            /** Returns true if the ArrayValue contains the specified element. */ (e, t);

          default:
            return fail(52216, {
                left: e
            });
        }
    }

    function __PRIVATE_arrayValueContains(e, t) {
        return void 0 !== (e.values || []).find((e => __PRIVATE_valueEquals(e, t)));
    }

    function __PRIVATE_valueCompare(e, t) {
        if (e === t) return 0;
        const n = __PRIVATE_typeOrder(e), r = __PRIVATE_typeOrder(t);
        if (n !== r) return __PRIVATE_primitiveComparator(n, r);
        switch (n) {
          case 0 /* TypeOrder.NullValue */ :
          case 9007199254740991 /* TypeOrder.MaxValue */ :
            return 0;

          case 1 /* TypeOrder.BooleanValue */ :
            return __PRIVATE_primitiveComparator(e.booleanValue, t.booleanValue);

          case 2 /* TypeOrder.NumberValue */ :
            return function __PRIVATE_compareNumbers(e, t) {
                const n = __PRIVATE_normalizeNumber(e.integerValue || e.doubleValue), r = __PRIVATE_normalizeNumber(t.integerValue || t.doubleValue);
                return n < r ? -1 : n > r ? 1 : n === r ? 0 : 
                // one or both are NaN.
                isNaN(n) ? isNaN(r) ? 0 : -1 : 1;
            }(e, t);

          case 3 /* TypeOrder.TimestampValue */ :
            return __PRIVATE_compareTimestamps(e.timestampValue, t.timestampValue);

          case 4 /* TypeOrder.ServerTimestampValue */ :
            return __PRIVATE_compareTimestamps(__PRIVATE_getLocalWriteTime(e), __PRIVATE_getLocalWriteTime(t));

          case 5 /* TypeOrder.StringValue */ :
            return __PRIVATE_compareUtf8Strings(e.stringValue, t.stringValue);

          case 6 /* TypeOrder.BlobValue */ :
            return function __PRIVATE_compareBlobs(e, t) {
                const n = __PRIVATE_normalizeByteString(e), r = __PRIVATE_normalizeByteString(t);
                return n.compareTo(r);
            }(e.bytesValue, t.bytesValue);

          case 7 /* TypeOrder.RefValue */ :
            return function __PRIVATE_compareReferences(e, t) {
                const n = e.split("/"), r = t.split("/");
                for (let e = 0; e < n.length && e < r.length; e++) {
                    const t = __PRIVATE_primitiveComparator(n[e], r[e]);
                    if (0 !== t) return t;
                }
                return __PRIVATE_primitiveComparator(n.length, r.length);
            }(e.referenceValue, t.referenceValue);

          case 8 /* TypeOrder.GeoPointValue */ :
            return function __PRIVATE_compareGeoPoints(e, t) {
                const n = __PRIVATE_primitiveComparator(__PRIVATE_normalizeNumber(e.latitude), __PRIVATE_normalizeNumber(t.latitude));
                if (0 !== n) return n;
                return __PRIVATE_primitiveComparator(__PRIVATE_normalizeNumber(e.longitude), __PRIVATE_normalizeNumber(t.longitude));
            }(e.geoPointValue, t.geoPointValue);

          case 9 /* TypeOrder.ArrayValue */ :
            return __PRIVATE_compareArrays(e.arrayValue, t.arrayValue);

          case 10 /* TypeOrder.VectorValue */ :
            return function __PRIVATE_compareVectors(e, t) {
                var n, r, i, s;
                const o = e.fields || {}, _ = t.fields || {}, a = null === (n = o[ut]) || void 0 === n ? void 0 : n.arrayValue, u = null === (r = _[ut]) || void 0 === r ? void 0 : r.arrayValue, c = __PRIVATE_primitiveComparator((null === (i = null == a ? void 0 : a.values) || void 0 === i ? void 0 : i.length) || 0, (null === (s = null == u ? void 0 : u.values) || void 0 === s ? void 0 : s.length) || 0);
                if (0 !== c) return c;
                return __PRIVATE_compareArrays(a, u);
            }(e.mapValue, t.mapValue);

          case 11 /* TypeOrder.ObjectValue */ :
            return function __PRIVATE_compareMaps(e, t) {
                if (e === _t.mapValue && t === _t.mapValue) return 0;
                if (e === _t.mapValue) return 1;
                if (t === _t.mapValue) return -1;
                const n = e.fields || {}, r = Object.keys(n), i = t.fields || {}, s = Object.keys(i);
                // Even though MapValues are likely sorted correctly based on their insertion
                // order (e.g. when received from the backend), local modifications can bring
                // elements out of order. We need to re-sort the elements to ensure that
                // canonical IDs are independent of insertion order.
                r.sort(), s.sort();
                for (let e = 0; e < r.length && e < s.length; ++e) {
                    const t = __PRIVATE_compareUtf8Strings(r[e], s[e]);
                    if (0 !== t) return t;
                    const o = __PRIVATE_valueCompare(n[r[e]], i[s[e]]);
                    if (0 !== o) return o;
                }
                return __PRIVATE_primitiveComparator(r.length, s.length);
            }
            /**
     * Generates the canonical ID for the provided field value (as used in Target
     * serialization).
     */ (e.mapValue, t.mapValue);

          default:
            throw fail(23264, {
                Pe: n
            });
        }
    }

    function __PRIVATE_compareTimestamps(e, t) {
        if ("string" == typeof e && "string" == typeof t && e.length === t.length) return __PRIVATE_primitiveComparator(e, t);
        const n = __PRIVATE_normalizeTimestamp(e), r = __PRIVATE_normalizeTimestamp(t), i = __PRIVATE_primitiveComparator(n.seconds, r.seconds);
        return 0 !== i ? i : __PRIVATE_primitiveComparator(n.nanos, r.nanos);
    }

    function __PRIVATE_compareArrays(e, t) {
        const n = e.values || [], r = t.values || [];
        for (let e = 0; e < n.length && e < r.length; ++e) {
            const t = __PRIVATE_valueCompare(n[e], r[e]);
            if (t) return t;
        }
        return __PRIVATE_primitiveComparator(n.length, r.length);
    }

    function canonicalId(e) {
        return __PRIVATE_canonifyValue(e);
    }

    function __PRIVATE_canonifyValue(e) {
        return "nullValue" in e ? "null" : "booleanValue" in e ? "" + e.booleanValue : "integerValue" in e ? "" + e.integerValue : "doubleValue" in e ? "" + e.doubleValue : "timestampValue" in e ? function __PRIVATE_canonifyTimestamp(e) {
            const t = __PRIVATE_normalizeTimestamp(e);
            return `time(${t.seconds},${t.nanos})`;
        }(e.timestampValue) : "stringValue" in e ? e.stringValue : "bytesValue" in e ? function __PRIVATE_canonifyByteString(e) {
            return __PRIVATE_normalizeByteString(e).toBase64();
        }(e.bytesValue) : "referenceValue" in e ? function __PRIVATE_canonifyReference(e) {
            return DocumentKey.fromName(e).toString();
        }(e.referenceValue) : "geoPointValue" in e ? function __PRIVATE_canonifyGeoPoint(e) {
            return `geo(${e.latitude},${e.longitude})`;
        }(e.geoPointValue) : "arrayValue" in e ? function __PRIVATE_canonifyArray(e) {
            let t = "[", n = true;
            for (const r of e.values || []) n ? n = false : t += ",", t += __PRIVATE_canonifyValue(r);
            return t + "]";
        }
        /**
     * Returns an approximate (and wildly inaccurate) in-memory size for the field
     * value.
     *
     * The memory size takes into account only the actual user data as it resides
     * in memory and ignores object overhead.
     */ (e.arrayValue) : "mapValue" in e ? function __PRIVATE_canonifyMap(e) {
            // Iteration order in JavaScript is not guaranteed. To ensure that we generate
            // matching canonical IDs for identical maps, we need to sort the keys.
            const t = Object.keys(e.fields || {}).sort();
            let n = "{", r = true;
            for (const i of t) r ? r = false : n += ",", n += `${i}:${__PRIVATE_canonifyValue(e.fields[i])}`;
            return n + "}";
        }(e.mapValue) : fail(61005, {
            value: e
        });
    }

    function __PRIVATE_estimateByteSize(e) {
        switch (__PRIVATE_typeOrder(e)) {
          case 0 /* TypeOrder.NullValue */ :
          case 1 /* TypeOrder.BooleanValue */ :
            return 4;

          case 2 /* TypeOrder.NumberValue */ :
            return 8;

          case 3 /* TypeOrder.TimestampValue */ :
          case 8 /* TypeOrder.GeoPointValue */ :
            // GeoPoints are made up of two distinct numbers (latitude + longitude)
            return 16;

          case 4 /* TypeOrder.ServerTimestampValue */ :
            const t = __PRIVATE_getPreviousValue(e);
            return t ? 16 + __PRIVATE_estimateByteSize(t) : 16;

          case 5 /* TypeOrder.StringValue */ :
            // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures:
            // "JavaScript's String type is [...] a set of elements of 16-bit unsigned
            // integer values"
            return 2 * e.stringValue.length;

          case 6 /* TypeOrder.BlobValue */ :
            return __PRIVATE_normalizeByteString(e.bytesValue).approximateByteSize();

          case 7 /* TypeOrder.RefValue */ :
            return e.referenceValue.length;

          case 9 /* TypeOrder.ArrayValue */ :
            return function __PRIVATE_estimateArrayByteSize(e) {
                return (e.values || []).reduce(((e, t) => e + __PRIVATE_estimateByteSize(t)), 0);
            }
            /** Returns a reference value for the provided database and key. */ (e.arrayValue);

          case 10 /* TypeOrder.VectorValue */ :
          case 11 /* TypeOrder.ObjectValue */ :
            return function __PRIVATE_estimateMapByteSize(e) {
                let t = 0;
                return forEach(e.fields, ((e, n) => {
                    t += e.length + __PRIVATE_estimateByteSize(n);
                })), t;
            }(e.mapValue);

          default:
            throw fail(13486, {
                value: e
            });
        }
    }

    /** Returns true if `value` is an IntegerValue . */ function isInteger(e) {
        return !!e && "integerValue" in e;
    }

    /** Returns true if `value` is a DoubleValue. */
    /** Returns true if `value` is an ArrayValue. */
    function isArray(e) {
        return !!e && "arrayValue" in e;
    }

    /** Returns true if `value` is a MapValue. */ function __PRIVATE_isMapValue(e) {
        return !!e && "mapValue" in e;
    }

    /** Returns true if `value` is a VetorValue. */ function __PRIVATE_isVectorValue(e) {
        var t, n;
        return (null === (n = ((null === (t = null == e ? void 0 : e.mapValue) || void 0 === t ? void 0 : t.fields) || {})[st]) || void 0 === n ? void 0 : n.stringValue) === at;
    }

    /** Creates a deep copy of `source`. */ function __PRIVATE_deepClone(e) {
        if (e.geoPointValue) return {
            geoPointValue: Object.assign({}, e.geoPointValue)
        };
        if (e.timestampValue && "object" == typeof e.timestampValue) return {
            timestampValue: Object.assign({}, e.timestampValue)
        };
        if (e.mapValue) {
            const t = {
                mapValue: {
                    fields: {}
                }
            };
            return forEach(e.mapValue.fields, ((e, n) => t.mapValue.fields[e] = __PRIVATE_deepClone(n))), 
            t;
        }
        if (e.arrayValue) {
            const t = {
                arrayValue: {
                    values: []
                }
            };
            for (let n = 0; n < (e.arrayValue.values || []).length; ++n) t.arrayValue.values[n] = __PRIVATE_deepClone(e.arrayValue.values[n]);
            return t;
        }
        return Object.assign({}, e);
    }

    /** Returns true if the Value represents the canonical {@link #MAX_VALUE} . */ function __PRIVATE_isMaxValue(e) {
        return (((e.mapValue || {}).fields || {}).__type__ || {}).stringValue === ot;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An ObjectValue represents a MapValue in the Firestore Proto and offers the
     * ability to add and remove fields (via the ObjectValueBuilder).
     */ class ObjectValue {
        constructor(e) {
            this.value = e;
        }
        static empty() {
            return new ObjectValue({
                mapValue: {}
            });
        }
        /**
         * Returns the value at the given path or null.
         *
         * @param path - the path to search
         * @returns The value at the path or null if the path is not set.
         */    field(e) {
            if (e.isEmpty()) return this.value;
            {
                let t = this.value;
                for (let n = 0; n < e.length - 1; ++n) if (t = (t.mapValue.fields || {})[e.get(n)], 
                !__PRIVATE_isMapValue(t)) return null;
                return t = (t.mapValue.fields || {})[e.lastSegment()], t || null;
            }
        }
        /**
         * Sets the field to the provided value.
         *
         * @param path - The field path to set.
         * @param value - The value to set.
         */    set(e, t) {
            this.getFieldsMap(e.popLast())[e.lastSegment()] = __PRIVATE_deepClone(t);
        }
        /**
         * Sets the provided fields to the provided values.
         *
         * @param data - A map of fields to values (or null for deletes).
         */    setAll(e) {
            let t = FieldPath$1.emptyPath(), n = {}, r = [];
            e.forEach(((e, i) => {
                if (!t.isImmediateParentOf(i)) {
                    // Insert the accumulated changes at this parent location
                    const e = this.getFieldsMap(t);
                    this.applyChanges(e, n, r), n = {}, r = [], t = i.popLast();
                }
                e ? n[i.lastSegment()] = __PRIVATE_deepClone(e) : r.push(i.lastSegment());
            }));
            const i = this.getFieldsMap(t);
            this.applyChanges(i, n, r);
        }
        /**
         * Removes the field at the specified path. If there is no field at the
         * specified path, nothing is changed.
         *
         * @param path - The field path to remove.
         */    delete(e) {
            const t = this.field(e.popLast());
            __PRIVATE_isMapValue(t) && t.mapValue.fields && delete t.mapValue.fields[e.lastSegment()];
        }
        isEqual(e) {
            return __PRIVATE_valueEquals(this.value, e.value);
        }
        /**
         * Returns the map that contains the leaf element of `path`. If the parent
         * entry does not yet exist, or if it is not a map, a new map will be created.
         */    getFieldsMap(e) {
            let t = this.value;
            t.mapValue.fields || (t.mapValue = {
                fields: {}
            });
            for (let n = 0; n < e.length; ++n) {
                let r = t.mapValue.fields[e.get(n)];
                __PRIVATE_isMapValue(r) && r.mapValue.fields || (r = {
                    mapValue: {
                        fields: {}
                    }
                }, t.mapValue.fields[e.get(n)] = r), t = r;
            }
            return t.mapValue.fields;
        }
        /**
         * Modifies `fieldsMap` by adding, replacing or deleting the specified
         * entries.
         */    applyChanges(e, t, n) {
            forEach(t, ((t, n) => e[t] = n));
            for (const t of n) delete e[t];
        }
        clone() {
            return new ObjectValue(__PRIVATE_deepClone(this.value));
        }
    }

    /**
     * Returns a FieldMask built from all fields in a MapValue.
     */ function __PRIVATE_extractFieldMask(e) {
        const t = [];
        return forEach(e.fields, ((e, n) => {
            const r = new FieldPath$1([ e ]);
            if (__PRIVATE_isMapValue(n)) {
                const e = __PRIVATE_extractFieldMask(n.mapValue).fields;
                if (0 === e.length) 
                // Preserve the empty map by adding it to the FieldMask.
                t.push(r); else 
                // For nested and non-empty ObjectValues, add the FieldPath of the
                // leaf nodes.
                for (const n of e) t.push(r.child(n));
            } else 
            // For nested and non-empty ObjectValues, add the FieldPath of the leaf
            // nodes.
            t.push(r);
        })), new FieldMask(t);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents a document in Firestore with a key, version, data and whether it
     * has local mutations applied to it.
     *
     * Documents can transition between states via `convertToFoundDocument()`,
     * `convertToNoDocument()` and `convertToUnknownDocument()`. If a document does
     * not transition to one of these states even after all mutations have been
     * applied, `isValidDocument()` returns false and the document should be removed
     * from all views.
     */ class MutableDocument {
        constructor(e, t, n, r, i, s, o) {
            this.key = e, this.documentType = t, this.version = n, this.readTime = r, this.createTime = i, 
            this.data = s, this.documentState = o;
        }
        /**
         * Creates a document with no known version or data, but which can serve as
         * base document for mutations.
         */    static newInvalidDocument(e) {
            return new MutableDocument(e, 0 /* DocumentType.INVALID */ , 
            /* version */ SnapshotVersion.min(), 
            /* readTime */ SnapshotVersion.min(), 
            /* createTime */ SnapshotVersion.min(), ObjectValue.empty(), 0 /* DocumentState.SYNCED */);
        }
        /**
         * Creates a new document that is known to exist with the given data at the
         * given version.
         */    static newFoundDocument(e, t, n, r) {
            return new MutableDocument(e, 1 /* DocumentType.FOUND_DOCUMENT */ , 
            /* version */ t, 
            /* readTime */ SnapshotVersion.min(), 
            /* createTime */ n, r, 0 /* DocumentState.SYNCED */);
        }
        /** Creates a new document that is known to not exist at the given version. */    static newNoDocument(e, t) {
            return new MutableDocument(e, 2 /* DocumentType.NO_DOCUMENT */ , 
            /* version */ t, 
            /* readTime */ SnapshotVersion.min(), 
            /* createTime */ SnapshotVersion.min(), ObjectValue.empty(), 0 /* DocumentState.SYNCED */);
        }
        /**
         * Creates a new document that is known to exist at the given version but
         * whose data is not known (e.g. a document that was updated without a known
         * base document).
         */    static newUnknownDocument(e, t) {
            return new MutableDocument(e, 3 /* DocumentType.UNKNOWN_DOCUMENT */ , 
            /* version */ t, 
            /* readTime */ SnapshotVersion.min(), 
            /* createTime */ SnapshotVersion.min(), ObjectValue.empty(), 2 /* DocumentState.HAS_COMMITTED_MUTATIONS */);
        }
        /**
         * Changes the document type to indicate that it exists and that its version
         * and data are known.
         */    convertToFoundDocument(e, t) {
            // If a document is switching state from being an invalid or deleted
            // document to a valid (FOUND_DOCUMENT) document, either due to receiving an
            // update from Watch or due to applying a local set mutation on top
            // of a deleted document, our best guess about its createTime would be the
            // version at which the document transitioned to a FOUND_DOCUMENT.
            return !this.createTime.isEqual(SnapshotVersion.min()) || 2 /* DocumentType.NO_DOCUMENT */ !== this.documentType && 0 /* DocumentType.INVALID */ !== this.documentType || (this.createTime = e), 
            this.version = e, this.documentType = 1 /* DocumentType.FOUND_DOCUMENT */ , this.data = t, 
            this.documentState = 0 /* DocumentState.SYNCED */ , this;
        }
        /**
         * Changes the document type to indicate that it doesn't exist at the given
         * version.
         */    convertToNoDocument(e) {
            return this.version = e, this.documentType = 2 /* DocumentType.NO_DOCUMENT */ , 
            this.data = ObjectValue.empty(), this.documentState = 0 /* DocumentState.SYNCED */ , 
            this;
        }
        /**
         * Changes the document type to indicate that it exists at a given version but
         * that its data is not known (e.g. a document that was updated without a known
         * base document).
         */    convertToUnknownDocument(e) {
            return this.version = e, this.documentType = 3 /* DocumentType.UNKNOWN_DOCUMENT */ , 
            this.data = ObjectValue.empty(), this.documentState = 2 /* DocumentState.HAS_COMMITTED_MUTATIONS */ , 
            this;
        }
        setHasCommittedMutations() {
            return this.documentState = 2 /* DocumentState.HAS_COMMITTED_MUTATIONS */ , this;
        }
        setHasLocalMutations() {
            return this.documentState = 1 /* DocumentState.HAS_LOCAL_MUTATIONS */ , this.version = SnapshotVersion.min(), 
            this;
        }
        setReadTime(e) {
            return this.readTime = e, this;
        }
        get hasLocalMutations() {
            return 1 /* DocumentState.HAS_LOCAL_MUTATIONS */ === this.documentState;
        }
        get hasCommittedMutations() {
            return 2 /* DocumentState.HAS_COMMITTED_MUTATIONS */ === this.documentState;
        }
        get hasPendingWrites() {
            return this.hasLocalMutations || this.hasCommittedMutations;
        }
        isValidDocument() {
            return 0 /* DocumentType.INVALID */ !== this.documentType;
        }
        isFoundDocument() {
            return 1 /* DocumentType.FOUND_DOCUMENT */ === this.documentType;
        }
        isNoDocument() {
            return 2 /* DocumentType.NO_DOCUMENT */ === this.documentType;
        }
        isUnknownDocument() {
            return 3 /* DocumentType.UNKNOWN_DOCUMENT */ === this.documentType;
        }
        isEqual(e) {
            return e instanceof MutableDocument && this.key.isEqual(e.key) && this.version.isEqual(e.version) && this.documentType === e.documentType && this.documentState === e.documentState && this.data.isEqual(e.data);
        }
        mutableCopy() {
            return new MutableDocument(this.key, this.documentType, this.version, this.readTime, this.createTime, this.data.clone(), this.documentState);
        }
        toString() {
            return `Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`;
        }
    }

    /**
     * Compares the value for field `field` in the provided documents. Throws if
     * the field does not exist in both documents.
     */
    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents a bound of a query.
     *
     * The bound is specified with the given components representing a position and
     * whether it's just before or just after the position (relative to whatever the
     * query order is).
     *
     * The position represents a logical index position for a query. It's a prefix
     * of values for the (potentially implicit) order by clauses of a query.
     *
     * Bound provides a function to determine whether a document comes before or
     * after a bound. This is influenced by whether the position is just before or
     * just after the provided values.
     */
    class Bound {
        constructor(e, t) {
            this.position = e, this.inclusive = t;
        }
    }

    function __PRIVATE_boundCompareToDocument(e, t, n) {
        let r = 0;
        for (let i = 0; i < e.position.length; i++) {
            const s = t[i], o = e.position[i];
            if (s.field.isKeyField()) r = DocumentKey.comparator(DocumentKey.fromName(o.referenceValue), n.key); else {
                r = __PRIVATE_valueCompare(o, n.data.field(s.field));
            }
            if ("desc" /* Direction.DESCENDING */ === s.dir && (r *= -1), 0 !== r) break;
        }
        return r;
    }

    /**
     * Returns true if a document sorts after a bound using the provided sort
     * order.
     */ function __PRIVATE_boundEquals(e, t) {
        if (null === e) return null === t;
        if (null === t) return false;
        if (e.inclusive !== t.inclusive || e.position.length !== t.position.length) return false;
        for (let n = 0; n < e.position.length; n++) {
            if (!__PRIVATE_valueEquals(e.position[n], t.position[n])) return false;
        }
        return true;
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
     */ class OrderBy {
        constructor(e, t = "asc" /* Direction.ASCENDING */) {
            this.field = e, this.dir = t;
        }
    }

    function __PRIVATE_orderByEquals(e, t) {
        return e.dir === t.dir && e.field.isEqual(t.field);
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class Filter {}

    class FieldFilter extends Filter {
        constructor(e, t, n) {
            super(), this.field = e, this.op = t, this.value = n;
        }
        /**
         * Creates a filter based on the provided arguments.
         */    static create(e, t, n) {
            return e.isKeyField() ? "in" /* Operator.IN */ === t || "not-in" /* Operator.NOT_IN */ === t ? this.createKeyFieldInFilter(e, t, n) : new __PRIVATE_KeyFieldFilter(e, t, n) : "array-contains" /* Operator.ARRAY_CONTAINS */ === t ? new __PRIVATE_ArrayContainsFilter(e, n) : "in" /* Operator.IN */ === t ? new __PRIVATE_InFilter(e, n) : "not-in" /* Operator.NOT_IN */ === t ? new __PRIVATE_NotInFilter(e, n) : "array-contains-any" /* Operator.ARRAY_CONTAINS_ANY */ === t ? new __PRIVATE_ArrayContainsAnyFilter(e, n) : new FieldFilter(e, t, n);
        }
        static createKeyFieldInFilter(e, t, n) {
            return "in" /* Operator.IN */ === t ? new __PRIVATE_KeyFieldInFilter(e, n) : new __PRIVATE_KeyFieldNotInFilter(e, n);
        }
        matches(e) {
            const t = e.data.field(this.field);
            // Types do not have to match in NOT_EQUAL filters.
                    return "!=" /* Operator.NOT_EQUAL */ === this.op ? null !== t && void 0 === t.nullValue && this.matchesComparison(__PRIVATE_valueCompare(t, this.value)) : null !== t && __PRIVATE_typeOrder(this.value) === __PRIVATE_typeOrder(t) && this.matchesComparison(__PRIVATE_valueCompare(t, this.value));
            // Only compare types with matching backend order (such as double and int).
            }
        matchesComparison(e) {
            switch (this.op) {
              case "<" /* Operator.LESS_THAN */ :
                return e < 0;

              case "<=" /* Operator.LESS_THAN_OR_EQUAL */ :
                return e <= 0;

              case "==" /* Operator.EQUAL */ :
                return 0 === e;

              case "!=" /* Operator.NOT_EQUAL */ :
                return 0 !== e;

              case ">" /* Operator.GREATER_THAN */ :
                return e > 0;

              case ">=" /* Operator.GREATER_THAN_OR_EQUAL */ :
                return e >= 0;

              default:
                return fail(47266, {
                    operator: this.op
                });
            }
        }
        isInequality() {
            return [ "<" /* Operator.LESS_THAN */ , "<=" /* Operator.LESS_THAN_OR_EQUAL */ , ">" /* Operator.GREATER_THAN */ , ">=" /* Operator.GREATER_THAN_OR_EQUAL */ , "!=" /* Operator.NOT_EQUAL */ , "not-in" /* Operator.NOT_IN */ ].indexOf(this.op) >= 0;
        }
        getFlattenedFilters() {
            return [ this ];
        }
        getFilters() {
            return [ this ];
        }
    }

    class CompositeFilter extends Filter {
        constructor(e, t) {
            super(), this.filters = e, this.op = t, this.Te = null;
        }
        /**
         * Creates a filter based on the provided arguments.
         */    static create(e, t) {
            return new CompositeFilter(e, t);
        }
        matches(e) {
            return __PRIVATE_compositeFilterIsConjunction(this) ? void 0 === this.filters.find((t => !t.matches(e))) : void 0 !== this.filters.find((t => t.matches(e)));
        }
        getFlattenedFilters() {
            return null !== this.Te || (this.Te = this.filters.reduce(((e, t) => e.concat(t.getFlattenedFilters())), [])), 
            this.Te;
        }
        // Returns a mutable copy of `this.filters`
        getFilters() {
            return Object.assign([], this.filters);
        }
    }

    function __PRIVATE_compositeFilterIsConjunction(e) {
        return "and" /* CompositeOperator.AND */ === e.op;
    }

    /**
     * Returns true if this filter is a conjunction of field filters only. Returns false otherwise.
     */ function __PRIVATE_compositeFilterIsFlatConjunction(e) {
        return __PRIVATE_compositeFilterIsFlat(e) && __PRIVATE_compositeFilterIsConjunction(e);
    }

    /**
     * Returns true if this filter does not contain any composite filters. Returns false otherwise.
     */ function __PRIVATE_compositeFilterIsFlat(e) {
        for (const t of e.filters) if (t instanceof CompositeFilter) return false;
        return true;
    }

    function __PRIVATE_canonifyFilter(e) {
        if (e instanceof FieldFilter) 
        // TODO(b/29183165): Technically, this won't be unique if two values have
        // the same description, such as the int 3 and the string "3". So we should
        // add the types in here somehow, too.
        return e.field.canonicalString() + e.op.toString() + canonicalId(e.value);
        if (__PRIVATE_compositeFilterIsFlatConjunction(e)) 
        // Older SDK versions use an implicit AND operation between their filters.
        // In the new SDK versions, the developer may use an explicit AND filter.
        // To stay consistent with the old usages, we add a special case to ensure
        // the canonical ID for these two are the same. For example:
        // `col.whereEquals("a", 1).whereEquals("b", 2)` should have the same
        // canonical ID as `col.where(and(equals("a",1), equals("b",2)))`.
        return e.filters.map((e => __PRIVATE_canonifyFilter(e))).join(",");
        {
            // filter instanceof CompositeFilter
            const t = e.filters.map((e => __PRIVATE_canonifyFilter(e))).join(",");
            return `${e.op}(${t})`;
        }
    }

    function __PRIVATE_filterEquals(e, t) {
        return e instanceof FieldFilter ? function __PRIVATE_fieldFilterEquals(e, t) {
            return t instanceof FieldFilter && e.op === t.op && e.field.isEqual(t.field) && __PRIVATE_valueEquals(e.value, t.value);
        }(e, t) : e instanceof CompositeFilter ? function __PRIVATE_compositeFilterEquals(e, t) {
            if (t instanceof CompositeFilter && e.op === t.op && e.filters.length === t.filters.length) {
                return e.filters.reduce(((e, n, r) => e && __PRIVATE_filterEquals(n, t.filters[r])), true);
            }
            return false;
        }
        /**
     * Returns a new composite filter that contains all filter from
     * `compositeFilter` plus all the given filters in `otherFilters`.
     */ (e, t) : void fail(19439);
    }

    /** Returns a debug description for `filter`. */ function __PRIVATE_stringifyFilter(e) {
        return e instanceof FieldFilter ? function __PRIVATE_stringifyFieldFilter(e) {
            return `${e.field.canonicalString()} ${e.op} ${canonicalId(e.value)}`;
        }
        /** Filter that matches on key fields (i.e. '__name__'). */ (e) : e instanceof CompositeFilter ? function __PRIVATE_stringifyCompositeFilter(e) {
            return e.op.toString() + " {" + e.getFilters().map(__PRIVATE_stringifyFilter).join(" ,") + "}";
        }(e) : "Filter";
    }

    class __PRIVATE_KeyFieldFilter extends FieldFilter {
        constructor(e, t, n) {
            super(e, t, n), this.key = DocumentKey.fromName(n.referenceValue);
        }
        matches(e) {
            const t = DocumentKey.comparator(e.key, this.key);
            return this.matchesComparison(t);
        }
    }

    /** Filter that matches on key fields within an array. */ class __PRIVATE_KeyFieldInFilter extends FieldFilter {
        constructor(e, t) {
            super(e, "in" /* Operator.IN */ , t), this.keys = __PRIVATE_extractDocumentKeysFromArrayValue("in" /* Operator.IN */ , t);
        }
        matches(e) {
            return this.keys.some((t => t.isEqual(e.key)));
        }
    }

    /** Filter that matches on key fields not present within an array. */ class __PRIVATE_KeyFieldNotInFilter extends FieldFilter {
        constructor(e, t) {
            super(e, "not-in" /* Operator.NOT_IN */ , t), this.keys = __PRIVATE_extractDocumentKeysFromArrayValue("not-in" /* Operator.NOT_IN */ , t);
        }
        matches(e) {
            return !this.keys.some((t => t.isEqual(e.key)));
        }
    }

    function __PRIVATE_extractDocumentKeysFromArrayValue(e, t) {
        var n;
        return ((null === (n = t.arrayValue) || void 0 === n ? void 0 : n.values) || []).map((e => DocumentKey.fromName(e.referenceValue)));
    }

    /** A Filter that implements the array-contains operator. */ class __PRIVATE_ArrayContainsFilter extends FieldFilter {
        constructor(e, t) {
            super(e, "array-contains" /* Operator.ARRAY_CONTAINS */ , t);
        }
        matches(e) {
            const t = e.data.field(this.field);
            return isArray(t) && __PRIVATE_arrayValueContains(t.arrayValue, this.value);
        }
    }

    /** A Filter that implements the IN operator. */ class __PRIVATE_InFilter extends FieldFilter {
        constructor(e, t) {
            super(e, "in" /* Operator.IN */ , t);
        }
        matches(e) {
            const t = e.data.field(this.field);
            return null !== t && __PRIVATE_arrayValueContains(this.value.arrayValue, t);
        }
    }

    /** A Filter that implements the not-in operator. */ class __PRIVATE_NotInFilter extends FieldFilter {
        constructor(e, t) {
            super(e, "not-in" /* Operator.NOT_IN */ , t);
        }
        matches(e) {
            if (__PRIVATE_arrayValueContains(this.value.arrayValue, {
                nullValue: "NULL_VALUE"
            })) return false;
            const t = e.data.field(this.field);
            return null !== t && void 0 === t.nullValue && !__PRIVATE_arrayValueContains(this.value.arrayValue, t);
        }
    }

    /** A Filter that implements the array-contains-any operator. */ class __PRIVATE_ArrayContainsAnyFilter extends FieldFilter {
        constructor(e, t) {
            super(e, "array-contains-any" /* Operator.ARRAY_CONTAINS_ANY */ , t);
        }
        matches(e) {
            const t = e.data.field(this.field);
            return !(!isArray(t) || !t.arrayValue.values) && t.arrayValue.values.some((e => __PRIVATE_arrayValueContains(this.value.arrayValue, e)));
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // Visible for testing
    class __PRIVATE_TargetImpl {
        constructor(e, t = null, n = [], r = [], i = null, s = null, o = null) {
            this.path = e, this.collectionGroup = t, this.orderBy = n, this.filters = r, this.limit = i, 
            this.startAt = s, this.endAt = o, this.Ie = null;
        }
    }

    /**
     * Initializes a Target with a path and optional additional query constraints.
     * Path must currently be empty if this is a collection group query.
     *
     * NOTE: you should always construct `Target` from `Query.toTarget` instead of
     * using this factory method, because `Query` provides an implicit `orderBy`
     * property.
     */ function __PRIVATE_newTarget(e, t = null, n = [], r = [], i = null, s = null, o = null) {
        return new __PRIVATE_TargetImpl(e, t, n, r, i, s, o);
    }

    function __PRIVATE_canonifyTarget(e) {
        const t = __PRIVATE_debugCast(e);
        if (null === t.Ie) {
            let e = t.path.canonicalString();
            null !== t.collectionGroup && (e += "|cg:" + t.collectionGroup), e += "|f:", e += t.filters.map((e => __PRIVATE_canonifyFilter(e))).join(","), 
            e += "|ob:", e += t.orderBy.map((e => function __PRIVATE_canonifyOrderBy(e) {
                // TODO(b/29183165): Make this collision robust.
                return e.field.canonicalString() + e.dir;
            }(e))).join(","), __PRIVATE_isNullOrUndefined(t.limit) || (e += "|l:", e += t.limit), 
            t.startAt && (e += "|lb:", e += t.startAt.inclusive ? "b:" : "a:", e += t.startAt.position.map((e => canonicalId(e))).join(",")), 
            t.endAt && (e += "|ub:", e += t.endAt.inclusive ? "a:" : "b:", e += t.endAt.position.map((e => canonicalId(e))).join(",")), 
            t.Ie = e;
        }
        return t.Ie;
    }

    function __PRIVATE_targetEquals(e, t) {
        if (e.limit !== t.limit) return false;
        if (e.orderBy.length !== t.orderBy.length) return false;
        for (let n = 0; n < e.orderBy.length; n++) if (!__PRIVATE_orderByEquals(e.orderBy[n], t.orderBy[n])) return false;
        if (e.filters.length !== t.filters.length) return false;
        for (let n = 0; n < e.filters.length; n++) if (!__PRIVATE_filterEquals(e.filters[n], t.filters[n])) return false;
        return e.collectionGroup === t.collectionGroup && (!!e.path.isEqual(t.path) && (!!__PRIVATE_boundEquals(e.startAt, t.startAt) && __PRIVATE_boundEquals(e.endAt, t.endAt)));
    }

    /** Returns the number of segments of a perfect index for this target. */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Query encapsulates all the query attributes we support in the SDK. It can
     * be run against the LocalStore, as well as be converted to a `Target` to
     * query the RemoteStore results.
     *
     * Visible for testing.
     */
    class __PRIVATE_QueryImpl {
        /**
         * Initializes a Query with a path and optional additional query constraints.
         * Path must currently be empty if this is a collection group query.
         */
        constructor(e, t = null, n = [], r = [], i = null, s = "F" /* LimitType.First */ , o = null, _ = null) {
            this.path = e, this.collectionGroup = t, this.explicitOrderBy = n, this.filters = r, 
            this.limit = i, this.limitType = s, this.startAt = o, this.endAt = _, this.Ee = null, 
            // The corresponding `Target` of this `Query` instance, for use with
            // non-aggregate queries.
            this.de = null, 
            // The corresponding `Target` of this `Query` instance, for use with
            // aggregate queries. Unlike targets for non-aggregate queries,
            // aggregate query targets do not contain normalized order-bys, they only
            // contain explicit order-bys.
            this.Ae = null, this.startAt, this.endAt;
        }
    }

    /** Creates a new Query instance with the options provided. */ function __PRIVATE_newQuery(e, t, n, r, i, s, o, _) {
        return new __PRIVATE_QueryImpl(e, t, n, r, i, s, o, _);
    }

    /** Creates a new Query for a query that matches all documents at `path` */ function __PRIVATE_newQueryForPath(e) {
        return new __PRIVATE_QueryImpl(e);
    }

    /**
     * Helper to convert a collection group query into a collection query at a
     * specific path. This is used when executing collection group queries, since
     * we have to split the query into a set of collection queries at multiple
     * paths.
     */
    /**
     * Returns true if this query does not specify any query constraints that
     * could remove results.
     */
    function __PRIVATE_queryMatchesAllDocuments(e) {
        return 0 === e.filters.length && null === e.limit && null == e.startAt && null == e.endAt && (0 === e.explicitOrderBy.length || 1 === e.explicitOrderBy.length && e.explicitOrderBy[0].field.isKeyField());
    }

    // Returns the sorted set of inequality filter fields used in this query.
    /**
     * Returns whether the query matches a collection group rather than a specific
     * collection.
     */
    function __PRIVATE_isCollectionGroupQuery(e) {
        return null !== e.collectionGroup;
    }

    /**
     * Returns the normalized order-by constraint that is used to execute the Query,
     * which can be different from the order-by constraints the user provided (e.g.
     * the SDK and backend always orders by `__name__`). The normalized order-by
     * includes implicit order-bys in addition to the explicit user provided
     * order-bys.
     */ function __PRIVATE_queryNormalizedOrderBy(e) {
        const t = __PRIVATE_debugCast(e);
        if (null === t.Ee) {
            t.Ee = [];
            const e = new Set;
            // Any explicit order by fields should be added as is.
                    for (const n of t.explicitOrderBy) t.Ee.push(n), e.add(n.field.canonicalString());
            // The order of the implicit ordering always matches the last explicit order by.
                    const n = t.explicitOrderBy.length > 0 ? t.explicitOrderBy[t.explicitOrderBy.length - 1].dir : "asc" /* Direction.ASCENDING */ , r = function __PRIVATE_getInequalityFilterFields(e) {
                let t = new SortedSet(FieldPath$1.comparator);
                return e.filters.forEach((e => {
                    e.getFlattenedFilters().forEach((e => {
                        e.isInequality() && (t = t.add(e.field));
                    }));
                })), t;
            }
            /**
     * Creates a new Query for a collection group query that matches all documents
     * within the provided collection group.
     */ (t);
            // Any inequality fields not explicitly ordered should be implicitly ordered in a lexicographical
            // order. When there are multiple inequality filters on the same field, the field should be added
            // only once.
            // Note: `SortedSet<FieldPath>` sorts the key field before other fields. However, we want the key
            // field to be sorted last.
                    r.forEach((r => {
                e.has(r.canonicalString()) || r.isKeyField() || t.Ee.push(new OrderBy(r, n));
            })), 
            // Add the document key field to the last if it is not explicitly ordered.
            e.has(FieldPath$1.keyField().canonicalString()) || t.Ee.push(new OrderBy(FieldPath$1.keyField(), n));
        }
        return t.Ee;
    }

    /**
     * Converts this `Query` instance to its corresponding `Target` representation.
     */ function __PRIVATE_queryToTarget(e) {
        const t = __PRIVATE_debugCast(e);
        return t.de || (t.de = __PRIVATE__queryToTarget(t, __PRIVATE_queryNormalizedOrderBy(e))), 
        t.de;
    }

    function __PRIVATE__queryToTarget(e, t) {
        if ("F" /* LimitType.First */ === e.limitType) return __PRIVATE_newTarget(e.path, e.collectionGroup, t, e.filters, e.limit, e.startAt, e.endAt);
        {
            // Flip the orderBy directions since we want the last results
            t = t.map((e => {
                const t = "desc" /* Direction.DESCENDING */ === e.dir ? "asc" /* Direction.ASCENDING */ : "desc" /* Direction.DESCENDING */;
                return new OrderBy(e.field, t);
            }));
            // We need to swap the cursors to match the now-flipped query ordering.
            const n = e.endAt ? new Bound(e.endAt.position, e.endAt.inclusive) : null, r = e.startAt ? new Bound(e.startAt.position, e.startAt.inclusive) : null;
            // Now return as a LimitType.First query.
            return __PRIVATE_newTarget(e.path, e.collectionGroup, t, e.filters, e.limit, n, r);
        }
    }

    function __PRIVATE_queryWithLimit(e, t, n) {
        return new __PRIVATE_QueryImpl(e.path, e.collectionGroup, e.explicitOrderBy.slice(), e.filters.slice(), t, n, e.startAt, e.endAt);
    }

    function __PRIVATE_queryEquals(e, t) {
        return __PRIVATE_targetEquals(__PRIVATE_queryToTarget(e), __PRIVATE_queryToTarget(t)) && e.limitType === t.limitType;
    }

    // TODO(b/29183165): This is used to get a unique string from a query to, for
    // example, use as a dictionary key, but the implementation is subject to
    // collisions. Make it collision-free.
    function __PRIVATE_canonifyQuery(e) {
        return `${__PRIVATE_canonifyTarget(__PRIVATE_queryToTarget(e))}|lt:${e.limitType}`;
    }

    function __PRIVATE_stringifyQuery(e) {
        return `Query(target=${function __PRIVATE_stringifyTarget(e) {
        let t = e.path.canonicalString();
        return null !== e.collectionGroup && (t += " collectionGroup=" + e.collectionGroup), 
        e.filters.length > 0 && (t += `, filters: [${e.filters.map((e => __PRIVATE_stringifyFilter(e))).join(", ")}]`), 
        __PRIVATE_isNullOrUndefined(e.limit) || (t += ", limit: " + e.limit), e.orderBy.length > 0 && (t += `, orderBy: [${e.orderBy.map((e => function __PRIVATE_stringifyOrderBy(e) {
            return `${e.field.canonicalString()} (${e.dir})`;
        }(e))).join(", ")}]`), e.startAt && (t += ", startAt: ", t += e.startAt.inclusive ? "b:" : "a:", 
        t += e.startAt.position.map((e => canonicalId(e))).join(",")), e.endAt && (t += ", endAt: ", 
        t += e.endAt.inclusive ? "a:" : "b:", t += e.endAt.position.map((e => canonicalId(e))).join(",")), 
        `Target(${t})`;
    }(__PRIVATE_queryToTarget(e))}; limitType=${e.limitType})`;
    }

    /** Returns whether `doc` matches the constraints of `query`. */ function __PRIVATE_queryMatches(e, t) {
        return t.isFoundDocument() && function __PRIVATE_queryMatchesPathAndCollectionGroup(e, t) {
            const n = t.key.path;
            return null !== e.collectionGroup ? t.key.hasCollectionId(e.collectionGroup) && e.path.isPrefixOf(n) : DocumentKey.isDocumentKey(e.path) ? e.path.isEqual(n) : e.path.isImmediateParentOf(n);
        }
        /**
     * A document must have a value for every ordering clause in order to show up
     * in the results.
     */ (e, t) && function __PRIVATE_queryMatchesOrderBy(e, t) {
            // We must use `queryNormalizedOrderBy()` to get the list of all orderBys (both implicit and explicit).
            // Note that for OR queries, orderBy applies to all disjunction terms and implicit orderBys must
            // be taken into account. For example, the query "a > 1 || b==1" has an implicit "orderBy a" due
            // to the inequality, and is evaluated as "a > 1 orderBy a || b==1 orderBy a".
            // A document with content of {b:1} matches the filters, but does not match the orderBy because
            // it's missing the field 'a'.
            for (const n of __PRIVATE_queryNormalizedOrderBy(e)) 
            // order-by key always matches
            if (!n.field.isKeyField() && null === t.data.field(n.field)) return false;
            return true;
        }(e, t) && function __PRIVATE_queryMatchesFilters(e, t) {
            for (const n of e.filters) if (!n.matches(t)) return false;
            return true;
        }
        /** Makes sure a document is within the bounds, if provided. */ (e, t) && function __PRIVATE_queryMatchesBounds(e, t) {
            if (e.startAt && !
            /**
     * Returns true if a document sorts before a bound using the provided sort
     * order.
     */
            function __PRIVATE_boundSortsBeforeDocument(e, t, n) {
                const r = __PRIVATE_boundCompareToDocument(e, t, n);
                return e.inclusive ? r <= 0 : r < 0;
            }(e.startAt, __PRIVATE_queryNormalizedOrderBy(e), t)) return false;
            if (e.endAt && !function __PRIVATE_boundSortsAfterDocument(e, t, n) {
                const r = __PRIVATE_boundCompareToDocument(e, t, n);
                return e.inclusive ? r >= 0 : r > 0;
            }(e.endAt, __PRIVATE_queryNormalizedOrderBy(e), t)) return false;
            return true;
        }
        /**
     * Returns the collection group that this query targets.
     *
     * PORTING NOTE: This is only used in the Web SDK to facilitate multi-tab
     * synchronization for query results.
     */ (e, t);
    }

    /**
     * Returns a new comparator function that can be used to compare two documents
     * based on the Query's ordering constraint.
     */ function __PRIVATE_newQueryComparator(e) {
        return (t, n) => {
            let r = false;
            for (const i of __PRIVATE_queryNormalizedOrderBy(e)) {
                const e = __PRIVATE_compareDocs(i, t, n);
                if (0 !== e) return e;
                r = r || i.field.isKeyField();
            }
            return 0;
        };
    }

    function __PRIVATE_compareDocs(e, t, n) {
        const r = e.field.isKeyField() ? DocumentKey.comparator(t.key, n.key) : function __PRIVATE_compareDocumentsByField(e, t, n) {
            const r = t.data.field(e), i = n.data.field(e);
            return null !== r && null !== i ? __PRIVATE_valueCompare(r, i) : fail(42886);
        }(e.field, t, n);
        switch (e.dir) {
          case "asc" /* Direction.ASCENDING */ :
            return r;

          case "desc" /* Direction.DESCENDING */ :
            return -1 * r;

          default:
            return fail(19790, {
                direction: e.dir
            });
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A map implementation that uses objects as keys. Objects must have an
     * associated equals function and must be immutable. Entries in the map are
     * stored together with the key being produced from the mapKeyFn. This map
     * automatically handles collisions of keys.
     */ class ObjectMap {
        constructor(e, t) {
            this.mapKeyFn = e, this.equalsFn = t, 
            /**
             * The inner map for a key/value pair. Due to the possibility of collisions we
             * keep a list of entries that we do a linear search through to find an actual
             * match. Note that collisions should be rare, so we still expect near
             * constant time lookups in practice.
             */
            this.inner = {}, 
            /** The number of entries stored in the map */
            this.innerSize = 0;
        }
        /** Get a value for this key, or undefined if it does not exist. */    get(e) {
            const t = this.mapKeyFn(e), n = this.inner[t];
            if (void 0 !== n) for (const [t, r] of n) if (this.equalsFn(t, e)) return r;
        }
        has(e) {
            return void 0 !== this.get(e);
        }
        /** Put this key and value in the map. */    set(e, t) {
            const n = this.mapKeyFn(e), r = this.inner[n];
            if (void 0 === r) return this.inner[n] = [ [ e, t ] ], void this.innerSize++;
            for (let n = 0; n < r.length; n++) if (this.equalsFn(r[n][0], e)) 
            // This is updating an existing entry and does not increase `innerSize`.
            return void (r[n] = [ e, t ]);
            r.push([ e, t ]), this.innerSize++;
        }
        /**
         * Remove this key from the map. Returns a boolean if anything was deleted.
         */    delete(e) {
            const t = this.mapKeyFn(e), n = this.inner[t];
            if (void 0 === n) return false;
            for (let r = 0; r < n.length; r++) if (this.equalsFn(n[r][0], e)) return 1 === n.length ? delete this.inner[t] : n.splice(r, 1), 
            this.innerSize--, true;
            return false;
        }
        forEach(e) {
            forEach(this.inner, ((t, n) => {
                for (const [t, r] of n) e(t, r);
            }));
        }
        isEmpty() {
            return isEmpty(this.inner);
        }
        size() {
            return this.innerSize;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const ht = new SortedMap(DocumentKey.comparator);

    function __PRIVATE_mutableDocumentMap() {
        return ht;
    }

    const Pt = new SortedMap(DocumentKey.comparator);

    function documentMap(...e) {
        let t = Pt;
        for (const n of e) t = t.insert(n.key, n);
        return t;
    }

    function __PRIVATE_convertOverlayedDocumentMapToDocumentMap(e) {
        let t = Pt;
        return e.forEach(((e, n) => t = t.insert(e, n.overlayedDocument))), t;
    }

    function __PRIVATE_newOverlayMap() {
        return __PRIVATE_newDocumentKeyMap();
    }

    function __PRIVATE_newMutationMap() {
        return __PRIVATE_newDocumentKeyMap();
    }

    function __PRIVATE_newDocumentKeyMap() {
        return new ObjectMap((e => e.toString()), ((e, t) => e.isEqual(t)));
    }

    const Tt = new SortedMap(DocumentKey.comparator);

    const It = new SortedSet(DocumentKey.comparator);

    function __PRIVATE_documentKeySet(...e) {
        let t = It;
        for (const n of e) t = t.add(n);
        return t;
    }

    const Et = new SortedSet(__PRIVATE_primitiveComparator);

    function __PRIVATE_targetIdSet() {
        return Et;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns an DoubleValue for `value` that is encoded based the serializer's
     * `useProto3Json` setting.
     */ function __PRIVATE_toDouble(e, t) {
        if (e.useProto3Json) {
            if (isNaN(t)) return {
                doubleValue: "NaN"
            };
            if (t === 1 / 0) return {
                doubleValue: "Infinity"
            };
            if (t === -1 / 0) return {
                doubleValue: "-Infinity"
            };
        }
        return {
            doubleValue: __PRIVATE_isNegativeZero(t) ? "-0" : t
        };
    }

    /**
     * Returns an IntegerValue for `value`.
     */ function __PRIVATE_toInteger(e) {
        return {
            integerValue: "" + e
        };
    }

    /**
     * Returns a value for a number that's appropriate to put into a proto.
     * The return value is an IntegerValue if it can safely represent the value,
     * otherwise a DoubleValue is returned.
     */ function toNumber(e, t) {
        return isSafeInteger(t) ? __PRIVATE_toInteger(t) : __PRIVATE_toDouble(e, t);
    }

    /**
     * @license
     * Copyright 2018 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Used to represent a field transform on a mutation. */ class TransformOperation {
        constructor() {
            // Make sure that the structural type of `TransformOperation` is unique.
            // See https://github.com/microsoft/TypeScript/issues/5451
            this._ = void 0;
        }
    }

    /**
     * Computes the local transform result against the provided `previousValue`,
     * optionally using the provided localWriteTime.
     */ function __PRIVATE_applyTransformOperationToLocalView(e, t, n) {
        return e instanceof __PRIVATE_ServerTimestampTransform ? function serverTimestamp$1(e, t) {
            const n = {
                fields: {
                    [tt]: {
                        stringValue: et
                    },
                    [rt]: {
                        timestampValue: {
                            seconds: e.seconds,
                            nanos: e.nanoseconds
                        }
                    }
                }
            };
            // We should avoid storing deeply nested server timestamp map values
            // because we never use the intermediate "previous values".
            // For example:
            // previous: 42L, add: t1, result: t1 -> 42L
            // previous: t1,  add: t2, result: t2 -> 42L (NOT t2 -> t1 -> 42L)
            // previous: t2,  add: t3, result: t3 -> 42L (NOT t3 -> t2 -> t1 -> 42L)
            // `getPreviousValue` recursively traverses server timestamps to find the
            // least recent Value.
                    return t && __PRIVATE_isServerTimestamp(t) && (t = __PRIVATE_getPreviousValue(t)), 
            t && (n.fields[nt] = t), {
                mapValue: n
            };
        }(n, t) : e instanceof __PRIVATE_ArrayUnionTransformOperation ? __PRIVATE_applyArrayUnionTransformOperation(e, t) : e instanceof __PRIVATE_ArrayRemoveTransformOperation ? __PRIVATE_applyArrayRemoveTransformOperation(e, t) : function __PRIVATE_applyNumericIncrementTransformOperationToLocalView(e, t) {
            // PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
            // precision and resolves overflows by reducing precision, we do not
            // manually cap overflows at 2^63.
            const n = __PRIVATE_computeTransformOperationBaseValue(e, t), r = asNumber(n) + asNumber(e.Re);
            return isInteger(n) && isInteger(e.Re) ? __PRIVATE_toInteger(r) : __PRIVATE_toDouble(e.serializer, r);
        }(e, t);
    }

    /**
     * Computes a final transform result after the transform has been acknowledged
     * by the server, potentially using the server-provided transformResult.
     */ function __PRIVATE_applyTransformOperationToRemoteDocument(e, t, n) {
        // The server just sends null as the transform result for array operations,
        // so we have to calculate a result the same as we do for local
        // applications.
        return e instanceof __PRIVATE_ArrayUnionTransformOperation ? __PRIVATE_applyArrayUnionTransformOperation(e, t) : e instanceof __PRIVATE_ArrayRemoveTransformOperation ? __PRIVATE_applyArrayRemoveTransformOperation(e, t) : n;
    }

    /**
     * If this transform operation is not idempotent, returns the base value to
     * persist for this transform. If a base value is returned, the transform
     * operation is always applied to this base value, even if document has
     * already been updated.
     *
     * Base values provide consistent behavior for non-idempotent transforms and
     * allow us to return the same latency-compensated value even if the backend
     * has already applied the transform operation. The base value is null for
     * idempotent transforms, as they can be re-played even if the backend has
     * already applied them.
     *
     * @returns a base value to store along with the mutation, or null for
     * idempotent transforms.
     */ function __PRIVATE_computeTransformOperationBaseValue(e, t) {
        return e instanceof __PRIVATE_NumericIncrementTransformOperation ? 
        /** Returns true if `value` is either an IntegerValue or a DoubleValue. */
        function __PRIVATE_isNumber(e) {
            return isInteger(e) || function __PRIVATE_isDouble(e) {
                return !!e && "doubleValue" in e;
            }(e);
        }(t) ? t : {
            integerValue: 0
        } : null;
    }

    /** Transforms a value into a server-generated timestamp. */
    class __PRIVATE_ServerTimestampTransform extends TransformOperation {}

    /** Transforms an array value via a union operation. */ class __PRIVATE_ArrayUnionTransformOperation extends TransformOperation {
        constructor(e) {
            super(), this.elements = e;
        }
    }

    function __PRIVATE_applyArrayUnionTransformOperation(e, t) {
        const n = __PRIVATE_coercedFieldValuesArray(t);
        for (const t of e.elements) n.some((e => __PRIVATE_valueEquals(e, t))) || n.push(t);
        return {
            arrayValue: {
                values: n
            }
        };
    }

    /** Transforms an array value via a remove operation. */ class __PRIVATE_ArrayRemoveTransformOperation extends TransformOperation {
        constructor(e) {
            super(), this.elements = e;
        }
    }

    function __PRIVATE_applyArrayRemoveTransformOperation(e, t) {
        let n = __PRIVATE_coercedFieldValuesArray(t);
        for (const t of e.elements) n = n.filter((e => !__PRIVATE_valueEquals(e, t)));
        return {
            arrayValue: {
                values: n
            }
        };
    }

    /**
     * Implements the backend semantics for locally computed NUMERIC_ADD (increment)
     * transforms. Converts all field values to integers or doubles, but unlike the
     * backend does not cap integer values at 2^63. Instead, JavaScript number
     * arithmetic is used and precision loss can occur for values greater than 2^53.
     */ class __PRIVATE_NumericIncrementTransformOperation extends TransformOperation {
        constructor(e, t) {
            super(), this.serializer = e, this.Re = t;
        }
    }

    function asNumber(e) {
        return __PRIVATE_normalizeNumber(e.integerValue || e.doubleValue);
    }

    function __PRIVATE_coercedFieldValuesArray(e) {
        return isArray(e) && e.arrayValue.values ? e.arrayValue.values.slice() : [];
    }

    function __PRIVATE_fieldTransformEquals(e, t) {
        return e.field.isEqual(t.field) && function __PRIVATE_transformOperationEquals(e, t) {
            return e instanceof __PRIVATE_ArrayUnionTransformOperation && t instanceof __PRIVATE_ArrayUnionTransformOperation || e instanceof __PRIVATE_ArrayRemoveTransformOperation && t instanceof __PRIVATE_ArrayRemoveTransformOperation ? __PRIVATE_arrayEquals(e.elements, t.elements, __PRIVATE_valueEquals) : e instanceof __PRIVATE_NumericIncrementTransformOperation && t instanceof __PRIVATE_NumericIncrementTransformOperation ? __PRIVATE_valueEquals(e.Re, t.Re) : e instanceof __PRIVATE_ServerTimestampTransform && t instanceof __PRIVATE_ServerTimestampTransform;
        }(e.transform, t.transform);
    }

    /** The result of successfully applying a mutation to the backend. */
    class MutationResult {
        constructor(
        /**
         * The version at which the mutation was committed:
         *
         * - For most operations, this is the updateTime in the WriteResult.
         * - For deletes, the commitTime of the WriteResponse (because deletes are
         *   not stored and have no updateTime).
         *
         * Note that these versions can be different: No-op writes will not change
         * the updateTime even though the commitTime advances.
         */
        e, 
        /**
         * The resulting fields returned from the backend after a mutation
         * containing field transforms has been committed. Contains one FieldValue
         * for each FieldTransform that was in the mutation.
         *
         * Will be empty if the mutation did not contain any field transforms.
         */
        t) {
            this.version = e, this.transformResults = t;
        }
    }

    /**
     * Encodes a precondition for a mutation. This follows the model that the
     * backend accepts with the special case of an explicit "empty" precondition
     * (meaning no precondition).
     */ class Precondition {
        constructor(e, t) {
            this.updateTime = e, this.exists = t;
        }
        /** Creates a new empty Precondition. */    static none() {
            return new Precondition;
        }
        /** Creates a new Precondition with an exists flag. */    static exists(e) {
            return new Precondition(void 0, e);
        }
        /** Creates a new Precondition based on a version a document exists at. */    static updateTime(e) {
            return new Precondition(e);
        }
        /** Returns whether this Precondition is empty. */    get isNone() {
            return void 0 === this.updateTime && void 0 === this.exists;
        }
        isEqual(e) {
            return this.exists === e.exists && (this.updateTime ? !!e.updateTime && this.updateTime.isEqual(e.updateTime) : !e.updateTime);
        }
    }

    /** Returns true if the preconditions is valid for the given document. */ function __PRIVATE_preconditionIsValidForDocument(e, t) {
        return void 0 !== e.updateTime ? t.isFoundDocument() && t.version.isEqual(e.updateTime) : void 0 === e.exists || e.exists === t.isFoundDocument();
    }

    /**
     * A mutation describes a self-contained change to a document. Mutations can
     * create, replace, delete, and update subsets of documents.
     *
     * Mutations not only act on the value of the document but also its version.
     *
     * For local mutations (mutations that haven't been committed yet), we preserve
     * the existing version for Set and Patch mutations. For Delete mutations, we
     * reset the version to 0.
     *
     * Here's the expected transition table.
     *
     * MUTATION           APPLIED TO            RESULTS IN
     *
     * SetMutation        Document(v3)          Document(v3)
     * SetMutation        NoDocument(v3)        Document(v0)
     * SetMutation        InvalidDocument(v0)   Document(v0)
     * PatchMutation      Document(v3)          Document(v3)
     * PatchMutation      NoDocument(v3)        NoDocument(v3)
     * PatchMutation      InvalidDocument(v0)   UnknownDocument(v3)
     * DeleteMutation     Document(v3)          NoDocument(v0)
     * DeleteMutation     NoDocument(v3)        NoDocument(v0)
     * DeleteMutation     InvalidDocument(v0)   NoDocument(v0)
     *
     * For acknowledged mutations, we use the updateTime of the WriteResponse as
     * the resulting version for Set and Patch mutations. As deletes have no
     * explicit update time, we use the commitTime of the WriteResponse for
     * Delete mutations.
     *
     * If a mutation is acknowledged by the backend but fails the precondition check
     * locally, we transition to an `UnknownDocument` and rely on Watch to send us
     * the updated version.
     *
     * Field transforms are used only with Patch and Set Mutations. We use the
     * `updateTransforms` message to store transforms, rather than the `transforms`s
     * messages.
     *
     * ## Subclassing Notes
     *
     * Every type of mutation needs to implement its own applyToRemoteDocument() and
     * applyToLocalView() to implement the actual behavior of applying the mutation
     * to some source document (see `setMutationApplyToRemoteDocument()` for an
     * example).
     */ class Mutation {}

    /**
     * A utility method to calculate a `Mutation` representing the overlay from the
     * final state of the document, and a `FieldMask` representing the fields that
     * are mutated by the local mutations.
     */ function __PRIVATE_calculateOverlayMutation(e, t) {
        if (!e.hasLocalMutations || t && 0 === t.fields.length) return null;
        // mask is null when sets or deletes are applied to the current document.
            if (null === t) return e.isNoDocument() ? new __PRIVATE_DeleteMutation(e.key, Precondition.none()) : new __PRIVATE_SetMutation(e.key, e.data, Precondition.none());
        {
            const n = e.data, r = ObjectValue.empty();
            let i = new SortedSet(FieldPath$1.comparator);
            for (let e of t.fields) if (!i.has(e)) {
                let t = n.field(e);
                // If we are deleting a nested field, we take the immediate parent as
                // the mask used to construct the resulting mutation.
                // Justification: Nested fields can create parent fields implicitly. If
                // only a leaf entry is deleted in later mutations, the parent field
                // should still remain, but we may have lost this information.
                // Consider mutation (foo.bar 1), then mutation (foo.bar delete()).
                // This leaves the final result (foo, {}). Despite the fact that `doc`
                // has the correct result, `foo` is not in `mask`, and the resulting
                // mutation would miss `foo`.
                            null === t && e.length > 1 && (e = e.popLast(), t = n.field(e)), null === t ? r.delete(e) : r.set(e, t), 
                i = i.add(e);
            }
            return new __PRIVATE_PatchMutation(e.key, r, new FieldMask(i.toArray()), Precondition.none());
        }
    }

    /**
     * Applies this mutation to the given document for the purposes of computing a
     * new remote document. If the input document doesn't match the expected state
     * (e.g. it is invalid or outdated), the document type may transition to
     * unknown.
     *
     * @param mutation - The mutation to apply.
     * @param document - The document to mutate. The input document can be an
     *     invalid document if the client has no knowledge of the pre-mutation state
     *     of the document.
     * @param mutationResult - The result of applying the mutation from the backend.
     */ function __PRIVATE_mutationApplyToRemoteDocument(e, t, n) {
        e instanceof __PRIVATE_SetMutation ? function __PRIVATE_setMutationApplyToRemoteDocument(e, t, n) {
            // Unlike setMutationApplyToLocalView, if we're applying a mutation to a
            // remote document the server has accepted the mutation so the precondition
            // must have held.
            const r = e.value.clone(), i = __PRIVATE_serverTransformResults(e.fieldTransforms, t, n.transformResults);
            r.setAll(i), t.convertToFoundDocument(n.version, r).setHasCommittedMutations();
        }(e, t, n) : e instanceof __PRIVATE_PatchMutation ? function __PRIVATE_patchMutationApplyToRemoteDocument(e, t, n) {
            if (!__PRIVATE_preconditionIsValidForDocument(e.precondition, t)) 
            // Since the mutation was not rejected, we know that the precondition
            // matched on the backend. We therefore must not have the expected version
            // of the document in our cache and convert to an UnknownDocument with a
            // known updateTime.
            return void t.convertToUnknownDocument(n.version);
            const r = __PRIVATE_serverTransformResults(e.fieldTransforms, t, n.transformResults), i = t.data;
            i.setAll(__PRIVATE_getPatch(e)), i.setAll(r), t.convertToFoundDocument(n.version, i).setHasCommittedMutations();
        }(e, t, n) : function __PRIVATE_deleteMutationApplyToRemoteDocument(e, t, n) {
            // Unlike applyToLocalView, if we're applying a mutation to a remote
            // document the server has accepted the mutation so the precondition must
            // have held.
            t.convertToNoDocument(n.version).setHasCommittedMutations();
        }(0, t, n);
    }

    /**
     * Applies this mutation to the given document for the purposes of computing
     * the new local view of a document. If the input document doesn't match the
     * expected state, the document is not modified.
     *
     * @param mutation - The mutation to apply.
     * @param document - The document to mutate. The input document can be an
     *     invalid document if the client has no knowledge of the pre-mutation state
     *     of the document.
     * @param previousMask - The fields that have been updated before applying this mutation.
     * @param localWriteTime - A timestamp indicating the local write time of the
     *     batch this mutation is a part of.
     * @returns A `FieldMask` representing the fields that are changed by applying this mutation.
     */ function __PRIVATE_mutationApplyToLocalView(e, t, n, r) {
        return e instanceof __PRIVATE_SetMutation ? function __PRIVATE_setMutationApplyToLocalView(e, t, n, r) {
            if (!__PRIVATE_preconditionIsValidForDocument(e.precondition, t)) 
            // The mutation failed to apply (e.g. a document ID created with add()
            // caused a name collision).
            return n;
            const i = e.value.clone(), s = __PRIVATE_localTransformResults(e.fieldTransforms, r, t);
            return i.setAll(s), t.convertToFoundDocument(t.version, i).setHasLocalMutations(), 
            null;
     // SetMutation overwrites all fields.
            }
        /**
     * A mutation that modifies fields of the document at the given key with the
     * given values. The values are applied through a field mask:
     *
     *  * When a field is in both the mask and the values, the corresponding field
     *    is updated.
     *  * When a field is in neither the mask nor the values, the corresponding
     *    field is unmodified.
     *  * When a field is in the mask but not in the values, the corresponding field
     *    is deleted.
     *  * When a field is not in the mask but is in the values, the values map is
     *    ignored.
     */ (e, t, n, r) : e instanceof __PRIVATE_PatchMutation ? function __PRIVATE_patchMutationApplyToLocalView(e, t, n, r) {
            if (!__PRIVATE_preconditionIsValidForDocument(e.precondition, t)) return n;
            const i = __PRIVATE_localTransformResults(e.fieldTransforms, r, t), s = t.data;
            if (s.setAll(__PRIVATE_getPatch(e)), s.setAll(i), t.convertToFoundDocument(t.version, s).setHasLocalMutations(), 
            null === n) return null;
            return n.unionWith(e.fieldMask.fields).unionWith(e.fieldTransforms.map((e => e.field)));
        }
        /**
     * Returns a FieldPath/Value map with the content of the PatchMutation.
     */ (e, t, n, r) : function __PRIVATE_deleteMutationApplyToLocalView(e, t, n) {
            if (__PRIVATE_preconditionIsValidForDocument(e.precondition, t)) return t.convertToNoDocument(t.version).setHasLocalMutations(), 
            null;
            return n;
        }
        /**
     * A mutation that verifies the existence of the document at the given key with
     * the provided precondition.
     *
     * The `verify` operation is only used in Transactions, and this class serves
     * primarily to facilitate serialization into protos.
     */ (e, t, n);
    }

    /**
     * If this mutation is not idempotent, returns the base value to persist with
     * this mutation. If a base value is returned, the mutation is always applied
     * to this base value, even if document has already been updated.
     *
     * The base value is a sparse object that consists of only the document
     * fields for which this mutation contains a non-idempotent transformation
     * (e.g. a numeric increment). The provided value guarantees consistent
     * behavior for non-idempotent transforms and allow us to return the same
     * latency-compensated value even if the backend has already applied the
     * mutation. The base value is null for idempotent mutations, as they can be
     * re-played even if the backend has already applied them.
     *
     * @returns a base value to store along with the mutation, or null for
     * idempotent mutations.
     */ function __PRIVATE_mutationExtractBaseValue(e, t) {
        let n = null;
        for (const r of e.fieldTransforms) {
            const e = t.data.field(r.field), i = __PRIVATE_computeTransformOperationBaseValue(r.transform, e || null);
            null != i && (null === n && (n = ObjectValue.empty()), n.set(r.field, i));
        }
        return n || null;
    }

    function __PRIVATE_mutationEquals(e, t) {
        return e.type === t.type && (!!e.key.isEqual(t.key) && (!!e.precondition.isEqual(t.precondition) && (!!function __PRIVATE_fieldTransformsAreEqual(e, t) {
            return void 0 === e && void 0 === t || !(!e || !t) && __PRIVATE_arrayEquals(e, t, ((e, t) => __PRIVATE_fieldTransformEquals(e, t)));
        }(e.fieldTransforms, t.fieldTransforms) && (0 /* MutationType.Set */ === e.type ? e.value.isEqual(t.value) : 1 /* MutationType.Patch */ !== e.type || e.data.isEqual(t.data) && e.fieldMask.isEqual(t.fieldMask)))));
    }

    /**
     * A mutation that creates or replaces the document at the given key with the
     * object value contents.
     */ class __PRIVATE_SetMutation extends Mutation {
        constructor(e, t, n, r = []) {
            super(), this.key = e, this.value = t, this.precondition = n, this.fieldTransforms = r, 
            this.type = 0 /* MutationType.Set */;
        }
        getFieldMask() {
            return null;
        }
    }

    class __PRIVATE_PatchMutation extends Mutation {
        constructor(e, t, n, r, i = []) {
            super(), this.key = e, this.data = t, this.fieldMask = n, this.precondition = r, 
            this.fieldTransforms = i, this.type = 1 /* MutationType.Patch */;
        }
        getFieldMask() {
            return this.fieldMask;
        }
    }

    function __PRIVATE_getPatch(e) {
        const t = new Map;
        return e.fieldMask.fields.forEach((n => {
            if (!n.isEmpty()) {
                const r = e.data.field(n);
                t.set(n, r);
            }
        })), t;
    }

    /**
     * Creates a list of "transform results" (a transform result is a field value
     * representing the result of applying a transform) for use after a mutation
     * containing transforms has been acknowledged by the server.
     *
     * @param fieldTransforms - The field transforms to apply the result to.
     * @param mutableDocument - The current state of the document after applying all
     * previous mutations.
     * @param serverTransformResults - The transform results received by the server.
     * @returns The transform results list.
     */ function __PRIVATE_serverTransformResults(e, t, n) {
        const r = new Map;
        __PRIVATE_hardAssert(e.length === n.length, 32656, {
            Ve: n.length,
            me: e.length
        });
        for (let i = 0; i < n.length; i++) {
            const s = e[i], o = s.transform, _ = t.data.field(s.field);
            r.set(s.field, __PRIVATE_applyTransformOperationToRemoteDocument(o, _, n[i]));
        }
        return r;
    }

    /**
     * Creates a list of "transform results" (a transform result is a field value
     * representing the result of applying a transform) for use when applying a
     * transform locally.
     *
     * @param fieldTransforms - The field transforms to apply the result to.
     * @param localWriteTime - The local time of the mutation (used to
     *     generate ServerTimestampValues).
     * @param mutableDocument - The document to apply transforms on.
     * @returns The transform results list.
     */ function __PRIVATE_localTransformResults(e, t, n) {
        const r = new Map;
        for (const i of e) {
            const e = i.transform, s = n.data.field(i.field);
            r.set(i.field, __PRIVATE_applyTransformOperationToLocalView(e, s, t));
        }
        return r;
    }

    /** A mutation that deletes the document at the given key. */ class __PRIVATE_DeleteMutation extends Mutation {
        constructor(e, t) {
            super(), this.key = e, this.precondition = t, this.type = 2 /* MutationType.Delete */ , 
            this.fieldTransforms = [];
        }
        getFieldMask() {
            return null;
        }
    }

    class __PRIVATE_VerifyMutation extends Mutation {
        constructor(e, t) {
            super(), this.key = e, this.precondition = t, this.type = 3 /* MutationType.Verify */ , 
            this.fieldTransforms = [];
        }
        getFieldMask() {
            return null;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A batch of mutations that will be sent as one unit to the backend.
     */ class MutationBatch {
        /**
         * @param batchId - The unique ID of this mutation batch.
         * @param localWriteTime - The original write time of this mutation.
         * @param baseMutations - Mutations that are used to populate the base
         * values when this mutation is applied locally. This can be used to locally
         * overwrite values that are persisted in the remote document cache. Base
         * mutations are never sent to the backend.
         * @param mutations - The user-provided mutations in this mutation batch.
         * User-provided mutations are applied both locally and remotely on the
         * backend.
         */
        constructor(e, t, n, r) {
            this.batchId = e, this.localWriteTime = t, this.baseMutations = n, this.mutations = r;
        }
        /**
         * Applies all the mutations in this MutationBatch to the specified document
         * to compute the state of the remote document
         *
         * @param document - The document to apply mutations to.
         * @param batchResult - The result of applying the MutationBatch to the
         * backend.
         */    applyToRemoteDocument(e, t) {
            const n = t.mutationResults;
            for (let t = 0; t < this.mutations.length; t++) {
                const r = this.mutations[t];
                if (r.key.isEqual(e.key)) {
                    __PRIVATE_mutationApplyToRemoteDocument(r, e, n[t]);
                }
            }
        }
        /**
         * Computes the local view of a document given all the mutations in this
         * batch.
         *
         * @param document - The document to apply mutations to.
         * @param mutatedFields - Fields that have been updated before applying this mutation batch.
         * @returns A `FieldMask` representing all the fields that are mutated.
         */    applyToLocalView(e, t) {
            // First, apply the base state. This allows us to apply non-idempotent
            // transform against a consistent set of values.
            for (const n of this.baseMutations) n.key.isEqual(e.key) && (t = __PRIVATE_mutationApplyToLocalView(n, e, t, this.localWriteTime));
            // Second, apply all user-provided mutations.
                    for (const n of this.mutations) n.key.isEqual(e.key) && (t = __PRIVATE_mutationApplyToLocalView(n, e, t, this.localWriteTime));
            return t;
        }
        /**
         * Computes the local view for all provided documents given the mutations in
         * this batch. Returns a `DocumentKey` to `Mutation` map which can be used to
         * replace all the mutation applications.
         */    applyToLocalDocumentSet(e, t) {
            // TODO(mrschmidt): This implementation is O(n^2). If we apply the mutations
            // directly (as done in `applyToLocalView()`), we can reduce the complexity
            // to O(n).
            const n = __PRIVATE_newMutationMap();
            return this.mutations.forEach((r => {
                const i = e.get(r.key), s = i.overlayedDocument;
                // TODO(mutabledocuments): This method should take a MutableDocumentMap
                // and we should remove this cast.
                            let o = this.applyToLocalView(s, i.mutatedFields);
                // Set mutatedFields to null if the document is only from local mutations.
                // This creates a Set or Delete mutation, instead of trying to create a
                // patch mutation as the overlay.
                            o = t.has(r.key) ? null : o;
                const _ = __PRIVATE_calculateOverlayMutation(s, o);
                null !== _ && n.set(r.key, _), s.isValidDocument() || s.convertToNoDocument(SnapshotVersion.min());
            })), n;
        }
        keys() {
            return this.mutations.reduce(((e, t) => e.add(t.key)), __PRIVATE_documentKeySet());
        }
        isEqual(e) {
            return this.batchId === e.batchId && __PRIVATE_arrayEquals(this.mutations, e.mutations, ((e, t) => __PRIVATE_mutationEquals(e, t))) && __PRIVATE_arrayEquals(this.baseMutations, e.baseMutations, ((e, t) => __PRIVATE_mutationEquals(e, t)));
        }
    }

    /** The result of applying a mutation batch to the backend. */ class MutationBatchResult {
        constructor(e, t, n, 
        /**
         * A pre-computed mapping from each mutated document to the resulting
         * version.
         */
        r) {
            this.batch = e, this.commitVersion = t, this.mutationResults = n, this.docVersions = r;
        }
        /**
         * Creates a new MutationBatchResult for the given batch and results. There
         * must be one result for each mutation in the batch. This static factory
         * caches a document=&gt;version mapping (docVersions).
         */    static from(e, t, n) {
            __PRIVATE_hardAssert(e.mutations.length === n.length, 58842, {
                fe: e.mutations.length,
                ge: n.length
            });
            let r = function __PRIVATE_documentVersionMap() {
                return Tt;
            }();
            const i = e.mutations;
            for (let e = 0; e < i.length; e++) r = r.insert(i[e].key, n[e].version);
            return new MutationBatchResult(e, t, n, r);
        }
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Representation of an overlay computed by Firestore.
     *
     * Holds information about a mutation and the largest batch id in Firestore when
     * the mutation was created.
     */ class Overlay {
        constructor(e, t) {
            this.largestBatchId = e, this.mutation = t;
        }
        getKey() {
            return this.mutation.key;
        }
        isEqual(e) {
            return null !== e && this.mutation === e.mutation;
        }
        toString() {
            return `Overlay{\n      largestBatchId: ${this.largestBatchId},\n      mutation: ${this.mutation.toString()}\n    }`;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Error Codes describing the different ways GRPC can fail. These are copied
     * directly from GRPC's sources here:
     *
     * https://github.com/grpc/grpc/blob/bceec94ea4fc5f0085d81235d8e1c06798dc341a/include/grpc%2B%2B/impl/codegen/status_code_enum.h
     *
     * Important! The names of these identifiers matter because the string forms
     * are used for reverse lookups from the webchannel stream. Do NOT change the
     * names of these identifiers or change this into a const enum.
     */ var dt, At;

    /**
     * Determines whether an error code represents a permanent error when received
     * in response to a non-write operation.
     *
     * See isPermanentWriteError for classifying write errors.
     */
    function __PRIVATE_isPermanentError(e) {
        switch (e) {
          case F.OK:
            return fail(64938);

          case F.CANCELLED:
          case F.UNKNOWN:
          case F.DEADLINE_EXCEEDED:
          case F.RESOURCE_EXHAUSTED:
          case F.INTERNAL:
          case F.UNAVAILABLE:
     // Unauthenticated means something went wrong with our token and we need
            // to retry with new credentials which will happen automatically.
                  case F.UNAUTHENTICATED:
            return false;

          case F.INVALID_ARGUMENT:
          case F.NOT_FOUND:
          case F.ALREADY_EXISTS:
          case F.PERMISSION_DENIED:
          case F.FAILED_PRECONDITION:
     // Aborted might be retried in some scenarios, but that is dependent on
            // the context and should handled individually by the calling code.
            // See https://cloud.google.com/apis/design/errors.
                  case F.ABORTED:
          case F.OUT_OF_RANGE:
          case F.UNIMPLEMENTED:
          case F.DATA_LOSS:
            return true;

          default:
            return fail(15467, {
                code: e
            });
        }
    }

    /**
     * Determines whether an error code represents a permanent error when received
     * in response to a write operation.
     *
     * Write operations must be handled specially because as of b/119437764, ABORTED
     * errors on the write stream should be retried too (even though ABORTED errors
     * are not generally retryable).
     *
     * Note that during the initial handshake on the write stream an ABORTED error
     * signals that we should discard our stream token (i.e. it is permanent). This
     * means a handshake error should be classified with isPermanentError, above.
     */
    /**
     * Maps an error Code from GRPC status code number, like 0, 1, or 14. These
     * are not the same as HTTP status codes.
     *
     * @returns The Code equivalent to the given GRPC status code. Fails if there
     *     is no match.
     */
    function __PRIVATE_mapCodeFromRpcCode(e) {
        if (void 0 === e) 
        // This shouldn't normally happen, but in certain error cases (like trying
        // to send invalid proto messages) we may get an error with no GRPC code.
        return __PRIVATE_logError("GRPC error has no .code"), F.UNKNOWN;
        switch (e) {
          case dt.OK:
            return F.OK;

          case dt.CANCELLED:
            return F.CANCELLED;

          case dt.UNKNOWN:
            return F.UNKNOWN;

          case dt.DEADLINE_EXCEEDED:
            return F.DEADLINE_EXCEEDED;

          case dt.RESOURCE_EXHAUSTED:
            return F.RESOURCE_EXHAUSTED;

          case dt.INTERNAL:
            return F.INTERNAL;

          case dt.UNAVAILABLE:
            return F.UNAVAILABLE;

          case dt.UNAUTHENTICATED:
            return F.UNAUTHENTICATED;

          case dt.INVALID_ARGUMENT:
            return F.INVALID_ARGUMENT;

          case dt.NOT_FOUND:
            return F.NOT_FOUND;

          case dt.ALREADY_EXISTS:
            return F.ALREADY_EXISTS;

          case dt.PERMISSION_DENIED:
            return F.PERMISSION_DENIED;

          case dt.FAILED_PRECONDITION:
            return F.FAILED_PRECONDITION;

          case dt.ABORTED:
            return F.ABORTED;

          case dt.OUT_OF_RANGE:
            return F.OUT_OF_RANGE;

          case dt.UNIMPLEMENTED:
            return F.UNIMPLEMENTED;

          case dt.DATA_LOSS:
            return F.DATA_LOSS;

          default:
            return fail(39323, {
                code: e
            });
        }
    }

    /**
     * Converts an HTTP response's error status to the equivalent error code.
     *
     * @param status - An HTTP error response status ("FAILED_PRECONDITION",
     * "UNKNOWN", etc.)
     * @returns The equivalent Code. Non-matching responses are mapped to
     *     Code.UNKNOWN.
     */ (At = dt || (dt = {}))[At.OK = 0] = "OK", At[At.CANCELLED = 1] = "CANCELLED", 
    At[At.UNKNOWN = 2] = "UNKNOWN", At[At.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", 
    At[At.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", At[At.NOT_FOUND = 5] = "NOT_FOUND", 
    At[At.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", At[At.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", 
    At[At.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", At[At.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", 
    At[At.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", At[At.ABORTED = 10] = "ABORTED", 
    At[At.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", At[At.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", 
    At[At.INTERNAL = 13] = "INTERNAL", At[At.UNAVAILABLE = 14] = "UNAVAILABLE", At[At.DATA_LOSS = 15] = "DATA_LOSS";

    /**
     * Sets the value of the `testingHooksSpi` object.
     * @param instance the instance to set.
     */
    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    new Integer([ 4294967295, 4294967295 ], 0);

    /**
     * This class generates JsonObject values for the Datastore API suitable for
     * sending to either GRPC stub methods or via the JSON/HTTP REST API.
     *
     * The serializer supports both Protobuf.js and Proto3 JSON formats. By
     * setting `useProto3Json` to true, the serializer will use the Proto3 JSON
     * format.
     *
     * For a description of the Proto3 JSON format check
     * https://developers.google.com/protocol-buffers/docs/proto3#json
     *
     * TODO(klimt): We can remove the databaseId argument if we keep the full
     * resource name in documents.
     */
    class JsonProtoSerializer {
        constructor(e, t) {
            this.databaseId = e, this.useProto3Json = t;
        }
    }

    /**
     * Returns a number (or null) from a google.protobuf.Int32Value proto.
     */
    /**
     * Returns a value for a Date that's appropriate to put into a proto.
     */
    function toTimestamp(e, t) {
        if (e.useProto3Json) {
            return `${new Date(1e3 * t.seconds).toISOString().replace(/\.\d*/, "").replace("Z", "")}.${("000000000" + t.nanoseconds).slice(-9)}Z`;
        }
        return {
            seconds: "" + t.seconds,
            nanos: t.nanoseconds
        };
    }

    /**
     * Returns a value for bytes that's appropriate to put in a proto.
     *
     * Visible for testing.
     */
    function __PRIVATE_toBytes(e, t) {
        return e.useProto3Json ? t.toBase64() : t.toUint8Array();
    }

    /**
     * Returns a ByteString based on the proto string value.
     */ function __PRIVATE_toVersion(e, t) {
        return toTimestamp(e, t.toTimestamp());
    }

    function __PRIVATE_fromVersion(e) {
        return __PRIVATE_hardAssert(!!e, 49232), SnapshotVersion.fromTimestamp(function fromTimestamp(e) {
            const t = __PRIVATE_normalizeTimestamp(e);
            return new Timestamp(t.seconds, t.nanos);
        }(e));
    }

    function __PRIVATE_toResourceName(e, t) {
        return __PRIVATE_toResourcePath(e, t).canonicalString();
    }

    function __PRIVATE_toResourcePath(e, t) {
        const n = function __PRIVATE_fullyQualifiedPrefixPath(e) {
            return new ResourcePath([ "projects", e.projectId, "databases", e.database ]);
        }(e).child("documents");
        return void 0 === t ? n : n.child(t);
    }

    function __PRIVATE_fromResourceName(e) {
        const t = ResourcePath.fromString(e);
        return __PRIVATE_hardAssert(__PRIVATE_isValidResourceName(t), 10190, {
            key: t.toString()
        }), t;
    }

    function __PRIVATE_toName(e, t) {
        return __PRIVATE_toResourceName(e.databaseId, t.path);
    }

    function __PRIVATE_fromQueryPath(e) {
        const t = __PRIVATE_fromResourceName(e);
        // In v1beta1 queries for collections at the root did not have a trailing
        // "/documents". In v1 all resource paths contain "/documents". Preserve the
        // ability to read the v1beta1 form for compatibility with queries persisted
        // in the local target cache.
            return 4 === t.length ? ResourcePath.emptyPath() : __PRIVATE_extractLocalPathFromResourceName(t);
    }

    function __PRIVATE_getEncodedDatabaseId(e) {
        return new ResourcePath([ "projects", e.databaseId.projectId, "databases", e.databaseId.database ]).canonicalString();
    }

    function __PRIVATE_extractLocalPathFromResourceName(e) {
        return __PRIVATE_hardAssert(e.length > 4 && "documents" === e.get(4), 29091, {
            key: e.toString()
        }), e.popFirst(5);
    }

    /** Creates a Document proto from key and fields (but no create/update time) */ function __PRIVATE_toMutationDocument(e, t, n) {
        return {
            name: __PRIVATE_toName(e, t),
            fields: n.value.mapValue.fields
        };
    }

    function toMutation(e, t) {
        let n;
        if (t instanceof __PRIVATE_SetMutation) n = {
            update: __PRIVATE_toMutationDocument(e, t.key, t.value)
        }; else if (t instanceof __PRIVATE_DeleteMutation) n = {
            delete: __PRIVATE_toName(e, t.key)
        }; else if (t instanceof __PRIVATE_PatchMutation) n = {
            update: __PRIVATE_toMutationDocument(e, t.key, t.data),
            updateMask: __PRIVATE_toDocumentMask(t.fieldMask)
        }; else {
            if (!(t instanceof __PRIVATE_VerifyMutation)) return fail(16599, {
                ft: t.type
            });
            n = {
                verify: __PRIVATE_toName(e, t.key)
            };
        }
        return t.fieldTransforms.length > 0 && (n.updateTransforms = t.fieldTransforms.map((e => function __PRIVATE_toFieldTransform(e, t) {
            const n = t.transform;
            if (n instanceof __PRIVATE_ServerTimestampTransform) return {
                fieldPath: t.field.canonicalString(),
                setToServerValue: "REQUEST_TIME"
            };
            if (n instanceof __PRIVATE_ArrayUnionTransformOperation) return {
                fieldPath: t.field.canonicalString(),
                appendMissingElements: {
                    values: n.elements
                }
            };
            if (n instanceof __PRIVATE_ArrayRemoveTransformOperation) return {
                fieldPath: t.field.canonicalString(),
                removeAllFromArray: {
                    values: n.elements
                }
            };
            if (n instanceof __PRIVATE_NumericIncrementTransformOperation) return {
                fieldPath: t.field.canonicalString(),
                increment: n.Re
            };
            throw fail(20930, {
                transform: t.transform
            });
        }(0, e)))), t.precondition.isNone || (n.currentDocument = function __PRIVATE_toPrecondition(e, t) {
            return void 0 !== t.updateTime ? {
                updateTime: __PRIVATE_toVersion(e, t.updateTime)
            } : void 0 !== t.exists ? {
                exists: t.exists
            } : fail(27497);
        }(e, t.precondition)), n;
    }

    function __PRIVATE_fromWriteResults(e, t) {
        return e && e.length > 0 ? (__PRIVATE_hardAssert(void 0 !== t, 14353), e.map((e => function __PRIVATE_fromWriteResult(e, t) {
            // NOTE: Deletes don't have an updateTime.
            let n = e.updateTime ? __PRIVATE_fromVersion(e.updateTime) : __PRIVATE_fromVersion(t);
            return n.isEqual(SnapshotVersion.min()) && (
            // The Firestore Emulator currently returns an update time of 0 for
            // deletes of non-existing documents (rather than null). This breaks the
            // test "get deleted doc while offline with source=cache" as NoDocuments
            // with version 0 are filtered by IndexedDb's RemoteDocumentCache.
            // TODO(#2149): Remove this when Emulator is fixed
            n = __PRIVATE_fromVersion(t)), new MutationResult(n, e.transformResults || []);
        }(e, t)))) : [];
    }

    function __PRIVATE_convertQueryTargetToQuery(e) {
        let t = __PRIVATE_fromQueryPath(e.parent);
        const n = e.structuredQuery, r = n.from ? n.from.length : 0;
        let i = null;
        if (r > 0) {
            __PRIVATE_hardAssert(1 === r, 65062);
            const e = n.from[0];
            e.allDescendants ? i = e.collectionId : t = t.child(e.collectionId);
        }
        let s = [];
        n.where && (s = function __PRIVATE_fromFilters(e) {
            const t = __PRIVATE_fromFilter(e);
            if (t instanceof CompositeFilter && __PRIVATE_compositeFilterIsFlatConjunction(t)) return t.getFilters();
            return [ t ];
        }(n.where));
        let o = [];
        n.orderBy && (o = function __PRIVATE_fromOrder(e) {
            return e.map((e => function __PRIVATE_fromPropertyOrder(e) {
                return new OrderBy(__PRIVATE_fromFieldPathReference(e.field), 
                // visible for testing
                function __PRIVATE_fromDirection(e) {
                    switch (e) {
                      case "ASCENDING":
                        return "asc" /* Direction.ASCENDING */;

                      case "DESCENDING":
                        return "desc" /* Direction.DESCENDING */;

                      default:
                        return;
                    }
                }
                // visible for testing
                (e.direction));
            }
            // visible for testing
            (e)));
        }(n.orderBy));
        let _ = null;
        n.limit && (_ = function __PRIVATE_fromInt32Proto(e) {
            let t;
            return t = "object" == typeof e ? e.value : e, __PRIVATE_isNullOrUndefined(t) ? null : t;
        }(n.limit));
        let a = null;
        n.startAt && (a = function __PRIVATE_fromStartAtCursor(e) {
            const t = !!e.before, n = e.values || [];
            return new Bound(n, t);
        }(n.startAt));
        let u = null;
        return n.endAt && (u = function __PRIVATE_fromEndAtCursor(e) {
            const t = !e.before, n = e.values || [];
            return new Bound(n, t);
        }
        // visible for testing
        (n.endAt)), __PRIVATE_newQuery(t, i, o, s, _, "F" /* LimitType.First */ , a, u);
    }

    function __PRIVATE_fromFilter(e) {
        return void 0 !== e.unaryFilter ? function __PRIVATE_fromUnaryFilter(e) {
            switch (e.unaryFilter.op) {
              case "IS_NAN":
                const t = __PRIVATE_fromFieldPathReference(e.unaryFilter.field);
                return FieldFilter.create(t, "==" /* Operator.EQUAL */ , {
                    doubleValue: NaN
                });

              case "IS_NULL":
                const n = __PRIVATE_fromFieldPathReference(e.unaryFilter.field);
                return FieldFilter.create(n, "==" /* Operator.EQUAL */ , {
                    nullValue: "NULL_VALUE"
                });

              case "IS_NOT_NAN":
                const r = __PRIVATE_fromFieldPathReference(e.unaryFilter.field);
                return FieldFilter.create(r, "!=" /* Operator.NOT_EQUAL */ , {
                    doubleValue: NaN
                });

              case "IS_NOT_NULL":
                const i = __PRIVATE_fromFieldPathReference(e.unaryFilter.field);
                return FieldFilter.create(i, "!=" /* Operator.NOT_EQUAL */ , {
                    nullValue: "NULL_VALUE"
                });

              case "OPERATOR_UNSPECIFIED":
                return fail(61313);

              default:
                return fail(60726);
            }
        }(e) : void 0 !== e.fieldFilter ? function __PRIVATE_fromFieldFilter(e) {
            return FieldFilter.create(__PRIVATE_fromFieldPathReference(e.fieldFilter.field), function __PRIVATE_fromOperatorName(e) {
                switch (e) {
                  case "EQUAL":
                    return "==" /* Operator.EQUAL */;

                  case "NOT_EQUAL":
                    return "!=" /* Operator.NOT_EQUAL */;

                  case "GREATER_THAN":
                    return ">" /* Operator.GREATER_THAN */;

                  case "GREATER_THAN_OR_EQUAL":
                    return ">=" /* Operator.GREATER_THAN_OR_EQUAL */;

                  case "LESS_THAN":
                    return "<" /* Operator.LESS_THAN */;

                  case "LESS_THAN_OR_EQUAL":
                    return "<=" /* Operator.LESS_THAN_OR_EQUAL */;

                  case "ARRAY_CONTAINS":
                    return "array-contains" /* Operator.ARRAY_CONTAINS */;

                  case "IN":
                    return "in" /* Operator.IN */;

                  case "NOT_IN":
                    return "not-in" /* Operator.NOT_IN */;

                  case "ARRAY_CONTAINS_ANY":
                    return "array-contains-any" /* Operator.ARRAY_CONTAINS_ANY */;

                  case "OPERATOR_UNSPECIFIED":
                    return fail(58110);

                  default:
                    return fail(50506);
                }
            }(e.fieldFilter.op), e.fieldFilter.value);
        }(e) : void 0 !== e.compositeFilter ? function __PRIVATE_fromCompositeFilter(e) {
            return CompositeFilter.create(e.compositeFilter.filters.map((e => __PRIVATE_fromFilter(e))), function __PRIVATE_fromCompositeOperatorName(e) {
                switch (e) {
                  case "AND":
                    return "and" /* CompositeOperator.AND */;

                  case "OR":
                    return "or" /* CompositeOperator.OR */;

                  default:
                    return fail(1026);
                }
            }(e.compositeFilter.op));
        }(e) : fail(30097, {
            filter: e
        });
    }

    function __PRIVATE_fromFieldPathReference(e) {
        return FieldPath$1.fromServerFormat(e.fieldPath);
    }

    function __PRIVATE_toDocumentMask(e) {
        const t = [];
        return e.fields.forEach((e => t.push(e.canonicalString()))), {
            fieldPaths: t
        };
    }

    function __PRIVATE_isValidResourceName(e) {
        // Resource names have at least 4 components (project ID, database ID)
        return e.length >= 4 && "projects" === e.get(0) && "databases" === e.get(2);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Serializer for values stored in the LocalStore. */ class __PRIVATE_LocalSerializer {
        constructor(e) {
            this.wt = e;
        }
    }

    /**
     * Encodes a `BundledQuery` from bundle proto to a Query object.
     *
     * This reconstructs the original query used to build the bundle being loaded,
     * including features exists only in SDKs (for example: limit-to-last).
     */
    function __PRIVATE_fromBundledQuery(e) {
        const t = __PRIVATE_convertQueryTargetToQuery({
            parent: e.parent,
            structuredQuery: e.structuredQuery
        });
        return "LAST" === e.limitType ? __PRIVATE_queryWithLimit(t, t.limit, "L" /* LimitType.Last */) : t;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An in-memory implementation of IndexManager.
     */ class __PRIVATE_MemoryIndexManager {
        constructor() {
            this.yn = new __PRIVATE_MemoryCollectionParentIndex;
        }
        addToCollectionParentIndex(e, t) {
            return this.yn.add(t), PersistencePromise.resolve();
        }
        getCollectionParents(e, t) {
            return PersistencePromise.resolve(this.yn.getEntries(t));
        }
        addFieldIndex(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve();
        }
        deleteFieldIndex(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve();
        }
        deleteAllFieldIndexes(e) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve();
        }
        createTargetIndexes(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve();
        }
        getDocumentsMatchingTarget(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve(null);
        }
        getIndexType(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve(0 /* IndexType.NONE */);
        }
        getFieldIndexes(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve([]);
        }
        getNextCollectionGroupToUpdate(e) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve(null);
        }
        getMinOffset(e, t) {
            return PersistencePromise.resolve(IndexOffset.min());
        }
        getMinOffsetFromCollectionGroup(e, t) {
            return PersistencePromise.resolve(IndexOffset.min());
        }
        updateCollectionGroup(e, t, n) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve();
        }
        updateIndexEntries(e, t) {
            // Field indices are not supported with memory persistence.
            return PersistencePromise.resolve();
        }
    }

    /**
     * Internal implementation of the collection-parent index exposed by MemoryIndexManager.
     * Also used for in-memory caching by IndexedDbIndexManager and initial index population
     * in indexeddb_schema.ts
     */ class __PRIVATE_MemoryCollectionParentIndex {
        constructor() {
            this.index = {};
        }
        // Returns false if the entry already existed.
        add(e) {
            const t = e.lastSegment(), n = e.popLast(), r = this.index[t] || new SortedSet(ResourcePath.comparator), i = !r.has(n);
            return this.index[t] = r.add(n), i;
        }
        has(e) {
            const t = e.lastSegment(), n = e.popLast(), r = this.index[t];
            return r && r.has(n);
        }
        getEntries(e) {
            return (this.index[e] || new SortedSet(ResourcePath.comparator)).toArray();
        }
    }

    /**
     * @license
     * Copyright 2018 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const bt = {
        didRun: false,
        sequenceNumbersCollected: 0,
        targetsRemoved: 0,
        documentsRemoved: 0
    }, St = 41943040;

    class LruParams {
        static withCacheSize(e) {
            return new LruParams(e, LruParams.DEFAULT_COLLECTION_PERCENTILE, LruParams.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT);
        }
        constructor(
        // When we attempt to collect, we will only do so if the cache size is greater than this
        // threshold. Passing `COLLECTION_DISABLED` here will cause collection to always be skipped.
        e, 
        // The percentage of sequence numbers that we will attempt to collect
        t, 
        // A cap on the total number of sequence numbers that will be collected. This prevents
        // us from collecting a huge number of sequence numbers if the cache has grown very large.
        n) {
            this.cacheSizeCollectionThreshold = e, this.percentileToCollect = t, this.maximumSequenceNumbersToCollect = n;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** A mutation queue for a specific user, backed by IndexedDB. */ LruParams.DEFAULT_COLLECTION_PERCENTILE = 10, 
    LruParams.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT = 1e3, LruParams.DEFAULT = new LruParams(St, LruParams.DEFAULT_COLLECTION_PERCENTILE, LruParams.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT), 
    LruParams.DISABLED = new LruParams(-1, 0, 0);

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Offset to ensure non-overlapping target ids. */
    /**
     * Generates monotonically increasing target IDs for sending targets to the
     * watch stream.
     *
     * The client constructs two generators, one for the target cache, and one for
     * for the sync engine (to generate limbo documents targets). These
     * generators produce non-overlapping IDs (by using even and odd IDs
     * respectively).
     *
     * By separating the target ID space, the query cache can generate target IDs
     * that persist across client restarts, while sync engine can independently
     * generate in-memory target IDs that are transient and can be reused after a
     * restart.
     */
    class __PRIVATE_TargetIdGenerator {
        constructor(e) {
            this.nr = e;
        }
        next() {
            return this.nr += 2, this.nr;
        }
        static rr() {
            // The target cache generator must return '2' in its first call to `next()`
            // as there is no differentiation in the protocol layer between an unset
            // number and the number '0'. If we were to sent a target with target ID
            // '0', the backend would consider it unset and replace it with its own ID.
            return new __PRIVATE_TargetIdGenerator(0);
        }
        static ir() {
            // Sync engine assigns target IDs for limbo document detection.
            return new __PRIVATE_TargetIdGenerator(-1);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const Dt = "LruGarbageCollector", vt = 1048576;

    function __PRIVATE_bufferEntryComparator([e, t], [n, r]) {
        const i = __PRIVATE_primitiveComparator(e, n);
        return 0 === i ? __PRIVATE_primitiveComparator(t, r) : i;
    }

    /**
     * Used to calculate the nth sequence number. Keeps a rolling buffer of the
     * lowest n values passed to `addElement`, and finally reports the largest of
     * them in `maxValue`.
     */ class __PRIVATE_RollingSequenceNumberBuffer {
        constructor(e) {
            this.cr = e, this.buffer = new SortedSet(__PRIVATE_bufferEntryComparator), this.lr = 0;
        }
        hr() {
            return ++this.lr;
        }
        Pr(e) {
            const t = [ e, this.hr() ];
            if (this.buffer.size < this.cr) this.buffer = this.buffer.add(t); else {
                const e = this.buffer.last();
                __PRIVATE_bufferEntryComparator(t, e) < 0 && (this.buffer = this.buffer.delete(e).add(t));
            }
        }
        get maxValue() {
            // Guaranteed to be non-empty. If we decide we are not collecting any
            // sequence numbers, nthSequenceNumber below short-circuits. If we have
            // decided that we are collecting n sequence numbers, it's because n is some
            // percentage of the existing sequence numbers. That means we should never
            // be in a situation where we are collecting sequence numbers but don't
            // actually have any.
            return this.buffer.last()[0];
        }
    }

    /**
     * This class is responsible for the scheduling of LRU garbage collection. It handles checking
     * whether or not GC is enabled, as well as which delay to use before the next run.
     */ class __PRIVATE_LruScheduler {
        constructor(e, t, n) {
            this.garbageCollector = e, this.asyncQueue = t, this.localStore = n, this.Tr = null;
        }
        start() {
            -1 !== this.garbageCollector.params.cacheSizeCollectionThreshold && this.Ir(6e4);
        }
        stop() {
            this.Tr && (this.Tr.cancel(), this.Tr = null);
        }
        get started() {
            return null !== this.Tr;
        }
        Ir(e) {
            __PRIVATE_logDebug(Dt, `Garbage collection scheduled in ${e}ms`), this.Tr = this.asyncQueue.enqueueAfterDelay("lru_garbage_collection" /* TimerId.LruGarbageCollection */ , e, (async () => {
                this.Tr = null;
                try {
                    await this.localStore.collectGarbage(this.garbageCollector);
                } catch (e) {
                    __PRIVATE_isIndexedDbTransactionError(e) ? __PRIVATE_logDebug(Dt, "Ignoring IndexedDB error during garbage collection: ", e) : await __PRIVATE_ignoreIfPrimaryLeaseLoss(e);
                }
                await this.Ir(3e5);
            }));
        }
    }

    /**
     * Implements the steps for LRU garbage collection.
     */ class __PRIVATE_LruGarbageCollectorImpl {
        constructor(e, t) {
            this.Er = e, this.params = t;
        }
        calculateTargetCount(e, t) {
            return this.Er.dr(e).next((e => Math.floor(t / 100 * e)));
        }
        nthSequenceNumber(e, t) {
            if (0 === t) return PersistencePromise.resolve(__PRIVATE_ListenSequence.le);
            const n = new __PRIVATE_RollingSequenceNumberBuffer(t);
            return this.Er.forEachTarget(e, (e => n.Pr(e.sequenceNumber))).next((() => this.Er.Ar(e, (e => n.Pr(e))))).next((() => n.maxValue));
        }
        removeTargets(e, t, n) {
            return this.Er.removeTargets(e, t, n);
        }
        removeOrphanedDocuments(e, t) {
            return this.Er.removeOrphanedDocuments(e, t);
        }
        collect(e, t) {
            return -1 === this.params.cacheSizeCollectionThreshold ? (__PRIVATE_logDebug("LruGarbageCollector", "Garbage collection skipped; disabled"), 
            PersistencePromise.resolve(bt)) : this.getCacheSize(e).next((n => n < this.params.cacheSizeCollectionThreshold ? (__PRIVATE_logDebug("LruGarbageCollector", `Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`), 
            bt) : this.Rr(e, t)));
        }
        getCacheSize(e) {
            return this.Er.getCacheSize(e);
        }
        Rr(e, t) {
            let n, r, i, s, o, _, u;
            const c = Date.now();
            return this.calculateTargetCount(e, this.params.percentileToCollect).next((t => (
            // Cap at the configured max
            t > this.params.maximumSequenceNumbersToCollect ? (__PRIVATE_logDebug("LruGarbageCollector", `Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${t}`), 
            r = this.params.maximumSequenceNumbersToCollect) : r = t, s = Date.now(), this.nthSequenceNumber(e, r)))).next((r => (n = r, 
            o = Date.now(), this.removeTargets(e, n, t)))).next((t => (i = t, _ = Date.now(), 
            this.removeOrphanedDocuments(e, n)))).next((e => {
                if (u = Date.now(), __PRIVATE_getLogLevel() <= LogLevel.DEBUG) {
                    __PRIVATE_logDebug("LruGarbageCollector", `LRU Garbage Collection\n\tCounted targets in ${s - c}ms\n\tDetermined least recently used ${r} in ` + (o - s) + "ms\n" + `\tRemoved ${i} targets in ` + (_ - o) + "ms\n" + `\tRemoved ${e} documents in ` + (u - _) + "ms\n" + `Total Duration: ${u - c}ms`);
                }
                return PersistencePromise.resolve({
                    didRun: true,
                    sequenceNumbersCollected: r,
                    targetsRemoved: i,
                    documentsRemoved: e
                });
            }));
        }
    }

    function __PRIVATE_newLruGarbageCollector(e, t) {
        return new __PRIVATE_LruGarbageCollectorImpl(e, t);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An in-memory buffer of entries to be written to a RemoteDocumentCache.
     * It can be used to batch up a set of changes to be written to the cache, but
     * additionally supports reading entries back with the `getEntry()` method,
     * falling back to the underlying RemoteDocumentCache if no entry is
     * buffered.
     *
     * Entries added to the cache *must* be read first. This is to facilitate
     * calculating the size delta of the pending changes.
     *
     * PORTING NOTE: This class was implemented then removed from other platforms.
     * If byte-counting ends up being needed on the other platforms, consider
     * porting this class as part of that implementation work.
     */ class RemoteDocumentChangeBuffer {
        constructor() {
            // A mapping of document key to the new cache entry that should be written.
            this.changes = new ObjectMap((e => e.toString()), ((e, t) => e.isEqual(t))), this.changesApplied = false;
        }
        /**
         * Buffers a `RemoteDocumentCache.addEntry()` call.
         *
         * You can only modify documents that have already been retrieved via
         * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
         */    addEntry(e) {
            this.assertNotApplied(), this.changes.set(e.key, e);
        }
        /**
         * Buffers a `RemoteDocumentCache.removeEntry()` call.
         *
         * You can only remove documents that have already been retrieved via
         * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
         */    removeEntry(e, t) {
            this.assertNotApplied(), this.changes.set(e, MutableDocument.newInvalidDocument(e).setReadTime(t));
        }
        /**
         * Looks up an entry in the cache. The buffered changes will first be checked,
         * and if no buffered change applies, this will forward to
         * `RemoteDocumentCache.getEntry()`.
         *
         * @param transaction - The transaction in which to perform any persistence
         *     operations.
         * @param documentKey - The key of the entry to look up.
         * @returns The cached document or an invalid document if we have nothing
         * cached.
         */    getEntry(e, t) {
            this.assertNotApplied();
            const n = this.changes.get(t);
            return void 0 !== n ? PersistencePromise.resolve(n) : this.getFromCache(e, t);
        }
        /**
         * Looks up several entries in the cache, forwarding to
         * `RemoteDocumentCache.getEntry()`.
         *
         * @param transaction - The transaction in which to perform any persistence
         *     operations.
         * @param documentKeys - The keys of the entries to look up.
         * @returns A map of cached documents, indexed by key. If an entry cannot be
         *     found, the corresponding key will be mapped to an invalid document.
         */    getEntries(e, t) {
            return this.getAllFromCache(e, t);
        }
        /**
         * Applies buffered changes to the underlying RemoteDocumentCache, using
         * the provided transaction.
         */    apply(e) {
            return this.assertNotApplied(), this.changesApplied = true, this.applyChanges(e);
        }
        /** Helper to assert this.changes is not null  */    assertNotApplied() {}
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Schema Version for the Web client:
     * 1.  Initial version including Mutation Queue, Query Cache, and Remote
     *     Document Cache
     * 2.  Used to ensure a targetGlobal object exists and add targetCount to it. No
     *     longer required because migration 3 unconditionally clears it.
     * 3.  Dropped and re-created Query Cache to deal with cache corruption related
     *     to limbo resolution. Addresses
     *     https://github.com/firebase/firebase-ios-sdk/issues/1548
     * 4.  Multi-Tab Support.
     * 5.  Removal of held write acks.
     * 6.  Create document global for tracking document cache size.
     * 7.  Ensure every cached document has a sentinel row with a sequence number.
     * 8.  Add collection-parent index for Collection Group queries.
     * 9.  Change RemoteDocumentChanges store to be keyed by readTime rather than
     *     an auto-incrementing ID. This is required for Index-Free queries.
     * 10. Rewrite the canonical IDs to the explicit Protobuf-based format.
     * 11. Add bundles and named_queries for bundle support.
     * 12. Add document overlays.
     * 13. Rewrite the keys of the remote document cache to allow for efficient
     *     document lookup via `getAll()`.
     * 14. Add overlays.
     * 15. Add indexing support.
     * 16. Parse timestamp strings before creating index entries.
     */
    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents a local view (overlay) of a document, and the fields that are
     * locally mutated.
     */
    class OverlayedDocument {
        constructor(e, 
        /**
         * The fields that are locally mutated by patch mutations.
         *
         * If the overlayed	document is from set or delete mutations, this is `null`.
         * If there is no overlay (mutation) for the document, this is an empty `FieldMask`.
         */
        t) {
            this.overlayedDocument = e, this.mutatedFields = t;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A readonly view of the local state of all documents we're tracking (i.e. we
     * have a cached version in remoteDocumentCache or local mutations for the
     * document). The view is computed by applying the mutations in the
     * MutationQueue to the RemoteDocumentCache.
     */ class LocalDocumentsView {
        constructor(e, t, n, r) {
            this.remoteDocumentCache = e, this.mutationQueue = t, this.documentOverlayCache = n, 
            this.indexManager = r;
        }
        /**
         * Get the local view of the document identified by `key`.
         *
         * @returns Local view of the document or null if we don't have any cached
         * state for it.
         */    getDocument(e, t) {
            let n = null;
            return this.documentOverlayCache.getOverlay(e, t).next((r => (n = r, this.remoteDocumentCache.getEntry(e, t)))).next((e => (null !== n && __PRIVATE_mutationApplyToLocalView(n.mutation, e, FieldMask.empty(), Timestamp.now()), 
            e)));
        }
        /**
         * Gets the local view of the documents identified by `keys`.
         *
         * If we don't have cached state for a document in `keys`, a NoDocument will
         * be stored for that key in the resulting set.
         */    getDocuments(e, t) {
            return this.remoteDocumentCache.getEntries(e, t).next((t => this.getLocalViewOfDocuments(e, t, __PRIVATE_documentKeySet()).next((() => t))));
        }
        /**
         * Similar to `getDocuments`, but creates the local view from the given
         * `baseDocs` without retrieving documents from the local store.
         *
         * @param transaction - The transaction this operation is scoped to.
         * @param docs - The documents to apply local mutations to get the local views.
         * @param existenceStateChanged - The set of document keys whose existence state
         *   is changed. This is useful to determine if some documents overlay needs
         *   to be recalculated.
         */    getLocalViewOfDocuments(e, t, n = __PRIVATE_documentKeySet()) {
            const r = __PRIVATE_newOverlayMap();
            return this.populateOverlays(e, r, t).next((() => this.computeViews(e, t, r, n).next((e => {
                let t = documentMap();
                return e.forEach(((e, n) => {
                    t = t.insert(e, n.overlayedDocument);
                })), t;
            }))));
        }
        /**
         * Gets the overlayed documents for the given document map, which will include
         * the local view of those documents and a `FieldMask` indicating which fields
         * are mutated locally, `null` if overlay is a Set or Delete mutation.
         */    getOverlayedDocuments(e, t) {
            const n = __PRIVATE_newOverlayMap();
            return this.populateOverlays(e, n, t).next((() => this.computeViews(e, t, n, __PRIVATE_documentKeySet())));
        }
        /**
         * Fetches the overlays for {@code docs} and adds them to provided overlay map
         * if the map does not already contain an entry for the given document key.
         */    populateOverlays(e, t, n) {
            const r = [];
            return n.forEach((e => {
                t.has(e) || r.push(e);
            })), this.documentOverlayCache.getOverlays(e, r).next((e => {
                e.forEach(((e, n) => {
                    t.set(e, n);
                }));
            }));
        }
        /**
         * Computes the local view for the given documents.
         *
         * @param docs - The documents to compute views for. It also has the base
         *   version of the documents.
         * @param overlays - The overlays that need to be applied to the given base
         *   version of the documents.
         * @param existenceStateChanged - A set of documents whose existence states
         *   might have changed. This is used to determine if we need to re-calculate
         *   overlays from mutation queues.
         * @return A map represents the local documents view.
         */    computeViews(e, t, n, r) {
            let i = __PRIVATE_mutableDocumentMap();
            const s = __PRIVATE_newDocumentKeyMap(), o = function __PRIVATE_newOverlayedDocumentMap() {
                return __PRIVATE_newDocumentKeyMap();
            }();
            return t.forEach(((e, t) => {
                const o = n.get(t.key);
                // Recalculate an overlay if the document's existence state changed due to
                // a remote event *and* the overlay is a PatchMutation. This is because
                // document existence state can change if some patch mutation's
                // preconditions are met.
                // NOTE: we recalculate when `overlay` is undefined as well, because there
                // might be a patch mutation whose precondition does not match before the
                // change (hence overlay is undefined), but would now match.
                            r.has(t.key) && (void 0 === o || o.mutation instanceof __PRIVATE_PatchMutation) ? i = i.insert(t.key, t) : void 0 !== o ? (s.set(t.key, o.mutation.getFieldMask()), 
                __PRIVATE_mutationApplyToLocalView(o.mutation, t, o.mutation.getFieldMask(), Timestamp.now())) : 
                // no overlay exists
                // Using EMPTY to indicate there is no overlay for the document.
                s.set(t.key, FieldMask.empty());
            })), this.recalculateAndSaveOverlays(e, i).next((e => (e.forEach(((e, t) => s.set(e, t))), 
            t.forEach(((e, t) => {
                var n;
                return o.set(e, new OverlayedDocument(t, null !== (n = s.get(e)) && void 0 !== n ? n : null));
            })), o)));
        }
        recalculateAndSaveOverlays(e, t) {
            const n = __PRIVATE_newDocumentKeyMap();
            // A reverse lookup map from batch id to the documents within that batch.
                    let r = new SortedMap(((e, t) => e - t)), i = __PRIVATE_documentKeySet();
            return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e, t).next((e => {
                for (const i of e) i.keys().forEach((e => {
                    const s = t.get(e);
                    if (null === s) return;
                    let o = n.get(e) || FieldMask.empty();
                    o = i.applyToLocalView(s, o), n.set(e, o);
                    const _ = (r.get(i.batchId) || __PRIVATE_documentKeySet()).add(e);
                    r = r.insert(i.batchId, _);
                }));
            })).next((() => {
                const s = [], o = r.getReverseIterator();
                // Iterate in descending order of batch IDs, and skip documents that are
                // already saved.
                            for (;o.hasNext(); ) {
                    const r = o.getNext(), _ = r.key, a = r.value, u = __PRIVATE_newMutationMap();
                    a.forEach((e => {
                        if (!i.has(e)) {
                            const r = __PRIVATE_calculateOverlayMutation(t.get(e), n.get(e));
                            null !== r && u.set(e, r), i = i.add(e);
                        }
                    })), s.push(this.documentOverlayCache.saveOverlays(e, _, u));
                }
                return PersistencePromise.waitFor(s);
            })).next((() => n));
        }
        /**
         * Recalculates overlays by reading the documents from remote document cache
         * first, and saves them after they are calculated.
         */    recalculateAndSaveOverlaysForDocumentKeys(e, t) {
            return this.remoteDocumentCache.getEntries(e, t).next((t => this.recalculateAndSaveOverlays(e, t)));
        }
        /**
         * Performs a query against the local view of all documents.
         *
         * @param transaction - The persistence transaction.
         * @param query - The query to match documents against.
         * @param offset - Read time and key to start scanning by (exclusive).
         * @param context - A optional tracker to keep a record of important details
         *   during database local query execution.
         */    getDocumentsMatchingQuery(e, t, n, r) {
            /**
     * Returns whether the query matches a single document by path (rather than a
     * collection).
     */
            return function __PRIVATE_isDocumentQuery$1(e) {
                return DocumentKey.isDocumentKey(e.path) && null === e.collectionGroup && 0 === e.filters.length;
            }(t) ? this.getDocumentsMatchingDocumentQuery(e, t.path) : __PRIVATE_isCollectionGroupQuery(t) ? this.getDocumentsMatchingCollectionGroupQuery(e, t, n, r) : this.getDocumentsMatchingCollectionQuery(e, t, n, r);
        }
        /**
         * Given a collection group, returns the next documents that follow the provided offset, along
         * with an updated batch ID.
         *
         * <p>The documents returned by this method are ordered by remote version from the provided
         * offset. If there are no more remote documents after the provided offset, documents with
         * mutations in order of batch id from the offset are returned. Since all documents in a batch are
         * returned together, the total number of documents returned can exceed {@code count}.
         *
         * @param transaction
         * @param collectionGroup The collection group for the documents.
         * @param offset The offset to index into.
         * @param count The number of documents to return
         * @return A LocalWriteResult with the documents that follow the provided offset and the last processed batch id.
         */    getNextDocuments(e, t, n, r) {
            return this.remoteDocumentCache.getAllFromCollectionGroup(e, t, n, r).next((i => {
                const s = r - i.size > 0 ? this.documentOverlayCache.getOverlaysForCollectionGroup(e, t, n.largestBatchId, r - i.size) : PersistencePromise.resolve(__PRIVATE_newOverlayMap());
                // The callsite will use the largest batch ID together with the latest read time to create
                // a new index offset. Since we only process batch IDs if all remote documents have been read,
                // no overlay will increase the overall read time. This is why we only need to special case
                // the batch id.
                            let o = B, _ = i;
                return s.next((t => PersistencePromise.forEach(t, ((t, n) => (o < n.largestBatchId && (o = n.largestBatchId), 
                i.get(t) ? PersistencePromise.resolve() : this.remoteDocumentCache.getEntry(e, t).next((e => {
                    _ = _.insert(t, e);
                }))))).next((() => this.populateOverlays(e, t, i))).next((() => this.computeViews(e, _, t, __PRIVATE_documentKeySet()))).next((e => ({
                    batchId: o,
                    changes: __PRIVATE_convertOverlayedDocumentMapToDocumentMap(e)
                })))));
            }));
        }
        getDocumentsMatchingDocumentQuery(e, t) {
            // Just do a simple document lookup.
            return this.getDocument(e, new DocumentKey(t)).next((e => {
                let t = documentMap();
                return e.isFoundDocument() && (t = t.insert(e.key, e)), t;
            }));
        }
        getDocumentsMatchingCollectionGroupQuery(e, t, n, r) {
            const i = t.collectionGroup;
            let s = documentMap();
            return this.indexManager.getCollectionParents(e, i).next((o => PersistencePromise.forEach(o, (o => {
                const _ = function __PRIVATE_asCollectionQueryAtPath(e, t) {
                    return new __PRIVATE_QueryImpl(t, 
                    /*collectionGroup=*/ null, e.explicitOrderBy.slice(), e.filters.slice(), e.limit, e.limitType, e.startAt, e.endAt);
                }(t, o.child(i));
                return this.getDocumentsMatchingCollectionQuery(e, _, n, r).next((e => {
                    e.forEach(((e, t) => {
                        s = s.insert(e, t);
                    }));
                }));
            })).next((() => s))));
        }
        getDocumentsMatchingCollectionQuery(e, t, n, r) {
            // Query the remote documents and overlay mutations.
            let i;
            return this.documentOverlayCache.getOverlaysForCollection(e, t.path, n.largestBatchId).next((s => (i = s, 
            this.remoteDocumentCache.getDocumentsMatchingQuery(e, t, n, i, r)))).next((e => {
                // As documents might match the query because of their overlay we need to
                // include documents for all overlays in the initial document set.
                i.forEach(((t, n) => {
                    const r = n.getKey();
                    null === e.get(r) && (e = e.insert(r, MutableDocument.newInvalidDocument(r)));
                }));
                // Apply the overlays and match against the query.
                let n = documentMap();
                return e.forEach(((e, r) => {
                    const s = i.get(e);
                    void 0 !== s && __PRIVATE_mutationApplyToLocalView(s.mutation, r, FieldMask.empty(), Timestamp.now()), 
                    // Finally, insert the documents that still match the query
                    __PRIVATE_queryMatches(t, r) && (n = n.insert(e, r));
                })), n;
            }));
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_MemoryBundleCache {
        constructor(e) {
            this.serializer = e, this.Fr = new Map, this.Mr = new Map;
        }
        getBundleMetadata(e, t) {
            return PersistencePromise.resolve(this.Fr.get(t));
        }
        saveBundleMetadata(e, t) {
            return this.Fr.set(t.id, 
            /** Decodes a BundleMetadata proto into a BundleMetadata object. */
            function __PRIVATE_fromBundleMetadata(e) {
                return {
                    id: e.id,
                    version: e.version,
                    createTime: __PRIVATE_fromVersion(e.createTime)
                };
            }(t)), PersistencePromise.resolve();
        }
        getNamedQuery(e, t) {
            return PersistencePromise.resolve(this.Mr.get(t));
        }
        saveNamedQuery(e, t) {
            return this.Mr.set(t.name, function __PRIVATE_fromProtoNamedQuery(e) {
                return {
                    name: e.name,
                    query: __PRIVATE_fromBundledQuery(e.bundledQuery),
                    readTime: __PRIVATE_fromVersion(e.readTime)
                };
            }(t)), PersistencePromise.resolve();
        }
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An in-memory implementation of DocumentOverlayCache.
     */ class __PRIVATE_MemoryDocumentOverlayCache {
        constructor() {
            // A map sorted by DocumentKey, whose value is a pair of the largest batch id
            // for the overlay and the overlay itself.
            this.overlays = new SortedMap(DocumentKey.comparator), this.Or = new Map;
        }
        getOverlay(e, t) {
            return PersistencePromise.resolve(this.overlays.get(t));
        }
        getOverlays(e, t) {
            const n = __PRIVATE_newOverlayMap();
            return PersistencePromise.forEach(t, (t => this.getOverlay(e, t).next((e => {
                null !== e && n.set(t, e);
            })))).next((() => n));
        }
        saveOverlays(e, t, n) {
            return n.forEach(((n, r) => {
                this.St(e, t, r);
            })), PersistencePromise.resolve();
        }
        removeOverlaysForBatchId(e, t, n) {
            const r = this.Or.get(n);
            return void 0 !== r && (r.forEach((e => this.overlays = this.overlays.remove(e))), 
            this.Or.delete(n)), PersistencePromise.resolve();
        }
        getOverlaysForCollection(e, t, n) {
            const r = __PRIVATE_newOverlayMap(), i = t.length + 1, s = new DocumentKey(t.child("")), o = this.overlays.getIteratorFrom(s);
            for (;o.hasNext(); ) {
                const e = o.getNext().value, s = e.getKey();
                if (!t.isPrefixOf(s.path)) break;
                // Documents from sub-collections
                            s.path.length === i && (e.largestBatchId > n && r.set(e.getKey(), e));
            }
            return PersistencePromise.resolve(r);
        }
        getOverlaysForCollectionGroup(e, t, n, r) {
            let i = new SortedMap(((e, t) => e - t));
            const s = this.overlays.getIterator();
            for (;s.hasNext(); ) {
                const e = s.getNext().value;
                if (e.getKey().getCollectionGroup() === t && e.largestBatchId > n) {
                    let t = i.get(e.largestBatchId);
                    null === t && (t = __PRIVATE_newOverlayMap(), i = i.insert(e.largestBatchId, t)), 
                    t.set(e.getKey(), e);
                }
            }
            const o = __PRIVATE_newOverlayMap(), _ = i.getIterator();
            for (;_.hasNext(); ) {
                if (_.getNext().value.forEach(((e, t) => o.set(e, t))), o.size() >= r) break;
            }
            return PersistencePromise.resolve(o);
        }
        St(e, t, n) {
            // Remove the association of the overlay to its batch id.
            const r = this.overlays.get(n.key);
            if (null !== r) {
                const e = this.Or.get(r.largestBatchId).delete(n.key);
                this.Or.set(r.largestBatchId, e);
            }
            this.overlays = this.overlays.insert(n.key, new Overlay(t, n));
            // Create the association of this overlay to the given largestBatchId.
            let i = this.Or.get(t);
            void 0 === i && (i = __PRIVATE_documentKeySet(), this.Or.set(t, i)), this.Or.set(t, i.add(n.key));
        }
    }

    /**
     * @license
     * Copyright 2024 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_MemoryGlobalsCache {
        constructor() {
            this.sessionToken = ByteString.EMPTY_BYTE_STRING;
        }
        getSessionToken(e) {
            return PersistencePromise.resolve(this.sessionToken);
        }
        setSessionToken(e, t) {
            return this.sessionToken = t, PersistencePromise.resolve();
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A collection of references to a document from some kind of numbered entity
     * (either a target ID or batch ID). As references are added to or removed from
     * the set corresponding events are emitted to a registered garbage collector.
     *
     * Each reference is represented by a DocumentReference object. Each of them
     * contains enough information to uniquely identify the reference. They are all
     * stored primarily in a set sorted by key. A document is considered garbage if
     * there's no references in that set (this can be efficiently checked thanks to
     * sorting by key).
     *
     * ReferenceSet also keeps a secondary set that contains references sorted by
     * IDs. This one is used to efficiently implement removal of all references by
     * some target ID.
     */ class __PRIVATE_ReferenceSet {
        constructor() {
            // A set of outstanding references to a document sorted by key.
            this.Nr = new SortedSet(__PRIVATE_DocReference.Br), 
            // A set of outstanding references to a document sorted by target id.
            this.Lr = new SortedSet(__PRIVATE_DocReference.kr);
        }
        /** Returns true if the reference set contains no references. */    isEmpty() {
            return this.Nr.isEmpty();
        }
        /** Adds a reference to the given document key for the given ID. */    addReference(e, t) {
            const n = new __PRIVATE_DocReference(e, t);
            this.Nr = this.Nr.add(n), this.Lr = this.Lr.add(n);
        }
        /** Add references to the given document keys for the given ID. */    qr(e, t) {
            e.forEach((e => this.addReference(e, t)));
        }
        /**
         * Removes a reference to the given document key for the given
         * ID.
         */    removeReference(e, t) {
            this.Qr(new __PRIVATE_DocReference(e, t));
        }
        $r(e, t) {
            e.forEach((e => this.removeReference(e, t)));
        }
        /**
         * Clears all references with a given ID. Calls removeRef() for each key
         * removed.
         */    Ur(e) {
            const t = new DocumentKey(new ResourcePath([])), n = new __PRIVATE_DocReference(t, e), r = new __PRIVATE_DocReference(t, e + 1), i = [];
            return this.Lr.forEachInRange([ n, r ], (e => {
                this.Qr(e), i.push(e.key);
            })), i;
        }
        Kr() {
            this.Nr.forEach((e => this.Qr(e)));
        }
        Qr(e) {
            this.Nr = this.Nr.delete(e), this.Lr = this.Lr.delete(e);
        }
        Wr(e) {
            const t = new DocumentKey(new ResourcePath([])), n = new __PRIVATE_DocReference(t, e), r = new __PRIVATE_DocReference(t, e + 1);
            let i = __PRIVATE_documentKeySet();
            return this.Lr.forEachInRange([ n, r ], (e => {
                i = i.add(e.key);
            })), i;
        }
        containsKey(e) {
            const t = new __PRIVATE_DocReference(e, 0), n = this.Nr.firstAfterOrEqual(t);
            return null !== n && e.isEqual(n.key);
        }
    }

    class __PRIVATE_DocReference {
        constructor(e, t) {
            this.key = e, this.Gr = t;
        }
        /** Compare by key then by ID */    static Br(e, t) {
            return DocumentKey.comparator(e.key, t.key) || __PRIVATE_primitiveComparator(e.Gr, t.Gr);
        }
        /** Compare by ID then by key */    static kr(e, t) {
            return __PRIVATE_primitiveComparator(e.Gr, t.Gr) || DocumentKey.comparator(e.key, t.key);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_MemoryMutationQueue {
        constructor(e, t) {
            this.indexManager = e, this.referenceDelegate = t, 
            /**
             * The set of all mutations that have been sent but not yet been applied to
             * the backend.
             */
            this.mutationQueue = [], 
            /** Next value to use when assigning sequential IDs to each mutation batch. */
            this.Jn = 1, 
            /** An ordered mapping between documents and the mutations batch IDs. */
            this.zr = new SortedSet(__PRIVATE_DocReference.Br);
        }
        checkEmpty(e) {
            return PersistencePromise.resolve(0 === this.mutationQueue.length);
        }
        addMutationBatch(e, t, n, r) {
            const i = this.Jn;
            this.Jn++, this.mutationQueue.length > 0 && this.mutationQueue[this.mutationQueue.length - 1];
            const s = new MutationBatch(i, t, n, r);
            this.mutationQueue.push(s);
            // Track references by document key and index collection parents.
            for (const t of r) this.zr = this.zr.add(new __PRIVATE_DocReference(t.key, i)), 
            this.indexManager.addToCollectionParentIndex(e, t.key.path.popLast());
            return PersistencePromise.resolve(s);
        }
        lookupMutationBatch(e, t) {
            return PersistencePromise.resolve(this.jr(t));
        }
        getNextMutationBatchAfterBatchId(e, t) {
            const n = t + 1, r = this.Hr(n), i = r < 0 ? 0 : r;
            // The requested batchId may still be out of range so normalize it to the
            // start of the queue.
                    return PersistencePromise.resolve(this.mutationQueue.length > i ? this.mutationQueue[i] : null);
        }
        getHighestUnacknowledgedBatchId() {
            return PersistencePromise.resolve(0 === this.mutationQueue.length ? $ : this.Jn - 1);
        }
        getAllMutationBatches(e) {
            return PersistencePromise.resolve(this.mutationQueue.slice());
        }
        getAllMutationBatchesAffectingDocumentKey(e, t) {
            const n = new __PRIVATE_DocReference(t, 0), r = new __PRIVATE_DocReference(t, Number.POSITIVE_INFINITY), i = [];
            return this.zr.forEachInRange([ n, r ], (e => {
                const t = this.jr(e.Gr);
                i.push(t);
            })), PersistencePromise.resolve(i);
        }
        getAllMutationBatchesAffectingDocumentKeys(e, t) {
            let n = new SortedSet(__PRIVATE_primitiveComparator);
            return t.forEach((e => {
                const t = new __PRIVATE_DocReference(e, 0), r = new __PRIVATE_DocReference(e, Number.POSITIVE_INFINITY);
                this.zr.forEachInRange([ t, r ], (e => {
                    n = n.add(e.Gr);
                }));
            })), PersistencePromise.resolve(this.Jr(n));
        }
        getAllMutationBatchesAffectingQuery(e, t) {
            // Use the query path as a prefix for testing if a document matches the
            // query.
            const n = t.path, r = n.length + 1;
            // Construct a document reference for actually scanning the index. Unlike
            // the prefix the document key in this reference must have an even number of
            // segments. The empty segment can be used a suffix of the query path
            // because it precedes all other segments in an ordered traversal.
            let i = n;
            DocumentKey.isDocumentKey(i) || (i = i.child(""));
            const s = new __PRIVATE_DocReference(new DocumentKey(i), 0);
            // Find unique batchIDs referenced by all documents potentially matching the
            // query.
                    let o = new SortedSet(__PRIVATE_primitiveComparator);
            return this.zr.forEachWhile((e => {
                const t = e.key.path;
                return !!n.isPrefixOf(t) && (
                // Rows with document keys more than one segment longer than the query
                // path can't be matches. For example, a query on 'rooms' can't match
                // the document /rooms/abc/messages/xyx.
                // TODO(mcg): we'll need a different scanner when we implement
                // ancestor queries.
                t.length === r && (o = o.add(e.Gr)), true);
            }), s), PersistencePromise.resolve(this.Jr(o));
        }
        Jr(e) {
            // Construct an array of matching batches, sorted by batchID to ensure that
            // multiple mutations affecting the same document key are applied in order.
            const t = [];
            return e.forEach((e => {
                const n = this.jr(e);
                null !== n && t.push(n);
            })), t;
        }
        removeMutationBatch(e, t) {
            __PRIVATE_hardAssert(0 === this.Yr(t.batchId, "removed"), 55003), this.mutationQueue.shift();
            let n = this.zr;
            return PersistencePromise.forEach(t.mutations, (r => {
                const i = new __PRIVATE_DocReference(r.key, t.batchId);
                return n = n.delete(i), this.referenceDelegate.markPotentiallyOrphaned(e, r.key);
            })).next((() => {
                this.zr = n;
            }));
        }
        Xn(e) {
            // No-op since the memory mutation queue does not maintain a separate cache.
        }
        containsKey(e, t) {
            const n = new __PRIVATE_DocReference(t, 0), r = this.zr.firstAfterOrEqual(n);
            return PersistencePromise.resolve(t.isEqual(r && r.key));
        }
        performConsistencyCheck(e) {
            return this.mutationQueue.length, PersistencePromise.resolve();
        }
        /**
         * Finds the index of the given batchId in the mutation queue and asserts that
         * the resulting index is within the bounds of the queue.
         *
         * @param batchId - The batchId to search for
         * @param action - A description of what the caller is doing, phrased in passive
         * form (e.g. "acknowledged" in a routine that acknowledges batches).
         */    Yr(e, t) {
            return this.Hr(e);
        }
        /**
         * Finds the index of the given batchId in the mutation queue. This operation
         * is O(1).
         *
         * @returns The computed index of the batch with the given batchId, based on
         * the state of the queue. Note this index can be negative if the requested
         * batchId has already been removed from the queue or past the end of the
         * queue if the batchId is larger than the last added batch.
         */    Hr(e) {
            if (0 === this.mutationQueue.length) 
            // As an index this is past the end of the queue
            return 0;
            // Examine the front of the queue to figure out the difference between the
            // batchId and indexes in the array. Note that since the queue is ordered
            // by batchId, if the first batch has a larger batchId then the requested
            // batchId doesn't exist in the queue.
                    return e - this.mutationQueue[0].batchId;
        }
        /**
         * A version of lookupMutationBatch that doesn't return a promise, this makes
         * other functions that uses this code easier to read and more efficient.
         */    jr(e) {
            const t = this.Hr(e);
            if (t < 0 || t >= this.mutationQueue.length) return null;
            return this.mutationQueue[t];
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The smallest value representable by a 64-bit signed integer (long).
     */
    /**
     * The memory-only RemoteDocumentCache for IndexedDb. To construct, invoke
     * `newMemoryRemoteDocumentCache()`.
     */
    class __PRIVATE_MemoryRemoteDocumentCacheImpl {
        /**
         * @param sizer - Used to assess the size of a document. For eager GC, this is
         * expected to just return 0 to avoid unnecessarily doing the work of
         * calculating the size.
         */
        constructor(e) {
            this.Zr = e, 
            /** Underlying cache of documents and their read times. */
            this.docs = function __PRIVATE_documentEntryMap() {
                return new SortedMap(DocumentKey.comparator);
            }(), 
            /** Size of all cached documents. */
            this.size = 0;
        }
        setIndexManager(e) {
            this.indexManager = e;
        }
        /**
         * Adds the supplied entry to the cache and updates the cache size as appropriate.
         *
         * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
         * returned by `newChangeBuffer()`.
         */    addEntry(e, t) {
            const n = t.key, r = this.docs.get(n), i = r ? r.size : 0, s = this.Zr(t);
            return this.docs = this.docs.insert(n, {
                document: t.mutableCopy(),
                size: s
            }), this.size += s - i, this.indexManager.addToCollectionParentIndex(e, n.path.popLast());
        }
        /**
         * Removes the specified entry from the cache and updates the cache size as appropriate.
         *
         * All calls of `removeEntry` are required to go through the RemoteDocumentChangeBuffer
         * returned by `newChangeBuffer()`.
         */    removeEntry(e) {
            const t = this.docs.get(e);
            t && (this.docs = this.docs.remove(e), this.size -= t.size);
        }
        getEntry(e, t) {
            const n = this.docs.get(t);
            return PersistencePromise.resolve(n ? n.document.mutableCopy() : MutableDocument.newInvalidDocument(t));
        }
        getEntries(e, t) {
            let n = __PRIVATE_mutableDocumentMap();
            return t.forEach((e => {
                const t = this.docs.get(e);
                n = n.insert(e, t ? t.document.mutableCopy() : MutableDocument.newInvalidDocument(e));
            })), PersistencePromise.resolve(n);
        }
        getDocumentsMatchingQuery(e, t, n, r) {
            let i = __PRIVATE_mutableDocumentMap();
            // Documents are ordered by key, so we can use a prefix scan to narrow down
            // the documents we need to match the query against.
                    const s = t.path, o = new DocumentKey(s.child("__id-9223372036854775808__")), _ = this.docs.getIteratorFrom(o);
            // Document keys are ordered first by numeric value ("__id<Long>__"),
            // then lexicographically by string value. Start the iterator at the minimum
            // possible Document key value.
                    for (;_.hasNext(); ) {
                const {key: e, value: {document: o}} = _.getNext();
                if (!s.isPrefixOf(e.path)) break;
                e.path.length > s.length + 1 || (__PRIVATE_indexOffsetComparator(__PRIVATE_newIndexOffsetFromDocument(o), n) <= 0 || (r.has(o.key) || __PRIVATE_queryMatches(t, o)) && (i = i.insert(o.key, o.mutableCopy())));
            }
            return PersistencePromise.resolve(i);
        }
        getAllFromCollectionGroup(e, t, n, r) {
            // This method should only be called from the IndexBackfiller if persistence
            // is enabled.
            fail(9500);
        }
        Xr(e, t) {
            return PersistencePromise.forEach(this.docs, (e => t(e)));
        }
        newChangeBuffer(e) {
            // `trackRemovals` is ignores since the MemoryRemoteDocumentCache keeps
            // a separate changelog and does not need special handling for removals.
            return new __PRIVATE_MemoryRemoteDocumentChangeBuffer(this);
        }
        getSize(e) {
            return PersistencePromise.resolve(this.size);
        }
    }

    /**
     * Creates a new memory-only RemoteDocumentCache.
     *
     * @param sizer - Used to assess the size of a document. For eager GC, this is
     * expected to just return 0 to avoid unnecessarily doing the work of
     * calculating the size.
     */
    /**
     * Handles the details of adding and updating documents in the MemoryRemoteDocumentCache.
     */
    class __PRIVATE_MemoryRemoteDocumentChangeBuffer extends RemoteDocumentChangeBuffer {
        constructor(e) {
            super(), this.vr = e;
        }
        applyChanges(e) {
            const t = [];
            return this.changes.forEach(((n, r) => {
                r.isValidDocument() ? t.push(this.vr.addEntry(e, r)) : this.vr.removeEntry(n);
            })), PersistencePromise.waitFor(t);
        }
        getFromCache(e, t) {
            return this.vr.getEntry(e, t);
        }
        getAllFromCache(e, t) {
            return this.vr.getEntries(e, t);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_MemoryTargetCache {
        constructor(e) {
            this.persistence = e, 
            /**
             * Maps a target to the data about that target
             */
            this.ei = new ObjectMap((e => __PRIVATE_canonifyTarget(e)), __PRIVATE_targetEquals), 
            /** The last received snapshot version. */
            this.lastRemoteSnapshotVersion = SnapshotVersion.min(), 
            /** The highest numbered target ID encountered. */
            this.highestTargetId = 0, 
            /** The highest sequence number encountered. */
            this.ti = 0, 
            /**
             * A ordered bidirectional mapping between documents and the remote target
             * IDs.
             */
            this.ni = new __PRIVATE_ReferenceSet, this.targetCount = 0, this.ri = __PRIVATE_TargetIdGenerator.rr();
        }
        forEachTarget(e, t) {
            return this.ei.forEach(((e, n) => t(n))), PersistencePromise.resolve();
        }
        getLastRemoteSnapshotVersion(e) {
            return PersistencePromise.resolve(this.lastRemoteSnapshotVersion);
        }
        getHighestSequenceNumber(e) {
            return PersistencePromise.resolve(this.ti);
        }
        allocateTargetId(e) {
            return this.highestTargetId = this.ri.next(), PersistencePromise.resolve(this.highestTargetId);
        }
        setTargetsMetadata(e, t, n) {
            return n && (this.lastRemoteSnapshotVersion = n), t > this.ti && (this.ti = t), 
            PersistencePromise.resolve();
        }
        ar(e) {
            this.ei.set(e.target, e);
            const t = e.targetId;
            t > this.highestTargetId && (this.ri = new __PRIVATE_TargetIdGenerator(t), this.highestTargetId = t), 
            e.sequenceNumber > this.ti && (this.ti = e.sequenceNumber);
        }
        addTargetData(e, t) {
            return this.ar(t), this.targetCount += 1, PersistencePromise.resolve();
        }
        updateTargetData(e, t) {
            return this.ar(t), PersistencePromise.resolve();
        }
        removeTargetData(e, t) {
            return this.ei.delete(t.target), this.ni.Ur(t.targetId), this.targetCount -= 1, 
            PersistencePromise.resolve();
        }
        removeTargets(e, t, n) {
            let r = 0;
            const i = [];
            return this.ei.forEach(((s, o) => {
                o.sequenceNumber <= t && null === n.get(o.targetId) && (this.ei.delete(s), i.push(this.removeMatchingKeysForTargetId(e, o.targetId)), 
                r++);
            })), PersistencePromise.waitFor(i).next((() => r));
        }
        getTargetCount(e) {
            return PersistencePromise.resolve(this.targetCount);
        }
        getTargetData(e, t) {
            const n = this.ei.get(t) || null;
            return PersistencePromise.resolve(n);
        }
        addMatchingKeys(e, t, n) {
            return this.ni.qr(t, n), PersistencePromise.resolve();
        }
        removeMatchingKeys(e, t, n) {
            this.ni.$r(t, n);
            const r = this.persistence.referenceDelegate, i = [];
            return r && t.forEach((t => {
                i.push(r.markPotentiallyOrphaned(e, t));
            })), PersistencePromise.waitFor(i);
        }
        removeMatchingKeysForTargetId(e, t) {
            return this.ni.Ur(t), PersistencePromise.resolve();
        }
        getMatchingKeysForTargetId(e, t) {
            const n = this.ni.Wr(t);
            return PersistencePromise.resolve(n);
        }
        containsKey(e, t) {
            return PersistencePromise.resolve(this.ni.containsKey(t));
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A memory-backed instance of Persistence. Data is stored only in RAM and
     * not persisted across sessions.
     */
    class __PRIVATE_MemoryPersistence {
        /**
         * The constructor accepts a factory for creating a reference delegate. This
         * allows both the delegate and this instance to have strong references to
         * each other without having nullable fields that would then need to be
         * checked or asserted on every access.
         */
        constructor(e, t) {
            this.ii = {}, this.overlays = {}, this.si = new __PRIVATE_ListenSequence(0), this.oi = false, 
            this.oi = true, this._i = new __PRIVATE_MemoryGlobalsCache, this.referenceDelegate = e(this), 
            this.ai = new __PRIVATE_MemoryTargetCache(this);
            this.indexManager = new __PRIVATE_MemoryIndexManager, this.remoteDocumentCache = function __PRIVATE_newMemoryRemoteDocumentCache(e) {
                return new __PRIVATE_MemoryRemoteDocumentCacheImpl(e);
            }((e => this.referenceDelegate.ui(e))), this.serializer = new __PRIVATE_LocalSerializer(t), 
            this.ci = new __PRIVATE_MemoryBundleCache(this.serializer);
        }
        start() {
            return Promise.resolve();
        }
        shutdown() {
            // No durable state to ensure is closed on shutdown.
            return this.oi = false, Promise.resolve();
        }
        get started() {
            return this.oi;
        }
        setDatabaseDeletedListener() {
            // No op.
        }
        setNetworkEnabled() {
            // No op.
        }
        getIndexManager(e) {
            // We do not currently support indices for memory persistence, so we can
            // return the same shared instance of the memory index manager.
            return this.indexManager;
        }
        getDocumentOverlayCache(e) {
            let t = this.overlays[e.toKey()];
            return t || (t = new __PRIVATE_MemoryDocumentOverlayCache, this.overlays[e.toKey()] = t), 
            t;
        }
        getMutationQueue(e, t) {
            let n = this.ii[e.toKey()];
            return n || (n = new __PRIVATE_MemoryMutationQueue(t, this.referenceDelegate), this.ii[e.toKey()] = n), 
            n;
        }
        getGlobalsCache() {
            return this._i;
        }
        getTargetCache() {
            return this.ai;
        }
        getRemoteDocumentCache() {
            return this.remoteDocumentCache;
        }
        getBundleCache() {
            return this.ci;
        }
        runTransaction(e, t, n) {
            __PRIVATE_logDebug("MemoryPersistence", "Starting transaction:", e);
            const r = new __PRIVATE_MemoryTransaction(this.si.next());
            return this.referenceDelegate.li(), n(r).next((e => this.referenceDelegate.hi(r).next((() => e)))).toPromise().then((e => (r.raiseOnCommittedEvent(), 
            e)));
        }
        Pi(e, t) {
            return PersistencePromise.or(Object.values(this.ii).map((n => () => n.containsKey(e, t))));
        }
    }

    /**
     * Memory persistence is not actually transactional, but future implementations
     * may have transaction-scoped state.
     */ class __PRIVATE_MemoryTransaction extends PersistenceTransaction {
        constructor(e) {
            super(), this.currentSequenceNumber = e;
        }
    }

    class __PRIVATE_MemoryEagerDelegate {
        constructor(e) {
            this.persistence = e, 
            /** Tracks all documents that are active in Query views. */
            this.Ti = new __PRIVATE_ReferenceSet, 
            /** The list of documents that are potentially GCed after each transaction. */
            this.Ii = null;
        }
        static Ei(e) {
            return new __PRIVATE_MemoryEagerDelegate(e);
        }
        get di() {
            if (this.Ii) return this.Ii;
            throw fail(60996);
        }
        addReference(e, t, n) {
            return this.Ti.addReference(n, t), this.di.delete(n.toString()), PersistencePromise.resolve();
        }
        removeReference(e, t, n) {
            return this.Ti.removeReference(n, t), this.di.add(n.toString()), PersistencePromise.resolve();
        }
        markPotentiallyOrphaned(e, t) {
            return this.di.add(t.toString()), PersistencePromise.resolve();
        }
        removeTarget(e, t) {
            this.Ti.Ur(t.targetId).forEach((e => this.di.add(e.toString())));
            const n = this.persistence.getTargetCache();
            return n.getMatchingKeysForTargetId(e, t.targetId).next((e => {
                e.forEach((e => this.di.add(e.toString())));
            })).next((() => n.removeTargetData(e, t)));
        }
        li() {
            this.Ii = new Set;
        }
        hi(e) {
            // Remove newly orphaned documents.
            const t = this.persistence.getRemoteDocumentCache().newChangeBuffer();
            return PersistencePromise.forEach(this.di, (n => {
                const r = DocumentKey.fromPath(n);
                return this.Ai(e, r).next((e => {
                    e || t.removeEntry(r, SnapshotVersion.min());
                }));
            })).next((() => (this.Ii = null, t.apply(e))));
        }
        updateLimboDocument(e, t) {
            return this.Ai(e, t).next((e => {
                e ? this.di.delete(t.toString()) : this.di.add(t.toString());
            }));
        }
        ui(e) {
            // For eager GC, we don't care about the document size, there are no size thresholds.
            return 0;
        }
        Ai(e, t) {
            return PersistencePromise.or([ () => PersistencePromise.resolve(this.Ti.containsKey(t)), () => this.persistence.getTargetCache().containsKey(e, t), () => this.persistence.Pi(e, t) ]);
        }
    }

    class __PRIVATE_MemoryLruDelegate {
        constructor(e, t) {
            this.persistence = e, this.Ri = new ObjectMap((e => __PRIVATE_encodeResourcePath(e.path)), ((e, t) => e.isEqual(t))), 
            this.garbageCollector = __PRIVATE_newLruGarbageCollector(this, t);
        }
        static Ei(e, t) {
            return new __PRIVATE_MemoryLruDelegate(e, t);
        }
        // No-ops, present so memory persistence doesn't have to care which delegate
        // it has.
        li() {}
        hi(e) {
            return PersistencePromise.resolve();
        }
        forEachTarget(e, t) {
            return this.persistence.getTargetCache().forEachTarget(e, t);
        }
        dr(e) {
            const t = this.Vr(e);
            return this.persistence.getTargetCache().getTargetCount(e).next((e => t.next((t => e + t))));
        }
        Vr(e) {
            let t = 0;
            return this.Ar(e, (e => {
                t++;
            })).next((() => t));
        }
        Ar(e, t) {
            return PersistencePromise.forEach(this.Ri, ((n, r) => this.gr(e, n, r).next((e => e ? PersistencePromise.resolve() : t(r)))));
        }
        removeTargets(e, t, n) {
            return this.persistence.getTargetCache().removeTargets(e, t, n);
        }
        removeOrphanedDocuments(e, t) {
            let n = 0;
            const r = this.persistence.getRemoteDocumentCache(), i = r.newChangeBuffer();
            return r.Xr(e, (r => this.gr(e, r, t).next((e => {
                e || (n++, i.removeEntry(r, SnapshotVersion.min()));
            })))).next((() => i.apply(e))).next((() => n));
        }
        markPotentiallyOrphaned(e, t) {
            return this.Ri.set(t, e.currentSequenceNumber), PersistencePromise.resolve();
        }
        removeTarget(e, t) {
            const n = t.withSequenceNumber(e.currentSequenceNumber);
            return this.persistence.getTargetCache().updateTargetData(e, n);
        }
        addReference(e, t, n) {
            return this.Ri.set(n, e.currentSequenceNumber), PersistencePromise.resolve();
        }
        removeReference(e, t, n) {
            return this.Ri.set(n, e.currentSequenceNumber), PersistencePromise.resolve();
        }
        updateLimboDocument(e, t) {
            return this.Ri.set(t, e.currentSequenceNumber), PersistencePromise.resolve();
        }
        ui(e) {
            let t = e.key.toString().length;
            return e.isFoundDocument() && (t += __PRIVATE_estimateByteSize(e.data.value)), t;
        }
        gr(e, t, n) {
            return PersistencePromise.or([ () => this.persistence.Pi(e, t), () => this.persistence.getTargetCache().containsKey(e, t), () => {
                const e = this.Ri.get(t);
                return PersistencePromise.resolve(void 0 !== e && e > n);
            } ]);
        }
        getCacheSize(e) {
            return this.persistence.getRemoteDocumentCache().getSize(e);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A set of changes to what documents are currently in view and out of view for
     * a given query. These changes are sent to the LocalStore by the View (via
     * the SyncEngine) and are used to pin / unpin documents as appropriate.
     */
    class __PRIVATE_LocalViewChanges {
        constructor(e, t, n, r) {
            this.targetId = e, this.fromCache = t, this.ls = n, this.hs = r;
        }
        static Ps(e, t) {
            let n = __PRIVATE_documentKeySet(), r = __PRIVATE_documentKeySet();
            for (const e of t.docChanges) switch (e.type) {
              case 0 /* ChangeType.Added */ :
                n = n.add(e.doc.key);
                break;

              case 1 /* ChangeType.Removed */ :
                r = r.add(e.doc.key);
     // do nothing
                    }
            return new __PRIVATE_LocalViewChanges(e, t.fromCache, n, r);
        }
    }

    /**
     * @license
     * Copyright 2023 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A tracker to keep a record of important details during database local query
     * execution.
     */ class QueryContext {
        constructor() {
            /**
             * Counts the number of documents passed through during local query execution.
             */
            this._documentReadCount = 0;
        }
        get documentReadCount() {
            return this._documentReadCount;
        }
        incrementDocumentReadCount(e) {
            this._documentReadCount += e;
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The Firestore query engine.
     *
     * Firestore queries can be executed in three modes. The Query Engine determines
     * what mode to use based on what data is persisted. The mode only determines
     * the runtime complexity of the query - the result set is equivalent across all
     * implementations.
     *
     * The Query engine will use indexed-based execution if a user has configured
     * any index that can be used to execute query (via `setIndexConfiguration()`).
     * Otherwise, the engine will try to optimize the query by re-using a previously
     * persisted query result. If that is not possible, the query will be executed
     * via a full collection scan.
     *
     * Index-based execution is the default when available. The query engine
     * supports partial indexed execution and merges the result from the index
     * lookup with documents that have not yet been indexed. The index evaluation
     * matches the backend's format and as such, the SDK can use indexing for all
     * queries that the backend supports.
     *
     * If no index exists, the query engine tries to take advantage of the target
     * document mapping in the TargetCache. These mappings exists for all queries
     * that have been synced with the backend at least once and allow the query
     * engine to only read documents that previously matched a query plus any
     * documents that were edited after the query was last listened to.
     *
     * There are some cases when this optimization is not guaranteed to produce
     * the same results as full collection scans. In these cases, query
     * processing falls back to full scans. These cases are:
     *
     * - Limit queries where a document that matched the query previously no longer
     *   matches the query.
     *
     * - Limit queries where a document edit may cause the document to sort below
     *   another document that is in the local cache.
     *
     * - Queries that have never been CURRENT or free of limbo documents.
     */
    class __PRIVATE_QueryEngine {
        constructor() {
            this.Ts = false, this.Is = false, 
            /**
             * SDK only decides whether it should create index when collection size is
             * larger than this.
             */
            this.Es = 100, this.ds = 
            /**
     * This cost represents the evaluation result of
     * (([index, docKey] + [docKey, docContent]) per document in the result set)
     * / ([docKey, docContent] per documents in full collection scan) coming from
     * experiment [enter PR experiment URL here].
     */
            function __PRIVATE_getDefaultRelativeIndexReadCostPerDocument() {
                // These values were derived from an experiment where several members of the
                // Firestore SDK team ran a performance test in various environments.
                // Googlers can see b/299284287 for details.
                return isSafari() ? 8 : __PRIVATE_getAndroidVersion(getUA()) > 0 ? 6 : 4;
            }();
        }
        /** Sets the document view to query against. */    initialize(e, t) {
            this.As = e, this.indexManager = t, this.Ts = true;
        }
        /** Returns all local documents matching the specified query. */    getDocumentsMatchingQuery(e, t, n, r) {
            // Stores the result from executing the query; using this object is more
            // convenient than passing the result between steps of the persistence
            // transaction and improves readability comparatively.
            const i = {
                result: null
            };
            return this.Rs(e, t).next((e => {
                i.result = e;
            })).next((() => {
                if (!i.result) return this.Vs(e, t, r, n).next((e => {
                    i.result = e;
                }));
            })).next((() => {
                if (i.result) return;
                const n = new QueryContext;
                return this.fs(e, t, n).next((r => {
                    if (i.result = r, this.Is) return this.gs(e, t, n, r.size);
                }));
            })).next((() => i.result));
        }
        gs(e, t, n, r) {
            return n.documentReadCount < this.Es ? (__PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "SDK will not create cache indexes for query:", __PRIVATE_stringifyQuery(t), "since it only creates cache indexes for collection contains", "more than or equal to", this.Es, "documents"), 
            PersistencePromise.resolve()) : (__PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "Query:", __PRIVATE_stringifyQuery(t), "scans", n.documentReadCount, "local documents and returns", r, "documents as results."), 
            n.documentReadCount > this.ds * r ? (__PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "The SDK decides to create cache indexes for query:", __PRIVATE_stringifyQuery(t), "as using cache indexes may help improve performance."), 
            this.indexManager.createTargetIndexes(e, __PRIVATE_queryToTarget(t))) : PersistencePromise.resolve());
        }
        /**
         * Performs an indexed query that evaluates the query based on a collection's
         * persisted index values. Returns `null` if an index is not available.
         */    Rs(e, t) {
            if (__PRIVATE_queryMatchesAllDocuments(t)) 
            // Queries that match all documents don't benefit from using
            // key-based lookups. It is more efficient to scan all documents in a
            // collection, rather than to perform individual lookups.
            return PersistencePromise.resolve(null);
            let n = __PRIVATE_queryToTarget(t);
            return this.indexManager.getIndexType(e, n).next((r => 0 /* IndexType.NONE */ === r ? null : (null !== t.limit && 1 /* IndexType.PARTIAL */ === r && (
            // We cannot apply a limit for targets that are served using a partial
            // index. If a partial index will be used to serve the target, the
            // query may return a superset of documents that match the target
            // (e.g. if the index doesn't include all the target's filters), or
            // may return the correct set of documents in the wrong order (e.g. if
            // the index doesn't include a segment for one of the orderBys).
            // Therefore, a limit should not be applied in such cases.
            t = __PRIVATE_queryWithLimit(t, null, "F" /* LimitType.First */), n = __PRIVATE_queryToTarget(t)), 
            this.indexManager.getDocumentsMatchingTarget(e, n).next((r => {
                const i = __PRIVATE_documentKeySet(...r);
                return this.As.getDocuments(e, i).next((r => this.indexManager.getMinOffset(e, n).next((n => {
                    const s = this.ps(t, r);
                    return this.ys(t, s, i, n.readTime) ? this.Rs(e, __PRIVATE_queryWithLimit(t, null, "F" /* LimitType.First */)) : this.ws(e, s, t, n);
                }))));
            })))));
        }
        /**
         * Performs a query based on the target's persisted query mapping. Returns
         * `null` if the mapping is not available or cannot be used.
         */    Vs(e, t, n, r) {
            return __PRIVATE_queryMatchesAllDocuments(t) || r.isEqual(SnapshotVersion.min()) ? PersistencePromise.resolve(null) : this.As.getDocuments(e, n).next((i => {
                const s = this.ps(t, i);
                return this.ys(t, s, n, r) ? PersistencePromise.resolve(null) : (__PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "Re-using previous result from %s to execute query: %s", r.toString(), __PRIVATE_stringifyQuery(t)), 
                this.ws(e, s, t, __PRIVATE_newIndexOffsetSuccessorFromReadTime(r, B)).next((e => e)));
            }));
            // Queries that have never seen a snapshot without limbo free documents
            // should also be run as a full collection scan.
            }
        /** Applies the query filter and sorting to the provided documents.  */    ps(e, t) {
            // Sort the documents and re-apply the query filter since previously
            // matching documents do not necessarily still match the query.
            let n = new SortedSet(__PRIVATE_newQueryComparator(e));
            return t.forEach(((t, r) => {
                __PRIVATE_queryMatches(e, r) && (n = n.add(r));
            })), n;
        }
        /**
         * Determines if a limit query needs to be refilled from cache, making it
         * ineligible for index-free execution.
         *
         * @param query - The query.
         * @param sortedPreviousResults - The documents that matched the query when it
         * was last synchronized, sorted by the query's comparator.
         * @param remoteKeys - The document keys that matched the query at the last
         * snapshot.
         * @param limboFreeSnapshotVersion - The version of the snapshot when the
         * query was last synchronized.
         */    ys(e, t, n, r) {
            if (null === e.limit) 
            // Queries without limits do not need to be refilled.
            return false;
            if (n.size !== t.size) 
            // The query needs to be refilled if a previously matching document no
            // longer matches.
            return true;
            // Limit queries are not eligible for index-free query execution if there is
            // a potential that an older document from cache now sorts before a document
            // that was previously part of the limit. This, however, can only happen if
            // the document at the edge of the limit goes out of limit.
            // If a document that is not the limit boundary sorts differently,
            // the boundary of the limit itself did not change and documents from cache
            // will continue to be "rejected" by this boundary. Therefore, we can ignore
            // any modifications that don't affect the last document.
                    const i = "F" /* LimitType.First */ === e.limitType ? t.last() : t.first();
            return !!i && (i.hasPendingWrites || i.version.compareTo(r) > 0);
        }
        fs(e, t, n) {
            return __PRIVATE_getLogLevel() <= LogLevel.DEBUG && __PRIVATE_logDebug("QueryEngine", "Using full collection scan to execute query:", __PRIVATE_stringifyQuery(t)), 
            this.As.getDocumentsMatchingQuery(e, t, IndexOffset.min(), n);
        }
        /**
         * Combines the results from an indexed execution with the remaining documents
         * that have not yet been indexed.
         */    ws(e, t, n, r) {
            // Retrieve all results for documents that were updated since the offset.
            return this.As.getDocumentsMatchingQuery(e, n, r).next((e => (
            // Merge with existing results
            t.forEach((t => {
                e = e.insert(t.key, t);
            })), e)));
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const Nt = "LocalStore";

    /**
     * The maximum time to leave a resume token buffered without writing it out.
     * This value is arbitrary: it's long enough to avoid several writes
     * (possibly indefinitely if updates come more frequently than this) but
     * short enough that restarting after crashing will still have a pretty
     * recent resume token.
     */
    /**
     * Implements `LocalStore` interface.
     *
     * Note: some field defined in this class might have public access level, but
     * the class is not exported so they are only accessible from this module.
     * This is useful to implement optional features (like bundles) in free
     * functions, such that they are tree-shakeable.
     */
    class __PRIVATE_LocalStoreImpl {
        constructor(
        /** Manages our in-memory or durable persistence. */
        e, t, n, r) {
            this.persistence = e, this.bs = t, this.serializer = r, 
            /**
             * Maps a targetID to data about its target.
             *
             * PORTING NOTE: We are using an immutable data structure on Web to make re-runs
             * of `applyRemoteEvent()` idempotent.
             */
            this.Ss = new SortedMap(__PRIVATE_primitiveComparator), 
            /** Maps a target to its targetID. */
            // TODO(wuandy): Evaluate if TargetId can be part of Target.
            this.Ds = new ObjectMap((e => __PRIVATE_canonifyTarget(e)), __PRIVATE_targetEquals), 
            /**
             * A per collection group index of the last read time processed by
             * `getNewDocumentChanges()`.
             *
             * PORTING NOTE: This is only used for multi-tab synchronization.
             */
            this.vs = new Map, this.Cs = e.getRemoteDocumentCache(), this.ai = e.getTargetCache(), 
            this.ci = e.getBundleCache(), this.Fs(n);
        }
        Fs(e) {
            // TODO(indexing): Add spec tests that test these components change after a
            // user change
            this.documentOverlayCache = this.persistence.getDocumentOverlayCache(e), this.indexManager = this.persistence.getIndexManager(e), 
            this.mutationQueue = this.persistence.getMutationQueue(e, this.indexManager), this.localDocuments = new LocalDocumentsView(this.Cs, this.mutationQueue, this.documentOverlayCache, this.indexManager), 
            this.Cs.setIndexManager(this.indexManager), this.bs.initialize(this.localDocuments, this.indexManager);
        }
        collectGarbage(e) {
            return this.persistence.runTransaction("Collect garbage", "readwrite-primary", (t => e.collect(t, this.Ss)));
        }
    }

    function __PRIVATE_newLocalStore(
    /** Manages our in-memory or durable persistence. */
    e, t, n, r) {
        return new __PRIVATE_LocalStoreImpl(e, t, n, r);
    }

    /**
     * Tells the LocalStore that the currently authenticated user has changed.
     *
     * In response the local store switches the mutation queue to the new user and
     * returns any resulting document changes.
     */
    // PORTING NOTE: Android and iOS only return the documents affected by the
    // change.
    async function __PRIVATE_localStoreHandleUserChange(e, t) {
        const n = __PRIVATE_debugCast(e);
        return await n.persistence.runTransaction("Handle user change", "readonly", (e => {
            // Swap out the mutation queue, grabbing the pending mutation batches
            // before and after.
            let r;
            return n.mutationQueue.getAllMutationBatches(e).next((i => (r = i, n.Fs(t), n.mutationQueue.getAllMutationBatches(e)))).next((t => {
                const i = [], s = [];
                // Union the old/new changed keys.
                let o = __PRIVATE_documentKeySet();
                for (const e of r) {
                    i.push(e.batchId);
                    for (const t of e.mutations) o = o.add(t.key);
                }
                for (const e of t) {
                    s.push(e.batchId);
                    for (const t of e.mutations) o = o.add(t.key);
                }
                // Return the set of all (potentially) changed documents and the list
                // of mutation batch IDs that were affected by change.
                            return n.localDocuments.getDocuments(e, o).next((e => ({
                    Ms: e,
                    removedBatchIds: i,
                    addedBatchIds: s
                })));
            }));
        }));
    }

    /* Accepts locally generated Mutations and commit them to storage. */
    /**
     * Acknowledges the given batch.
     *
     * On the happy path when a batch is acknowledged, the local store will
     *
     *  + remove the batch from the mutation queue;
     *  + apply the changes to the remote document cache;
     *  + recalculate the latency compensated view implied by those changes (there
     *    may be mutations in the queue that affect the documents but haven't been
     *    acknowledged yet); and
     *  + give the changed documents back the sync engine
     *
     * @returns The resulting (modified) documents.
     */
    function __PRIVATE_localStoreAcknowledgeBatch(e, t) {
        const n = __PRIVATE_debugCast(e);
        return n.persistence.runTransaction("Acknowledge batch", "readwrite-primary", (e => {
            const r = t.batch.keys(), i = n.Cs.newChangeBuffer({
                trackRemovals: true
            });
            return function __PRIVATE_applyWriteToRemoteDocuments(e, t, n, r) {
                const i = n.batch, s = i.keys();
                let o = PersistencePromise.resolve();
                return s.forEach((e => {
                    o = o.next((() => r.getEntry(t, e))).next((t => {
                        const s = n.docVersions.get(e);
                        __PRIVATE_hardAssert(null !== s, 48541), t.version.compareTo(s) < 0 && (i.applyToRemoteDocument(t, n), 
                        t.isValidDocument() && (
                        // We use the commitVersion as the readTime rather than the
                        // document's updateTime since the updateTime is not advanced
                        // for updates that do not modify the underlying document.
                        t.setReadTime(n.commitVersion), r.addEntry(t)));
                    }));
                })), o.next((() => e.mutationQueue.removeMutationBatch(t, i)));
            }
            /** Returns the local view of the documents affected by a mutation batch. */
            // PORTING NOTE: Multi-Tab only.
            (n, e, t, i).next((() => i.apply(e))).next((() => n.mutationQueue.performConsistencyCheck(e))).next((() => n.documentOverlayCache.removeOverlaysForBatchId(e, r, t.batch.batchId))).next((() => n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e, function __PRIVATE_getKeysWithTransformResults(e) {
                let t = __PRIVATE_documentKeySet();
                for (let n = 0; n < e.mutationResults.length; ++n) {
                    e.mutationResults[n].transformResults.length > 0 && (t = t.add(e.batch.mutations[n].key));
                }
                return t;
            }
            /**
     * Removes mutations from the MutationQueue for the specified batch;
     * LocalDocuments will be recalculated.
     *
     * @returns The resulting modified documents.
     */ (t)))).next((() => n.localDocuments.getDocuments(e, r)));
        }));
    }

    /**
     * Returns the last consistent snapshot processed (used by the RemoteStore to
     * determine whether to buffer incoming snapshots from the backend).
     */
    function __PRIVATE_localStoreGetLastRemoteSnapshotVersion(e) {
        const t = __PRIVATE_debugCast(e);
        return t.persistence.runTransaction("Get last remote snapshot version", "readonly", (e => t.ai.getLastRemoteSnapshotVersion(e)));
    }

    /**
     * Gets the mutation batch after the passed in batchId in the mutation queue
     * or null if empty.
     * @param afterBatchId - If provided, the batch to search after.
     * @returns The next mutation or null if there wasn't one.
     */
    function __PRIVATE_localStoreGetNextMutationBatch(e, t) {
        const n = __PRIVATE_debugCast(e);
        return n.persistence.runTransaction("Get next mutation batch", "readonly", (e => (void 0 === t && (t = $), 
        n.mutationQueue.getNextMutationBatchAfterBatchId(e, t))));
    }

    /**
     * Metadata state of the local client. Unlike `RemoteClientState`, this class is
     * mutable and keeps track of all pending mutations, which allows us to
     * update the range of pending mutation batch IDs as new mutations are added or
     * removed.
     *
     * The data in `LocalClientState` is not read from WebStorage and instead
     * updated via its instance methods. The updated state can be serialized via
     * `toWebStorageJSON()`.
     */
    // Visible for testing.
    class __PRIVATE_LocalClientState {
        constructor() {
            this.activeTargetIds = __PRIVATE_targetIdSet();
        }
        $s(e) {
            this.activeTargetIds = this.activeTargetIds.add(e);
        }
        Us(e) {
            this.activeTargetIds = this.activeTargetIds.delete(e);
        }
        /**
         * Converts this entry into a JSON-encoded format we can use for WebStorage.
         * Does not encode `clientId` as it is part of the key in WebStorage.
         */    Qs() {
            const e = {
                activeTargetIds: this.activeTargetIds.toArray(),
                updateTimeMs: Date.now()
            };
            return JSON.stringify(e);
        }
    }

    class __PRIVATE_MemorySharedClientState {
        constructor() {
            this.So = new __PRIVATE_LocalClientState, this.Do = {}, this.onlineStateHandler = null, 
            this.sequenceNumberHandler = null;
        }
        addPendingMutation(e) {
            // No op.
        }
        updateMutationState(e, t, n) {
            // No op.
        }
        addLocalQueryTarget(e, t = true) {
            return t && this.So.$s(e), this.Do[e] || "not-current";
        }
        updateQueryState(e, t, n) {
            this.Do[e] = t;
        }
        removeLocalQueryTarget(e) {
            this.So.Us(e);
        }
        isLocalQueryTarget(e) {
            return this.So.activeTargetIds.has(e);
        }
        clearQueryState(e) {
            delete this.Do[e];
        }
        getAllActiveQueryTargets() {
            return this.So.activeTargetIds;
        }
        isActiveQueryTarget(e) {
            return this.So.activeTargetIds.has(e);
        }
        start() {
            return this.So = new __PRIVATE_LocalClientState, Promise.resolve();
        }
        handleUserChange(e, t, n) {
            // No op.
        }
        setOnlineState(e) {
            // No op.
        }
        shutdown() {}
        writeSequenceNumber(e) {}
        notifyBundleLoaded(e) {
            // No op.
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ class __PRIVATE_NoopConnectivityMonitor {
        vo(e) {
            // No-op.
        }
        shutdown() {
            // No-op.
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // References to `window` are guarded by BrowserConnectivityMonitor.isAvailable()
    /* eslint-disable no-restricted-globals */ const $t = "ConnectivityMonitor";

    /**
     * Browser implementation of ConnectivityMonitor.
     */ class __PRIVATE_BrowserConnectivityMonitor {
        constructor() {
            this.Co = () => this.Fo(), this.Mo = () => this.xo(), this.Oo = [], this.No();
        }
        vo(e) {
            this.Oo.push(e);
        }
        shutdown() {
            window.removeEventListener("online", this.Co), window.removeEventListener("offline", this.Mo);
        }
        No() {
            window.addEventListener("online", this.Co), window.addEventListener("offline", this.Mo);
        }
        Fo() {
            __PRIVATE_logDebug($t, "Network connectivity changed: AVAILABLE");
            for (const e of this.Oo) e(0 /* NetworkStatus.AVAILABLE */);
        }
        xo() {
            __PRIVATE_logDebug($t, "Network connectivity changed: UNAVAILABLE");
            for (const e of this.Oo) e(1 /* NetworkStatus.UNAVAILABLE */);
        }
        // TODO(chenbrian): Consider passing in window either into this component or
        // here for testing via FakeWindow.
        /** Checks that all used attributes of window are available. */
        static C() {
            return "undefined" != typeof window && void 0 !== window.addEventListener && void 0 !== window.removeEventListener;
        }
    }

    /**
     * @license
     * Copyright 2023 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The value returned from the most recent invocation of
     * `generateUniqueDebugId()`, or null if it has never been invoked.
     */ let Ut = null;

    /**
     * Generates and returns an initial value for `lastUniqueDebugId`.
     *
     * The returned value is randomly selected from a range of integers that are
     * represented as 8 hexadecimal digits. This means that (within reason) any
     * numbers generated by incrementing the returned number by 1 will also be
     * represented by 8 hexadecimal digits. This leads to all "IDs" having the same
     * length when converted to a hexadecimal string, making reading logs containing
     * these IDs easier to follow. And since the return value is randomly selected
     * it will help to differentiate between logs from different executions.
     */
    /**
     * Generates and returns a unique ID as a hexadecimal string.
     *
     * The returned ID is intended to be used in debug logging messages to help
     * correlate log messages that may be spatially separated in the logs, but
     * logically related. For example, a network connection could include the same
     * "debug ID" string in all of its log messages to help trace a specific
     * connection over time.
     *
     * @return the 10-character generated ID (e.g. "0xa1b2c3d4").
     */
    function __PRIVATE_generateUniqueDebugId() {
        return null === Ut ? Ut = function __PRIVATE_generateInitialUniqueDebugId() {
            return 268435456 + Math.round(2147483648 * Math.random());
        }() : Ut++, "0x" + Ut.toString(16);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const Kt = "RestConnection", Wt = {
        BatchGetDocuments: "batchGet",
        Commit: "commit",
        RunQuery: "runQuery",
        RunAggregationQuery: "runAggregationQuery"
    };

    /**
     * Maps RPC names to the corresponding REST endpoint name.
     *
     * We use array notation to avoid mangling.
     */
    /**
     * Base class for all Rest-based connections to the backend (WebChannel and
     * HTTP).
     */
    class __PRIVATE_RestConnection {
        get Bo() {
            // Both `invokeRPC()` and `invokeStreamingRPC()` use their `path` arguments to determine
            // where to run the query, and expect the `request` to NOT specify the "path".
            return false;
        }
        constructor(e) {
            this.databaseInfo = e, this.databaseId = e.databaseId;
            const t = e.ssl ? "https" : "http", n = encodeURIComponent(this.databaseId.projectId), r = encodeURIComponent(this.databaseId.database);
            this.Lo = t + "://" + e.host, this.ko = `projects/${n}/databases/${r}`, this.qo = this.databaseId.database === it ? `project_id=${n}` : `project_id=${n}&database_id=${r}`;
        }
        Qo(e, t, n, r, i) {
            const s = __PRIVATE_generateUniqueDebugId(), o = this.$o(e, t.toUriEncodedString());
            __PRIVATE_logDebug(Kt, `Sending RPC '${e}' ${s}:`, o, n);
            const _ = {
                "google-cloud-resource-prefix": this.ko,
                "x-goog-request-params": this.qo
            };
            return this.Uo(_, r, i), this.Ko(e, o, _, n).then((t => (__PRIVATE_logDebug(Kt, `Received RPC '${e}' ${s}: `, t), 
            t)), (t => {
                throw __PRIVATE_logWarn(Kt, `RPC '${e}' ${s} failed with error: `, t, "url: ", o, "request:", n), 
                t;
            }));
        }
        Wo(e, t, n, r, i, s) {
            // The REST API automatically aggregates all of the streamed results, so we
            // can just use the normal invoke() method.
            return this.Qo(e, t, n, r, i);
        }
        /**
         * Modifies the headers for a request, adding any authorization token if
         * present and any additional headers for the request.
         */    Uo(e, t, n) {
            e["X-Goog-Api-Client"] = 
            // SDK_VERSION is updated to different value at runtime depending on the entry point,
            // so we need to get its value when we need it in a function.
            function __PRIVATE_getGoogApiClientValue() {
                return "gl-js/ fire/" + v;
            }(), 
            // Content-Type: text/plain will avoid preflight requests which might
            // mess with CORS and redirects by proxies. If we add custom headers
            // we will need to change this code to potentially use the $httpOverwrite
            // parameter supported by ESF to avoid triggering preflight requests.
            e["Content-Type"] = "text/plain", this.databaseInfo.appId && (e["X-Firebase-GMPID"] = this.databaseInfo.appId), 
            t && t.headers.forEach(((t, n) => e[n] = t)), n && n.headers.forEach(((t, n) => e[n] = t));
        }
        $o(e, t) {
            const n = Wt[e];
            return `${this.Lo}/v1/${t}:${n}`;
        }
        /**
         * Closes and cleans up any resources associated with the connection. This
         * implementation is a no-op because there are no resources associated
         * with the RestConnection that need to be cleaned up.
         */    terminate() {
            // No-op
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provides a simple helper class that implements the Stream interface to
     * bridge to other implementations that are streams but do not implement the
     * interface. The stream callbacks are invoked with the callOn... methods.
     */ class __PRIVATE_StreamBridge {
        constructor(e) {
            this.Go = e.Go, this.zo = e.zo;
        }
        jo(e) {
            this.Ho = e;
        }
        Jo(e) {
            this.Yo = e;
        }
        Zo(e) {
            this.Xo = e;
        }
        onMessage(e) {
            this.e_ = e;
        }
        close() {
            this.zo();
        }
        send(e) {
            this.Go(e);
        }
        t_() {
            this.Ho();
        }
        n_() {
            this.Yo();
        }
        r_(e) {
            this.Xo(e);
        }
        i_(e) {
            this.e_(e);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const Gt = "WebChannelConnection";

    class __PRIVATE_WebChannelConnection extends __PRIVATE_RestConnection {
        constructor(e) {
            super(e), this.forceLongPolling = e.forceLongPolling, this.autoDetectLongPolling = e.autoDetectLongPolling, 
            this.useFetchStreams = e.useFetchStreams, this.longPollingOptions = e.longPollingOptions;
        }
        Ko(e, t, n, r) {
            const i = __PRIVATE_generateUniqueDebugId();
            return new Promise(((s, o) => {
                const _ = new XhrIo;
                _.setWithCredentials(true), _.listenOnce(EventType.COMPLETE, (() => {
                    try {
                        switch (_.getLastErrorCode()) {
                          case ErrorCode.NO_ERROR:
                            const t = _.getResponseJson();
                            __PRIVATE_logDebug(Gt, `XHR for RPC '${e}' ${i} received:`, JSON.stringify(t)), 
                            s(t);
                            break;

                          case ErrorCode.TIMEOUT:
                            __PRIVATE_logDebug(Gt, `RPC '${e}' ${i} timed out`), o(new FirestoreError(F.DEADLINE_EXCEEDED, "Request time out"));
                            break;

                          case ErrorCode.HTTP_ERROR:
                            const n = _.getStatus();
                            if (__PRIVATE_logDebug(Gt, `RPC '${e}' ${i} failed with status:`, n, "response text:", _.getResponseText()), 
                            n > 0) {
                                let e = _.getResponseJson();
                                Array.isArray(e) && (e = e[0]);
                                const t = null == e ? void 0 : e.error;
                                if (t && t.status && t.message) {
                                    const e = function __PRIVATE_mapCodeFromHttpResponseErrorStatus(e) {
                                        const t = e.toLowerCase().replace(/_/g, "-");
                                        return Object.values(F).indexOf(t) >= 0 ? t : F.UNKNOWN;
                                    }(t.status);
                                    o(new FirestoreError(e, t.message));
                                } else o(new FirestoreError(F.UNKNOWN, "Server responded with status " + _.getStatus()));
                            } else 
                            // If we received an HTTP_ERROR but there's no status code,
                            // it's most probably a connection issue
                            o(new FirestoreError(F.UNAVAILABLE, "Connection failed."));
                            break;

                          default:
                            fail(9055, {
                                s_: e,
                                streamId: i,
                                o_: _.getLastErrorCode(),
                                __: _.getLastError()
                            });
                        }
                    } finally {
                        __PRIVATE_logDebug(Gt, `RPC '${e}' ${i} completed.`);
                    }
                }));
                const a = JSON.stringify(r);
                __PRIVATE_logDebug(Gt, `RPC '${e}' ${i} sending request:`, r), _.send(t, "POST", a, n, 15);
            }));
        }
        a_(e, t, n) {
            const r = __PRIVATE_generateUniqueDebugId(), i = [ this.Lo, "/", "google.firestore.v1.Firestore", "/", e, "/channel" ], s = createWebChannelTransport(), o = getStatEventTarget(), _ = {
                // Required for backend stickiness, routing behavior is based on this
                // parameter.
                httpSessionIdParam: "gsessionid",
                initMessageHeaders: {},
                messageUrlParams: {
                    // This param is used to improve routing and project isolation by the
                    // backend and must be included in every request.
                    database: `projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`
                },
                sendRawJson: true,
                supportsCrossDomainXhr: true,
                internalChannelParams: {
                    // Override the default timeout (randomized between 10-20 seconds) since
                    // a large write batch on a slow internet connection may take a long
                    // time to send to the backend. Rather than have WebChannel impose a
                    // tight timeout which could lead to infinite timeouts and retries, we
                    // set it very large (5-10 minutes) and rely on the browser's builtin
                    // timeouts to kick in if the request isn't working.
                    forwardChannelRequestTimeoutMs: 6e5
                },
                forceLongPolling: this.forceLongPolling,
                detectBufferingProxy: this.autoDetectLongPolling
            }, a = this.longPollingOptions.timeoutSeconds;
            void 0 !== a && (_.longPollingTimeout = Math.round(1e3 * a)), this.useFetchStreams && (_.useFetchStreams = true), 
            this.Uo(_.initMessageHeaders, t, n), 
            // Sending the custom headers we just added to request.initMessageHeaders
            // (Authorization, etc.) will trigger the browser to make a CORS preflight
            // request because the XHR will no longer meet the criteria for a "simple"
            // CORS request:
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#Simple_requests
            // Therefore to avoid the CORS preflight request (an extra network
            // roundtrip), we use the encodeInitMessageHeaders option to specify that
            // the headers should instead be encoded in the request's POST payload,
            // which is recognized by the webchannel backend.
            _.encodeInitMessageHeaders = true;
            const u = i.join("");
            __PRIVATE_logDebug(Gt, `Creating RPC '${e}' stream ${r}: ${u}`, _);
            const c = s.createWebChannel(u, _);
            // WebChannel supports sending the first message with the handshake - saving
            // a network round trip. However, it will have to call send in the same
            // JS event loop as open. In order to enforce this, we delay actually
            // opening the WebChannel until send is called. Whether we have called
            // open is tracked with this variable.
                    let l = false, h = false;
            // A flag to determine whether the stream was closed (by us or through an
            // error/close event) to avoid delivering multiple close events or sending
            // on a closed stream
                    const P = new __PRIVATE_StreamBridge({
                Go: t => {
                    h ? __PRIVATE_logDebug(Gt, `Not sending because RPC '${e}' stream ${r} is closed:`, t) : (l || (__PRIVATE_logDebug(Gt, `Opening RPC '${e}' stream ${r} transport.`), 
                    c.open(), l = true), __PRIVATE_logDebug(Gt, `RPC '${e}' stream ${r} sending:`, t), 
                    c.send(t));
                },
                zo: () => c.close()
            }), __PRIVATE_unguardedEventListen = (e, t, n) => {
                // TODO(dimond): closure typing seems broken because WebChannel does
                // not implement goog.events.Listenable
                e.listen(t, (e => {
                    try {
                        n(e);
                    } catch (e) {
                        setTimeout((() => {
                            throw e;
                        }), 0);
                    }
                }));
            };
            // Closure events are guarded and exceptions are swallowed, so catch any
            // exception and rethrow using a setTimeout so they become visible again.
            // Note that eventually this function could go away if we are confident
            // enough the code is exception free.
                    return __PRIVATE_unguardedEventListen(c, WebChannel.EventType.OPEN, (() => {
                h || (__PRIVATE_logDebug(Gt, `RPC '${e}' stream ${r} transport opened.`), P.t_());
            })), __PRIVATE_unguardedEventListen(c, WebChannel.EventType.CLOSE, (() => {
                h || (h = !0, __PRIVATE_logDebug(Gt, `RPC '${e}' stream ${r} transport closed`), 
                P.r_());
            })), __PRIVATE_unguardedEventListen(c, WebChannel.EventType.ERROR, (t => {
                h || (h = !0, __PRIVATE_logWarn(Gt, `RPC '${e}' stream ${r} transport errored. Name:`, t.name, "Message:", t.message), 
                P.r_(new FirestoreError(F.UNAVAILABLE, "The operation could not be completed")));
            })), __PRIVATE_unguardedEventListen(c, WebChannel.EventType.MESSAGE, (t => {
                var n;
                if (!h) {
                    const i = t.data[0];
                    __PRIVATE_hardAssert(!!i, 16349);
                    // TODO(b/35143891): There is a bug in One Platform that caused errors
                    // (and only errors) to be wrapped in an extra array. To be forward
                    // compatible with the bug we need to check either condition. The latter
                    // can be removed once the fix has been rolled out.
                    // Use any because msgData.error is not typed.
                    const s = i, o = (null == s ? void 0 : s.error) || (null === (n = s[0]) || void 0 === n ? void 0 : n.error);
                    if (o) {
                        __PRIVATE_logDebug(Gt, `RPC '${e}' stream ${r} received error:`, o);
                        // error.status will be a string like 'OK' or 'NOT_FOUND'.
                        const t = o.status;
                        let n = 
                        /**
     * Maps an error Code from a GRPC status identifier like 'NOT_FOUND'.
     *
     * @returns The Code equivalent to the given status string or undefined if
     *     there is no match.
     */
                        function __PRIVATE_mapCodeFromRpcStatus(e) {
                            // lookup by string
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const t = dt[e];
                            if (void 0 !== t) return __PRIVATE_mapCodeFromRpcCode(t);
                        }(t), i = o.message;
                        void 0 === n && (n = F.INTERNAL, i = "Unknown error status: " + t + " with message " + o.message), 
                        // Mark closed so no further events are propagated
                        h = !0, P.r_(new FirestoreError(n, i)), c.close();
                    } else __PRIVATE_logDebug(Gt, `RPC '${e}' stream ${r} received:`, i), P.i_(i);
                }
            })), __PRIVATE_unguardedEventListen(o, Event.STAT_EVENT, (t => {
                t.stat === Stat.PROXY ? __PRIVATE_logDebug(Gt, `RPC '${e}' stream ${r} detected buffering proxy`) : t.stat === Stat.NOPROXY && __PRIVATE_logDebug(Gt, `RPC '${e}' stream ${r} detected no buffering proxy`);
            })), setTimeout((() => {
                // Technically we could/should wait for the WebChannel opened event,
                // but because we want to send the first message with the WebChannel
                // handshake we pretend the channel opened here (asynchronously), and
                // then delay the actual open until the first message is sent.
                P.n_();
            }), 0), P;
        }
    }

    /** The Platform's 'document' implementation or null if not available. */ function getDocument() {
        // `document` is not always available, e.g. in ReactNative and WebWorkers.
        // eslint-disable-next-line no-restricted-globals
        return "undefined" != typeof document ? document : null;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ function __PRIVATE_newSerializer(e) {
        return new JsonProtoSerializer(e, /* useProto3Json= */ true);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A helper for running delayed tasks following an exponential backoff curve
     * between attempts.
     *
     * Each delay is made up of a "base" delay which follows the exponential
     * backoff curve, and a +/- 50% "jitter" that is calculated and added to the
     * base delay. This prevents clients from accidentally synchronizing their
     * delays causing spikes of load to the backend.
     */
    class __PRIVATE_ExponentialBackoff {
        constructor(
        /**
         * The AsyncQueue to run backoff operations on.
         */
        e, 
        /**
         * The ID to use when scheduling backoff operations on the AsyncQueue.
         */
        t, 
        /**
         * The initial delay (used as the base delay on the first retry attempt).
         * Note that jitter will still be applied, so the actual delay could be as
         * little as 0.5*initialDelayMs.
         */
        n = 1e3
        /**
         * The multiplier to use to determine the extended base delay after each
         * attempt.
         */ , r = 1.5
        /**
         * The maximum base delay after which no further backoff is performed.
         * Note that jitter will still be applied, so the actual delay could be as
         * much as 1.5*maxDelayMs.
         */ , i = 6e4) {
            this.bi = e, this.timerId = t, this.u_ = n, this.c_ = r, this.l_ = i, this.h_ = 0, 
            this.P_ = null, 
            /** The last backoff attempt, as epoch milliseconds. */
            this.T_ = Date.now(), this.reset();
        }
        /**
         * Resets the backoff delay.
         *
         * The very next backoffAndWait() will have no delay. If it is called again
         * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
         * subsequent ones will increase according to the backoffFactor.
         */    reset() {
            this.h_ = 0;
        }
        /**
         * Resets the backoff delay to the maximum delay (e.g. for use after a
         * RESOURCE_EXHAUSTED error).
         */    I_() {
            this.h_ = this.l_;
        }
        /**
         * Returns a promise that resolves after currentDelayMs, and increases the
         * delay for any subsequent attempts. If there was a pending backoff operation
         * already, it will be canceled.
         */    E_(e) {
            // Cancel any pending backoff operation.
            this.cancel();
            // First schedule using the current base (which may be 0 and should be
            // honored as such).
            const t = Math.floor(this.h_ + this.d_()), n = Math.max(0, Date.now() - this.T_), r = Math.max(0, t - n);
            // Guard against lastAttemptTime being in the future due to a clock change.
                    r > 0 && __PRIVATE_logDebug("ExponentialBackoff", `Backing off for ${r} ms (base delay: ${this.h_} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`), 
            this.P_ = this.bi.enqueueAfterDelay(this.timerId, r, (() => (this.T_ = Date.now(), 
            e()))), 
            // Apply backoff factor to determine next delay and ensure it is within
            // bounds.
            this.h_ *= this.c_, this.h_ < this.u_ && (this.h_ = this.u_), this.h_ > this.l_ && (this.h_ = this.l_);
        }
        A_() {
            null !== this.P_ && (this.P_.skipDelay(), this.P_ = null);
        }
        cancel() {
            null !== this.P_ && (this.P_.cancel(), this.P_ = null);
        }
        /** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */    d_() {
            return (Math.random() - .5) * this.h_;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const zt = "PersistentStream";

    /** The time a stream stays open after it is marked idle. */
    /**
     * A PersistentStream is an abstract base class that represents a streaming RPC
     * to the Firestore backend. It's built on top of the connections own support
     * for streaming RPCs, and adds several critical features for our clients:
     *
     *   - Exponential backoff on failure
     *   - Authentication via CredentialsProvider
     *   - Dispatching all callbacks into the shared worker queue
     *   - Closing idle streams after 60 seconds of inactivity
     *
     * Subclasses of PersistentStream implement serialization of models to and
     * from the JSON representation of the protocol buffers for a specific
     * streaming RPC.
     *
     * ## Starting and Stopping
     *
     * Streaming RPCs are stateful and need to be start()ed before messages can
     * be sent and received. The PersistentStream will call the onOpen() function
     * of the listener once the stream is ready to accept requests.
     *
     * Should a start() fail, PersistentStream will call the registered onClose()
     * listener with a FirestoreError indicating what went wrong.
     *
     * A PersistentStream can be started and stopped repeatedly.
     *
     * Generic types:
     *  SendType: The type of the outgoing message of the underlying
     *    connection stream
     *  ReceiveType: The type of the incoming message of the underlying
     *    connection stream
     *  ListenerType: The type of the listener that will be used for callbacks
     */
    class __PRIVATE_PersistentStream {
        constructor(e, t, n, r, i, s, o, _) {
            this.bi = e, this.R_ = n, this.V_ = r, this.connection = i, this.authCredentialsProvider = s, 
            this.appCheckCredentialsProvider = o, this.listener = _, this.state = 0 /* PersistentStreamState.Initial */ , 
            /**
             * A close count that's incremented every time the stream is closed; used by
             * getCloseGuardedDispatcher() to invalidate callbacks that happen after
             * close.
             */
            this.m_ = 0, this.f_ = null, this.g_ = null, this.stream = null, 
            /**
             * Count of response messages received.
             */
            this.p_ = 0, this.y_ = new __PRIVATE_ExponentialBackoff(e, t);
        }
        /**
         * Returns true if start() has been called and no error has occurred. True
         * indicates the stream is open or in the process of opening (which
         * encompasses respecting backoff, getting auth tokens, and starting the
         * actual RPC). Use isOpen() to determine if the stream is open and ready for
         * outbound requests.
         */    w_() {
            return 1 /* PersistentStreamState.Starting */ === this.state || 5 /* PersistentStreamState.Backoff */ === this.state || this.b_();
        }
        /**
         * Returns true if the underlying RPC is open (the onOpen() listener has been
         * called) and the stream is ready for outbound requests.
         */    b_() {
            return 2 /* PersistentStreamState.Open */ === this.state || 3 /* PersistentStreamState.Healthy */ === this.state;
        }
        /**
         * Starts the RPC. Only allowed if isStarted() returns false. The stream is
         * not immediately ready for use: onOpen() will be invoked when the RPC is
         * ready for outbound requests, at which point isOpen() will return true.
         *
         * When start returns, isStarted() will return true.
         */    start() {
            this.p_ = 0, 4 /* PersistentStreamState.Error */ !== this.state ? this.auth() : this.S_();
        }
        /**
         * Stops the RPC. This call is idempotent and allowed regardless of the
         * current isStarted() state.
         *
         * When stop returns, isStarted() and isOpen() will both return false.
         */    async stop() {
            this.w_() && await this.close(0 /* PersistentStreamState.Initial */);
        }
        /**
         * After an error the stream will usually back off on the next attempt to
         * start it. If the error warrants an immediate restart of the stream, the
         * sender can use this to indicate that the receiver should not back off.
         *
         * Each error will call the onClose() listener. That function can decide to
         * inhibit backoff if required.
         */    D_() {
            this.state = 0 /* PersistentStreamState.Initial */ , this.y_.reset();
        }
        /**
         * Marks this stream as idle. If no further actions are performed on the
         * stream for one minute, the stream will automatically close itself and
         * notify the stream's onClose() handler with Status.OK. The stream will then
         * be in a !isStarted() state, requiring the caller to start the stream again
         * before further use.
         *
         * Only streams that are in state 'Open' can be marked idle, as all other
         * states imply pending network operations.
         */    v_() {
            // Starts the idle time if we are in state 'Open' and are not yet already
            // running a timer (in which case the previous idle timeout still applies).
            this.b_() && null === this.f_ && (this.f_ = this.bi.enqueueAfterDelay(this.R_, 6e4, (() => this.C_())));
        }
        /** Sends a message to the underlying stream. */    F_(e) {
            this.M_(), this.stream.send(e);
        }
        /** Called by the idle timer when the stream should close due to inactivity. */    async C_() {
            if (this.b_()) 
            // When timing out an idle stream there's no reason to force the stream into backoff when
            // it restarts so set the stream state to Initial instead of Error.
            return this.close(0 /* PersistentStreamState.Initial */);
        }
        /** Marks the stream as active again. */    M_() {
            this.f_ && (this.f_.cancel(), this.f_ = null);
        }
        /** Cancels the health check delayed operation. */    x_() {
            this.g_ && (this.g_.cancel(), this.g_ = null);
        }
        /**
         * Closes the stream and cleans up as necessary:
         *
         * * closes the underlying GRPC stream;
         * * calls the onClose handler with the given 'error';
         * * sets internal stream state to 'finalState';
         * * adjusts the backoff timer based on the error
         *
         * A new stream can be opened by calling start().
         *
         * @param finalState - the intended state of the stream after closing.
         * @param error - the error the connection was closed with.
         */    async close(e, t) {
            // Cancel any outstanding timers (they're guaranteed not to execute).
            this.M_(), this.x_(), this.y_.cancel(), 
            // Invalidates any stream-related callbacks (e.g. from auth or the
            // underlying stream), guaranteeing they won't execute.
            this.m_++, 4 /* PersistentStreamState.Error */ !== e ? 
            // If this is an intentional close ensure we don't delay our next connection attempt.
            this.y_.reset() : t && t.code === F.RESOURCE_EXHAUSTED ? (
            // Log the error. (Probably either 'quota exceeded' or 'max queue length reached'.)
            __PRIVATE_logError(t.toString()), __PRIVATE_logError("Using maximum backoff delay to prevent overloading the backend."), 
            this.y_.I_()) : t && t.code === F.UNAUTHENTICATED && 3 /* PersistentStreamState.Healthy */ !== this.state && (
            // "unauthenticated" error means the token was rejected. This should rarely
            // happen since both Auth and AppCheck ensure a sufficient TTL when we
            // request a token. If a user manually resets their system clock this can
            // fail, however. In this case, we should get a Code.UNAUTHENTICATED error
            // before we received the first message and we need to invalidate the token
            // to ensure that we fetch a new token.
            this.authCredentialsProvider.invalidateToken(), this.appCheckCredentialsProvider.invalidateToken()), 
            // Clean up the underlying stream because we are no longer interested in events.
            null !== this.stream && (this.O_(), this.stream.close(), this.stream = null), 
            // This state must be assigned before calling onClose() to allow the callback to
            // inhibit backoff or otherwise manipulate the state in its non-started state.
            this.state = e, 
            // Notify the listener that the stream closed.
            await this.listener.Zo(t);
        }
        /**
         * Can be overridden to perform additional cleanup before the stream is closed.
         * Calling super.tearDown() is not required.
         */    O_() {}
        auth() {
            this.state = 1 /* PersistentStreamState.Starting */;
            const e = this.N_(this.m_), t = this.m_;
            // TODO(mikelehen): Just use dispatchIfNotClosed, but see TODO below.
                    Promise.all([ this.authCredentialsProvider.getToken(), this.appCheckCredentialsProvider.getToken() ]).then((([e, n]) => {
                // Stream can be stopped while waiting for authentication.
                // TODO(mikelehen): We really should just use dispatchIfNotClosed
                // and let this dispatch onto the queue, but that opened a spec test can
                // of worms that I don't want to deal with in this PR.
                this.m_ === t && 
                // Normally we'd have to schedule the callback on the AsyncQueue.
                // However, the following calls are safe to be called outside the
                // AsyncQueue since they don't chain asynchronous calls
                this.B_(e, n);
            }), (t => {
                e((() => {
                    const e = new FirestoreError(F.UNKNOWN, "Fetching auth token failed: " + t.message);
                    return this.L_(e);
                }));
            }));
        }
        B_(e, t) {
            const n = this.N_(this.m_);
            this.stream = this.k_(e, t), this.stream.jo((() => {
                n((() => this.listener.jo()));
            })), this.stream.Jo((() => {
                n((() => (this.state = 2 /* PersistentStreamState.Open */ , this.g_ = this.bi.enqueueAfterDelay(this.V_, 1e4, (() => (this.b_() && (this.state = 3 /* PersistentStreamState.Healthy */), 
                Promise.resolve()))), this.listener.Jo())));
            })), this.stream.Zo((e => {
                n((() => this.L_(e)));
            })), this.stream.onMessage((e => {
                n((() => 1 == ++this.p_ ? this.q_(e) : this.onNext(e)));
            }));
        }
        S_() {
            this.state = 5 /* PersistentStreamState.Backoff */ , this.y_.E_((async () => {
                this.state = 0 /* PersistentStreamState.Initial */ , this.start();
            }));
        }
        // Visible for tests
        L_(e) {
            // In theory the stream could close cleanly, however, in our current model
            // we never expect this to happen because if we stop a stream ourselves,
            // this callback will never be called. To prevent cases where we retry
            // without a backoff accidentally, we set the stream to error in all cases.
            return __PRIVATE_logDebug(zt, `close with error: ${e}`), this.stream = null, this.close(4 /* PersistentStreamState.Error */ , e);
        }
        /**
         * Returns a "dispatcher" function that dispatches operations onto the
         * AsyncQueue but only runs them if closeCount remains unchanged. This allows
         * us to turn auth / stream callbacks into no-ops if the stream is closed /
         * re-opened, etc.
         */    N_(e) {
            return t => {
                this.bi.enqueueAndForget((() => this.m_ === e ? t() : (__PRIVATE_logDebug(zt, "stream callback skipped by getCloseGuardedDispatcher."), 
                Promise.resolve())));
            };
        }
    }

    /**
     * A Stream that implements the Write RPC.
     *
     * The Write RPC requires the caller to maintain special streamToken
     * state in between calls, to help the server understand which responses the
     * client has processed by the time the next request is made. Every response
     * will contain a streamToken; this value must be passed to the next
     * request.
     *
     * After calling start() on this stream, the next request must be a handshake,
     * containing whatever streamToken is on hand. Once a response to this
     * request is received, all pending mutations may be submitted. When
     * submitting multiple batches of mutations at the same time, it's
     * okay to use the same streamToken for the calls to writeMutations.
     *
     * TODO(b/33271235): Use proto types
     */ class __PRIVATE_PersistentWriteStream extends __PRIVATE_PersistentStream {
        constructor(e, t, n, r, i, s) {
            super(e, "write_stream_connection_backoff" /* TimerId.WriteStreamConnectionBackoff */ , "write_stream_idle" /* TimerId.WriteStreamIdle */ , "health_check_timeout" /* TimerId.HealthCheckTimeout */ , t, n, r, s), 
            this.serializer = i;
        }
        /**
         * Tracks whether or not a handshake has been successfully exchanged and
         * the stream is ready to accept mutations.
         */    get W_() {
            return this.p_ > 0;
        }
        // Override of PersistentStream.start
        start() {
            this.lastStreamToken = void 0, super.start();
        }
        O_() {
            this.W_ && this.G_([]);
        }
        k_(e, t) {
            return this.connection.a_("Write", e, t);
        }
        q_(e) {
            // Always capture the last stream token.
            return __PRIVATE_hardAssert(!!e.streamToken, 31322), this.lastStreamToken = e.streamToken, 
            // The first response is always the handshake response
            __PRIVATE_hardAssert(!e.writeResults || 0 === e.writeResults.length, 55816), this.listener.z_();
        }
        onNext(e) {
            // Always capture the last stream token.
            __PRIVATE_hardAssert(!!e.streamToken, 12678), this.lastStreamToken = e.streamToken, 
            // A successful first write response means the stream is healthy,
            // Note, that we could consider a successful handshake healthy, however,
            // the write itself might be causing an error we want to back off from.
            this.y_.reset();
            const t = __PRIVATE_fromWriteResults(e.writeResults, e.commitTime), n = __PRIVATE_fromVersion(e.commitTime);
            return this.listener.j_(n, t);
        }
        /**
         * Sends an initial streamToken to the server, performing the handshake
         * required to make the StreamingWrite RPC work. Subsequent
         * calls should wait until onHandshakeComplete was called.
         */    H_() {
            // TODO(dimond): Support stream resumption. We intentionally do not set the
            // stream token on the handshake, ignoring any stream token we might have.
            const e = {};
            e.database = __PRIVATE_getEncodedDatabaseId(this.serializer), this.F_(e);
        }
        /** Sends a group of mutations to the Firestore backend to apply. */    G_(e) {
            const t = {
                streamToken: this.lastStreamToken,
                writes: e.map((e => toMutation(this.serializer, e)))
            };
            this.F_(t);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Datastore and its related methods are a wrapper around the external Google
     * Cloud Datastore grpc API, which provides an interface that is more convenient
     * for the rest of the client SDK architecture to consume.
     */ class Datastore {}

    /**
     * An implementation of Datastore that exposes additional state for internal
     * consumption.
     */ class __PRIVATE_DatastoreImpl extends Datastore {
        constructor(e, t, n, r) {
            super(), this.authCredentials = e, this.appCheckCredentials = t, this.connection = n, 
            this.serializer = r, this.J_ = false;
        }
        Y_() {
            if (this.J_) throw new FirestoreError(F.FAILED_PRECONDITION, "The client has already been terminated.");
        }
        /** Invokes the provided RPC with auth and AppCheck tokens. */    Qo(e, t, n, r) {
            return this.Y_(), Promise.all([ this.authCredentials.getToken(), this.appCheckCredentials.getToken() ]).then((([i, s]) => this.connection.Qo(e, __PRIVATE_toResourcePath(t, n), r, i, s))).catch((e => {
                throw "FirebaseError" === e.name ? (e.code === F.UNAUTHENTICATED && (this.authCredentials.invalidateToken(), 
                this.appCheckCredentials.invalidateToken()), e) : new FirestoreError(F.UNKNOWN, e.toString());
            }));
        }
        /** Invokes the provided RPC with streamed results with auth and AppCheck tokens. */    Wo(e, t, n, r, i) {
            return this.Y_(), Promise.all([ this.authCredentials.getToken(), this.appCheckCredentials.getToken() ]).then((([s, o]) => this.connection.Wo(e, __PRIVATE_toResourcePath(t, n), r, s, o, i))).catch((e => {
                throw "FirebaseError" === e.name ? (e.code === F.UNAUTHENTICATED && (this.authCredentials.invalidateToken(), 
                this.appCheckCredentials.invalidateToken()), e) : new FirestoreError(F.UNKNOWN, e.toString());
            }));
        }
        terminate() {
            this.J_ = true, this.connection.terminate();
        }
    }

    // TODO(firestorexp): Make sure there is only one Datastore instance per
    // firestore-exp client.
    /**
     * A component used by the RemoteStore to track the OnlineState (that is,
     * whether or not the client as a whole should be considered to be online or
     * offline), implementing the appropriate heuristics.
     *
     * In particular, when the client is trying to connect to the backend, we
     * allow up to MAX_WATCH_STREAM_FAILURES within ONLINE_STATE_TIMEOUT_MS for
     * a connection to succeed. If we have too many failures or the timeout elapses,
     * then we set the OnlineState to Offline, and the client will behave as if
     * it is offline (get()s will return cached data, etc.).
     */
    class __PRIVATE_OnlineStateTracker {
        constructor(e, t) {
            this.asyncQueue = e, this.onlineStateHandler = t, 
            /** The current OnlineState. */
            this.state = "Unknown" /* OnlineState.Unknown */ , 
            /**
             * A count of consecutive failures to open the stream. If it reaches the
             * maximum defined by MAX_WATCH_STREAM_FAILURES, we'll set the OnlineState to
             * Offline.
             */
            this.Z_ = 0, 
            /**
             * A timer that elapses after ONLINE_STATE_TIMEOUT_MS, at which point we
             * transition from OnlineState.Unknown to OnlineState.Offline without waiting
             * for the stream to actually fail (MAX_WATCH_STREAM_FAILURES times).
             */
            this.X_ = null, 
            /**
             * Whether the client should log a warning message if it fails to connect to
             * the backend (initially true, cleared after a successful stream, or if we've
             * logged the message already).
             */
            this.ea = true;
        }
        /**
         * Called by RemoteStore when a watch stream is started (including on each
         * backoff attempt).
         *
         * If this is the first attempt, it sets the OnlineState to Unknown and starts
         * the onlineStateTimer.
         */    ta() {
            0 === this.Z_ && (this.na("Unknown" /* OnlineState.Unknown */), this.X_ = this.asyncQueue.enqueueAfterDelay("online_state_timeout" /* TimerId.OnlineStateTimeout */ , 1e4, (() => (this.X_ = null, 
            this.ra("Backend didn't respond within 10 seconds."), this.na("Offline" /* OnlineState.Offline */), 
            Promise.resolve()))));
        }
        /**
         * Updates our OnlineState as appropriate after the watch stream reports a
         * failure. The first failure moves us to the 'Unknown' state. We then may
         * allow multiple failures (based on MAX_WATCH_STREAM_FAILURES) before we
         * actually transition to the 'Offline' state.
         */    ia(e) {
            "Online" /* OnlineState.Online */ === this.state ? this.na("Unknown" /* OnlineState.Unknown */) : (this.Z_++, 
            this.Z_ >= 1 && (this.sa(), this.ra(`Connection failed 1 times. Most recent error: ${e.toString()}`), 
            this.na("Offline" /* OnlineState.Offline */)));
        }
        /**
         * Explicitly sets the OnlineState to the specified state.
         *
         * Note that this resets our timers / failure counters, etc. used by our
         * Offline heuristics, so must not be used in place of
         * handleWatchStreamStart() and handleWatchStreamFailure().
         */    set(e) {
            this.sa(), this.Z_ = 0, "Online" /* OnlineState.Online */ === e && (
            // We've connected to watch at least once. Don't warn the developer
            // about being offline going forward.
            this.ea = false), this.na(e);
        }
        na(e) {
            e !== this.state && (this.state = e, this.onlineStateHandler(e));
        }
        ra(e) {
            const t = `Could not reach Cloud Firestore backend. ${e}\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;
            this.ea ? (__PRIVATE_logError(t), this.ea = false) : __PRIVATE_logDebug("OnlineStateTracker", t);
        }
        sa() {
            null !== this.X_ && (this.X_.cancel(), this.X_ = null);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const jt = "RemoteStore";

    // TODO(b/35853402): Negotiate this with the stream.
    class __PRIVATE_RemoteStoreImpl {
        constructor(
        /**
         * The local store, used to fill the write pipeline with outbound mutations.
         */
        e, 
        /** The client-side proxy for interacting with the backend. */
        t, n, r, i) {
            this.localStore = e, this.datastore = t, this.asyncQueue = n, this.remoteSyncer = {}, 
            /**
             * A list of up to MAX_PENDING_WRITES writes that we have fetched from the
             * LocalStore via fillWritePipeline() and have or will send to the write
             * stream.
             *
             * Whenever writePipeline.length > 0 the RemoteStore will attempt to start or
             * restart the write stream. When the stream is established the writes in the
             * pipeline will be sent in order.
             *
             * Writes remain in writePipeline until they are acknowledged by the backend
             * and thus will automatically be re-sent if the stream is interrupted /
             * restarted before they're acknowledged.
             *
             * Write responses from the backend are linked to their originating request
             * purely based on order, and so we can just shift() writes from the front of
             * the writePipeline as we receive responses.
             */
            this.oa = [], 
            /**
             * A mapping of watched targets that the client cares about tracking and the
             * user has explicitly called a 'listen' for this target.
             *
             * These targets may or may not have been sent to or acknowledged by the
             * server. On re-establishing the listen stream, these targets should be sent
             * to the server. The targets removed with unlistens are removed eagerly
             * without waiting for confirmation from the listen stream.
             */
            this._a = new Map, 
            /**
             * A set of reasons for why the RemoteStore may be offline. If empty, the
             * RemoteStore may start its network connections.
             */
            this.aa = new Set, 
            /**
             * Event handlers that get called when the network is disabled or enabled.
             *
             * PORTING NOTE: These functions are used on the Web client to create the
             * underlying streams (to support tree-shakeable streams). On Android and iOS,
             * the streams are created during construction of RemoteStore.
             */
            this.ua = [], this.ca = i, this.ca.vo((e => {
                n.enqueueAndForget((async () => {
                    // Porting Note: Unlike iOS, `restartNetwork()` is called even when the
                    // network becomes unreachable as we don't have any other way to tear
                    // down our streams.
                    __PRIVATE_canUseNetwork(this) && (__PRIVATE_logDebug(jt, "Restarting streams for network reachability change."), 
                    await async function __PRIVATE_restartNetwork(e) {
                        const t = __PRIVATE_debugCast(e);
                        t.aa.add(4 /* OfflineCause.ConnectivityChange */), await __PRIVATE_disableNetworkInternal(t), 
                        t.la.set("Unknown" /* OnlineState.Unknown */), t.aa.delete(4 /* OfflineCause.ConnectivityChange */), 
                        await __PRIVATE_enableNetworkInternal(t);
                    }(this));
                }));
            })), this.la = new __PRIVATE_OnlineStateTracker(n, r);
        }
    }

    async function __PRIVATE_enableNetworkInternal(e) {
        if (__PRIVATE_canUseNetwork(e)) for (const t of e.ua) await t(/* enabled= */ true);
    }

    /**
     * Temporarily disables the network. The network can be re-enabled using
     * enableNetwork().
     */ async function __PRIVATE_disableNetworkInternal(e) {
        for (const t of e.ua) await t(/* enabled= */ false);
    }

    function __PRIVATE_canUseNetwork(e) {
        return 0 === __PRIVATE_debugCast(e).aa.size;
    }

    /**
     * Recovery logic for IndexedDB errors that takes the network offline until
     * `op` succeeds. Retries are scheduled with backoff using
     * `enqueueRetryable()`. If `op()` is not provided, IndexedDB access is
     * validated via a generic operation.
     *
     * The returned Promise is resolved once the network is disabled and before
     * any retry attempt.
     */ async function __PRIVATE_disableNetworkUntilRecovery(e, t, n) {
        if (!__PRIVATE_isIndexedDbTransactionError(t)) throw t;
        e.aa.add(1 /* OfflineCause.IndexedDbFailed */), 
        // Disable network and raise offline snapshots
        await __PRIVATE_disableNetworkInternal(e), e.la.set("Offline" /* OnlineState.Offline */), 
        n || (
        // Use a simple read operation to determine if IndexedDB recovered.
        // Ideally, we would expose a health check directly on SimpleDb, but
        // RemoteStore only has access to persistence through LocalStore.
        n = () => __PRIVATE_localStoreGetLastRemoteSnapshotVersion(e.localStore)), 
        // Probe IndexedDB periodically and re-enable network
        e.asyncQueue.enqueueRetryable((async () => {
            __PRIVATE_logDebug(jt, "Retrying IndexedDB access"), await n(), e.aa.delete(1 /* OfflineCause.IndexedDbFailed */), 
            await __PRIVATE_enableNetworkInternal(e);
        }));
    }

    /**
     * Executes `op`. If `op` fails, takes the network offline until `op`
     * succeeds. Returns after the first attempt.
     */ function __PRIVATE_executeWithRecovery(e, t) {
        return t().catch((n => __PRIVATE_disableNetworkUntilRecovery(e, n, t)));
    }

    async function __PRIVATE_fillWritePipeline(e) {
        const t = __PRIVATE_debugCast(e), n = __PRIVATE_ensureWriteStream(t);
        let r = t.oa.length > 0 ? t.oa[t.oa.length - 1].batchId : $;
        for (;__PRIVATE_canAddToWritePipeline(t); ) try {
            const e = await __PRIVATE_localStoreGetNextMutationBatch(t.localStore, r);
            if (null === e) {
                0 === t.oa.length && n.v_();
                break;
            }
            r = e.batchId, __PRIVATE_addToWritePipeline(t, e);
        } catch (e) {
            await __PRIVATE_disableNetworkUntilRecovery(t, e);
        }
        __PRIVATE_shouldStartWriteStream(t) && __PRIVATE_startWriteStream(t);
    }

    /**
     * Returns true if we can add to the write pipeline (i.e. the network is
     * enabled and the write pipeline is not full).
     */ function __PRIVATE_canAddToWritePipeline(e) {
        return __PRIVATE_canUseNetwork(e) && e.oa.length < 10;
    }

    /**
     * Queues additional writes to be sent to the write stream, sending them
     * immediately if the write stream is established.
     */ function __PRIVATE_addToWritePipeline(e, t) {
        e.oa.push(t);
        const n = __PRIVATE_ensureWriteStream(e);
        n.b_() && n.W_ && n.G_(t.mutations);
    }

    function __PRIVATE_shouldStartWriteStream(e) {
        return __PRIVATE_canUseNetwork(e) && !__PRIVATE_ensureWriteStream(e).w_() && e.oa.length > 0;
    }

    function __PRIVATE_startWriteStream(e) {
        __PRIVATE_ensureWriteStream(e).start();
    }

    async function __PRIVATE_onWriteStreamOpen(e) {
        __PRIVATE_ensureWriteStream(e).H_();
    }

    async function __PRIVATE_onWriteHandshakeComplete(e) {
        const t = __PRIVATE_ensureWriteStream(e);
        // Send the write pipeline now that the stream is established.
            for (const n of e.oa) t.G_(n.mutations);
    }

    async function __PRIVATE_onMutationResult(e, t, n) {
        const r = e.oa.shift(), i = MutationBatchResult.from(r, t, n);
        await __PRIVATE_executeWithRecovery(e, (() => e.remoteSyncer.applySuccessfulWrite(i))), 
        // It's possible that with the completion of this mutation another
        // slot has freed up.
        await __PRIVATE_fillWritePipeline(e);
    }

    async function __PRIVATE_onWriteStreamClose(e, t) {
        // If the write stream closed after the write handshake completes, a write
        // operation failed and we fail the pending operation.
        t && __PRIVATE_ensureWriteStream(e).W_ && 
        // This error affects the actual write.
        await async function __PRIVATE_handleWriteError(e, t) {
            // Only handle permanent errors here. If it's transient, just let the retry
            // logic kick in.
            if (function __PRIVATE_isPermanentWriteError(e) {
                return __PRIVATE_isPermanentError(e) && e !== F.ABORTED;
            }(t.code)) {
                // This was a permanent error, the request itself was the problem
                // so it's not going to succeed if we resend it.
                const n = e.oa.shift();
                // In this case it's also unlikely that the server itself is melting
                // down -- this was just a bad request so inhibit backoff on the next
                // restart.
                            __PRIVATE_ensureWriteStream(e).D_(), await __PRIVATE_executeWithRecovery(e, (() => e.remoteSyncer.rejectFailedWrite(n.batchId, t))), 
                // It's possible that with the completion of this mutation
                // another slot has freed up.
                await __PRIVATE_fillWritePipeline(e);
            }
        }(e, t), 
        // The write stream might have been started by refilling the write
        // pipeline for failed writes
        __PRIVATE_shouldStartWriteStream(e) && __PRIVATE_startWriteStream(e);
    }

    async function __PRIVATE_remoteStoreHandleCredentialChange(e, t) {
        const n = __PRIVATE_debugCast(e);
        n.asyncQueue.verifyOperationInProgress(), __PRIVATE_logDebug(jt, "RemoteStore received new credentials");
        const r = __PRIVATE_canUseNetwork(n);
        // Tear down and re-create our network streams. This will ensure we get a
        // fresh auth token for the new user and re-fill the write pipeline with
        // new mutations from the LocalStore (since mutations are per-user).
            n.aa.add(3 /* OfflineCause.CredentialChange */), await __PRIVATE_disableNetworkInternal(n), 
        r && 
        // Don't set the network status to Unknown if we are offline.
        n.la.set("Unknown" /* OnlineState.Unknown */), await n.remoteSyncer.handleCredentialChange(t), 
        n.aa.delete(3 /* OfflineCause.CredentialChange */), await __PRIVATE_enableNetworkInternal(n);
    }

    /**
     * Toggles the network state when the client gains or loses its primary lease.
     */ async function __PRIVATE_remoteStoreApplyPrimaryState(e, t) {
        const n = __PRIVATE_debugCast(e);
        t ? (n.aa.delete(2 /* OfflineCause.IsSecondary */), await __PRIVATE_enableNetworkInternal(n)) : t || (n.aa.add(2 /* OfflineCause.IsSecondary */), 
        await __PRIVATE_disableNetworkInternal(n), n.la.set("Unknown" /* OnlineState.Unknown */));
    }

    /**
     * If not yet initialized, registers the WriteStream and its network state
     * callback with `remoteStoreImpl`. Returns the existing stream if one is
     * already available.
     *
     * PORTING NOTE: On iOS and Android, the WriteStream gets registered on startup.
     * This is not done on Web to allow it to be tree-shaken.
     */ function __PRIVATE_ensureWriteStream(e) {
        return e.Ta || (
        // Create stream (but note that it is not started yet).
        e.Ta = function __PRIVATE_newPersistentWriteStream(e, t, n) {
            const r = __PRIVATE_debugCast(e);
            return r.Y_(), new __PRIVATE_PersistentWriteStream(t, r.connection, r.authCredentials, r.appCheckCredentials, r.serializer, n);
        }(e.datastore, e.asyncQueue, {
            jo: () => Promise.resolve(),
            Jo: __PRIVATE_onWriteStreamOpen.bind(null, e),
            Zo: __PRIVATE_onWriteStreamClose.bind(null, e),
            z_: __PRIVATE_onWriteHandshakeComplete.bind(null, e),
            j_: __PRIVATE_onMutationResult.bind(null, e)
        }), e.ua.push((async t => {
            t ? (e.Ta.D_(), 
            // This will start the write stream if necessary.
            await __PRIVATE_fillWritePipeline(e)) : (await e.Ta.stop(), e.oa.length > 0 && (__PRIVATE_logDebug(jt, `Stopping write stream with ${e.oa.length} pending writes`), 
            e.oa = []));
        }))), e.Ta;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents an operation scheduled to be run in the future on an AsyncQueue.
     *
     * It is created via DelayedOperation.createAndSchedule().
     *
     * Supports cancellation (via cancel()) and early execution (via skipDelay()).
     *
     * Note: We implement `PromiseLike` instead of `Promise`, as the `Promise` type
     * in newer versions of TypeScript defines `finally`, which is not available in
     * IE.
     */
    class DelayedOperation {
        constructor(e, t, n, r, i) {
            this.asyncQueue = e, this.timerId = t, this.targetTimeMs = n, this.op = r, this.removalCallback = i, 
            this.deferred = new __PRIVATE_Deferred, this.then = this.deferred.promise.then.bind(this.deferred.promise), 
            // It's normal for the deferred promise to be canceled (due to cancellation)
            // and so we attach a dummy catch callback to avoid
            // 'UnhandledPromiseRejectionWarning' log spam.
            this.deferred.promise.catch((e => {}));
        }
        get promise() {
            return this.deferred.promise;
        }
        /**
         * Creates and returns a DelayedOperation that has been scheduled to be
         * executed on the provided asyncQueue after the provided delayMs.
         *
         * @param asyncQueue - The queue to schedule the operation on.
         * @param id - A Timer ID identifying the type of operation this is.
         * @param delayMs - The delay (ms) before the operation should be scheduled.
         * @param op - The operation to run.
         * @param removalCallback - A callback to be called synchronously once the
         *   operation is executed or canceled, notifying the AsyncQueue to remove it
         *   from its delayedOperations list.
         *   PORTING NOTE: This exists to prevent making removeDelayedOperation() and
         *   the DelayedOperation class public.
         */    static createAndSchedule(e, t, n, r, i) {
            const s = Date.now() + n, o = new DelayedOperation(e, t, s, r, i);
            return o.start(n), o;
        }
        /**
         * Starts the timer. This is called immediately after construction by
         * createAndSchedule().
         */    start(e) {
            this.timerHandle = setTimeout((() => this.handleDelayElapsed()), e);
        }
        /**
         * Queues the operation to run immediately (if it hasn't already been run or
         * canceled).
         */    skipDelay() {
            return this.handleDelayElapsed();
        }
        /**
         * Cancels the operation if it hasn't already been executed or canceled. The
         * promise will be rejected.
         *
         * As long as the operation has not yet been run, calling cancel() provides a
         * guarantee that the operation will not be run.
         */    cancel(e) {
            null !== this.timerHandle && (this.clearTimeout(), this.deferred.reject(new FirestoreError(F.CANCELLED, "Operation cancelled" + (e ? ": " + e : ""))));
        }
        handleDelayElapsed() {
            this.asyncQueue.enqueueAndForget((() => null !== this.timerHandle ? (this.clearTimeout(), 
            this.op().then((e => this.deferred.resolve(e)))) : Promise.resolve()));
        }
        clearTimeout() {
            null !== this.timerHandle && (this.removalCallback(this), clearTimeout(this.timerHandle), 
            this.timerHandle = null);
        }
    }

    /**
     * Returns a FirestoreError that can be surfaced to the user if the provided
     * error is an IndexedDbTransactionError. Re-throws the error otherwise.
     */ function __PRIVATE_wrapInUserErrorIfRecoverable(e, t) {
        if (__PRIVATE_logError("AsyncQueue", `${t}: ${e}`), __PRIVATE_isIndexedDbTransactionError(e)) return new FirestoreError(F.UNAVAILABLE, `${t}: ${e}`);
        throw e;
    }

    class __PRIVATE_EventManagerImpl {
        constructor() {
            this.queries = __PRIVATE_newQueriesObjectMap(), this.onlineState = "Unknown" /* OnlineState.Unknown */ , 
            this.fa = new Set;
        }
        terminate() {
            !function __PRIVATE_errorAllTargets(e, t) {
                const n = __PRIVATE_debugCast(e), r = n.queries;
                // Prevent further access by clearing ObjectMap.
                n.queries = __PRIVATE_newQueriesObjectMap(), r.forEach(((e, n) => {
                    for (const e of n.Ra) e.onError(t);
                }));
            }
            // Call all global snapshot listeners that have been set.
            (this, new FirestoreError(F.ABORTED, "Firestore shutting down"));
        }
    }

    function __PRIVATE_newQueriesObjectMap() {
        return new ObjectMap((e => __PRIVATE_canonifyQuery(e)), __PRIVATE_queryEquals);
    }

    function __PRIVATE_raiseSnapshotsInSyncEvent(e) {
        e.fa.forEach((e => {
            e.next();
        }));
    }

    var Ht, Jt;

    /** Listen to both cache and server changes */
    (Jt = Ht || (Ht = {})).ya = "default", 
    /** Listen to changes in cache only */
    Jt.Cache = "cache";

    const Yt = "SyncEngine";

    /**
     * An implementation of `SyncEngine` coordinating with other parts of SDK.
     *
     * The parts of SyncEngine that act as a callback to RemoteStore need to be
     * registered individually. This is done in `syncEngineWrite()` and
     * `syncEngineListen()` (as well as `applyPrimaryState()`) as these methods
     * serve as entry points to RemoteStore's functionality.
     *
     * Note: some field defined in this class might have public access level, but
     * the class is not exported so they are only accessible from this module.
     * This is useful to implement optional features (like bundles) in free
     * functions, such that they are tree-shakeable.
     */ class __PRIVATE_SyncEngineImpl {
        constructor(e, t, n, 
        // PORTING NOTE: Manages state synchronization in multi-tab environments.
        r, i, s) {
            this.localStore = e, this.remoteStore = t, this.eventManager = n, this.sharedClientState = r, 
            this.currentUser = i, this.maxConcurrentLimboResolutions = s, this.nu = {}, this.ru = new ObjectMap((e => __PRIVATE_canonifyQuery(e)), __PRIVATE_queryEquals), 
            this.iu = new Map, 
            /**
             * The keys of documents that are in limbo for which we haven't yet started a
             * limbo resolution query. The strings in this set are the result of calling
             * `key.path.canonicalString()` where `key` is a `DocumentKey` object.
             *
             * The `Set` type was chosen because it provides efficient lookup and removal
             * of arbitrary elements and it also maintains insertion order, providing the
             * desired queue-like FIFO semantics.
             */
            this.su = new Set, 
            /**
             * Keeps track of the target ID for each document that is in limbo with an
             * active target.
             */
            this.ou = new SortedMap(DocumentKey.comparator), 
            /**
             * Keeps track of the information about an active limbo resolution for each
             * active target ID that was started for the purpose of limbo resolution.
             */
            this._u = new Map, this.au = new __PRIVATE_ReferenceSet, 
            /** Stores user completion handlers, indexed by User and BatchId. */
            this.uu = {}, 
            /** Stores user callbacks waiting for all pending writes to be acknowledged. */
            this.cu = new Map, this.lu = __PRIVATE_TargetIdGenerator.ir(), this.onlineState = "Unknown" /* OnlineState.Unknown */ , 
            // The primary state is set to `true` or `false` immediately after Firestore
            // startup. In the interim, a client should only be considered primary if
            // `isPrimary` is true.
            this.hu = void 0;
        }
        get isPrimaryClient() {
            return true === this.hu;
        }
    }

    /**
     * Initiates the write of local mutation batch which involves adding the
     * writes to the mutation queue, notifying the remote store about new
     * mutations and raising events for any changes this write caused.
     *
     * The promise returned by this call is resolved when the above steps
     * have completed, *not* when the write was acked by the backend. The
     * userCallback is resolved once the write was acked/rejected by the
     * backend (or failed locally for any other reason).
     */ async function __PRIVATE_syncEngineWrite(e, t, n) {
        const r = __PRIVATE_syncEngineEnsureWriteCallbacks(e);
        try {
            const e = await function __PRIVATE_localStoreWriteLocally(e, t) {
                const n = __PRIVATE_debugCast(e), r = Timestamp.now(), i = t.reduce(((e, t) => e.add(t.key)), __PRIVATE_documentKeySet());
                let s, o;
                return n.persistence.runTransaction("Locally write mutations", "readwrite", (e => {
                    // Figure out which keys do not have a remote version in the cache, this
                    // is needed to create the right overlay mutation: if no remote version
                    // presents, we do not need to create overlays as patch mutations.
                    // TODO(Overlay): Is there a better way to determine this? Using the
                    //  document version does not work because local mutations set them back
                    //  to 0.
                    let _ = __PRIVATE_mutableDocumentMap(), a = __PRIVATE_documentKeySet();
                    return n.Cs.getEntries(e, i).next((e => {
                        _ = e, _.forEach(((e, t) => {
                            t.isValidDocument() || (a = a.add(e));
                        }));
                    })).next((() => n.localDocuments.getOverlayedDocuments(e, _))).next((i => {
                        s = i;
                        // For non-idempotent mutations (such as `FieldValue.increment()`),
                        // we record the base state in a separate patch mutation. This is
                        // later used to guarantee consistent values and prevents flicker
                        // even if the backend sends us an update that already includes our
                        // transform.
                        const o = [];
                        for (const e of t) {
                            const t = __PRIVATE_mutationExtractBaseValue(e, s.get(e.key).overlayedDocument);
                            null != t && 
                            // NOTE: The base state should only be applied if there's some
                            // existing document to override, so use a Precondition of
                            // exists=true
                            o.push(new __PRIVATE_PatchMutation(e.key, t, __PRIVATE_extractFieldMask(t.value.mapValue), Precondition.exists(!0)));
                        }
                        return n.mutationQueue.addMutationBatch(e, r, o, t);
                    })).next((t => {
                        o = t;
                        const r = t.applyToLocalDocumentSet(s, a);
                        return n.documentOverlayCache.saveOverlays(e, t.batchId, r);
                    }));
                })).then((() => ({
                    batchId: o.batchId,
                    changes: __PRIVATE_convertOverlayedDocumentMapToDocumentMap(s)
                })));
            }(r.localStore, t);
            r.sharedClientState.addPendingMutation(e.batchId), function __PRIVATE_addMutationCallback(e, t, n) {
                let r = e.uu[e.currentUser.toKey()];
                r || (r = new SortedMap(__PRIVATE_primitiveComparator));
                r = r.insert(t, n), e.uu[e.currentUser.toKey()] = r;
            }
            /**
     * Resolves or rejects the user callback for the given batch and then discards
     * it.
     */ (r, e.batchId, n), await __PRIVATE_syncEngineEmitNewSnapsAndNotifyLocalStore(r, e.changes), 
            await __PRIVATE_fillWritePipeline(r.remoteStore);
        } catch (e) {
            // If we can't persist the mutation, we reject the user callback and
            // don't send the mutation. The user can then retry the write.
            const t = __PRIVATE_wrapInUserErrorIfRecoverable(e, "Failed to persist write");
            n.reject(t);
        }
    }

    /**
     * Applies an OnlineState change to the sync engine and notifies any views of
     * the change.
     */ function __PRIVATE_syncEngineApplyOnlineStateChange(e, t, n) {
        const r = __PRIVATE_debugCast(e);
        // If we are the secondary client, we explicitly ignore the remote store's
        // online state (the local client may go offline, even though the primary
        // tab remains online) and only apply the primary tab's online state from
        // SharedClientState.
            if (r.isPrimaryClient && 0 /* OnlineStateSource.RemoteStore */ === n || !r.isPrimaryClient && 1 /* OnlineStateSource.SharedClientState */ === n) {
            const e = [];
            r.ru.forEach(((n, r) => {
                const i = r.view.ga(t);
                i.snapshot && e.push(i.snapshot);
            })), function __PRIVATE_eventManagerOnOnlineStateChange(e, t) {
                const n = __PRIVATE_debugCast(e);
                n.onlineState = t;
                let r = false;
                n.queries.forEach(((e, n) => {
                    for (const e of n.Ra) 
                    // Run global snapshot listeners if a consistent snapshot has been emitted.
                    e.ga(t) && (r = true);
                })), r && __PRIVATE_raiseSnapshotsInSyncEvent(n);
            }(r.eventManager, t), e.length && r.nu.Q_(e), r.onlineState = t, r.isPrimaryClient && r.sharedClientState.setOnlineState(t);
        }
    }

    async function __PRIVATE_syncEngineApplySuccessfulWrite(e, t) {
        const n = __PRIVATE_debugCast(e), r = t.batch.batchId;
        try {
            const e = await __PRIVATE_localStoreAcknowledgeBatch(n.localStore, t);
            // The local store may or may not be able to apply the write result and
            // raise events immediately (depending on whether the watcher is caught
            // up), so we raise user callbacks first so that they consistently happen
            // before listen events.
                    __PRIVATE_processUserCallback(n, r, /*error=*/ null), __PRIVATE_triggerPendingWritesCallbacks(n, r), 
            n.sharedClientState.updateMutationState(r, "acknowledged"), await __PRIVATE_syncEngineEmitNewSnapsAndNotifyLocalStore(n, e);
        } catch (e) {
            await __PRIVATE_ignoreIfPrimaryLeaseLoss(e);
        }
    }

    async function __PRIVATE_syncEngineRejectFailedWrite(e, t, n) {
        const r = __PRIVATE_debugCast(e);
        try {
            const e = await function __PRIVATE_localStoreRejectBatch(e, t) {
                const n = __PRIVATE_debugCast(e);
                return n.persistence.runTransaction("Reject batch", "readwrite-primary", (e => {
                    let r;
                    return n.mutationQueue.lookupMutationBatch(e, t).next((t => (__PRIVATE_hardAssert(null !== t, 37113), 
                    r = t.keys(), n.mutationQueue.removeMutationBatch(e, t)))).next((() => n.mutationQueue.performConsistencyCheck(e))).next((() => n.documentOverlayCache.removeOverlaysForBatchId(e, r, t))).next((() => n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e, r))).next((() => n.localDocuments.getDocuments(e, r)));
                }));
            }
            /**
     * Returns the largest (latest) batch id in mutation queue that is pending
     * server response.
     *
     * Returns `BATCHID_UNKNOWN` if the queue is empty.
     */ (r.localStore, t);
            // The local store may or may not be able to apply the write result and
            // raise events immediately (depending on whether the watcher is caught up),
            // so we raise user callbacks first so that they consistently happen before
            // listen events.
                    __PRIVATE_processUserCallback(r, t, n), __PRIVATE_triggerPendingWritesCallbacks(r, t), 
            r.sharedClientState.updateMutationState(t, "rejected", n), await __PRIVATE_syncEngineEmitNewSnapsAndNotifyLocalStore(r, e);
        } catch (n) {
            await __PRIVATE_ignoreIfPrimaryLeaseLoss(n);
        }
    }

    /**
     * Triggers the callbacks that are waiting for this batch id to get acknowledged by server,
     * if there are any.
     */ function __PRIVATE_triggerPendingWritesCallbacks(e, t) {
        (e.cu.get(t) || []).forEach((e => {
            e.resolve();
        })), e.cu.delete(t);
    }

    /** Reject all outstanding callbacks waiting for pending writes to complete. */ function __PRIVATE_processUserCallback(e, t, n) {
        const r = __PRIVATE_debugCast(e);
        let i = r.uu[r.currentUser.toKey()];
        // NOTE: Mutations restored from persistence won't have callbacks, so it's
        // okay for there to be no callback for this ID.
            if (i) {
            const e = i.get(t);
            e && (n ? e.reject(n) : e.resolve(), i = i.remove(t)), r.uu[r.currentUser.toKey()] = i;
        }
    }

    async function __PRIVATE_syncEngineEmitNewSnapsAndNotifyLocalStore(e, t, n) {
        const r = __PRIVATE_debugCast(e), i = [], s = [], o = [];
        r.ru.isEmpty() || (r.ru.forEach(((e, _) => {
            o.push(r.Pu(_, t, n).then((e => {
                var t;
                // If there are changes, or we are handling a global snapshot, notify
                // secondary clients to update query state.
                            if ((e || n) && r.isPrimaryClient) {
                    // Query state is set to `current` if:
                    // - There is a view change and it is up-to-date, or,
                    // - There is a global snapshot, the Target is current, and no changes to be resolved
                    const i = e ? !e.fromCache : null === (t = void 0 ) || void 0 === t ? void 0 : t.current;
                    r.sharedClientState.updateQueryState(_.targetId, i ? "current" : "not-current");
                }
                // Update views if there are actual changes.
                            if (e) {
                    i.push(e);
                    const t = __PRIVATE_LocalViewChanges.Ps(_.targetId, e);
                    s.push(t);
                }
            })));
        })), await Promise.all(o), r.nu.Q_(i), await async function __PRIVATE_localStoreNotifyLocalViewChanges(e, t) {
            const n = __PRIVATE_debugCast(e);
            try {
                await n.persistence.runTransaction("notifyLocalViewChanges", "readwrite", (e => PersistencePromise.forEach(t, (t => PersistencePromise.forEach(t.ls, (r => n.persistence.referenceDelegate.addReference(e, t.targetId, r))).next((() => PersistencePromise.forEach(t.hs, (r => n.persistence.referenceDelegate.removeReference(e, t.targetId, r)))))))));
            } catch (e) {
                if (!__PRIVATE_isIndexedDbTransactionError(e)) throw e;
                // If `notifyLocalViewChanges` fails, we did not advance the sequence
                // number for the documents that were included in this transaction.
                // This might trigger them to be deleted earlier than they otherwise
                // would have, but it should not invalidate the integrity of the data.
                __PRIVATE_logDebug(Nt, "Failed to update sequence numbers: " + e);
            }
            for (const e of t) {
                const t = e.targetId;
                if (!e.fromCache) {
                    const e = n.Ss.get(t), r = e.snapshotVersion, i = e.withLastLimboFreeSnapshotVersion(r);
                    // Advance the last limbo free snapshot version
                                    n.Ss = n.Ss.insert(t, i);
                }
            }
        }(r.localStore, s));
    }

    async function __PRIVATE_syncEngineHandleCredentialChange(e, t) {
        const n = __PRIVATE_debugCast(e);
        if (!n.currentUser.isEqual(t)) {
            __PRIVATE_logDebug(Yt, "User change. New user:", t.toKey());
            const e = await __PRIVATE_localStoreHandleUserChange(n.localStore, t);
            n.currentUser = t, 
            // Fails tasks waiting for pending writes requested by previous user.
            function __PRIVATE_rejectOutstandingPendingWritesCallbacks(e, t) {
                e.cu.forEach((e => {
                    e.forEach((e => {
                        e.reject(new FirestoreError(F.CANCELLED, t));
                    }));
                })), e.cu.clear();
            }(n, "'waitForPendingWrites' promise is rejected due to a user change."), 
            // TODO(b/114226417): Consider calling this only in the primary tab.
            n.sharedClientState.handleUserChange(t, e.removedBatchIds, e.addedBatchIds), await __PRIVATE_syncEngineEmitNewSnapsAndNotifyLocalStore(n, e.Ms);
        }
    }

    function __PRIVATE_syncEngineEnsureWriteCallbacks(e) {
        const t = __PRIVATE_debugCast(e);
        return t.remoteStore.remoteSyncer.applySuccessfulWrite = __PRIVATE_syncEngineApplySuccessfulWrite.bind(null, t), 
        t.remoteStore.remoteSyncer.rejectFailedWrite = __PRIVATE_syncEngineRejectFailedWrite.bind(null, t), 
        t;
    }

    class __PRIVATE_MemoryOfflineComponentProvider {
        constructor() {
            this.kind = "memory", this.synchronizeTabs = false;
        }
        async initialize(e) {
            this.serializer = __PRIVATE_newSerializer(e.databaseInfo.databaseId), this.sharedClientState = this.Au(e), 
            this.persistence = this.Ru(e), await this.persistence.start(), this.localStore = this.Vu(e), 
            this.gcScheduler = this.mu(e, this.localStore), this.indexBackfillerScheduler = this.fu(e, this.localStore);
        }
        mu(e, t) {
            return null;
        }
        fu(e, t) {
            return null;
        }
        Vu(e) {
            return __PRIVATE_newLocalStore(this.persistence, new __PRIVATE_QueryEngine, e.initialUser, this.serializer);
        }
        Ru(e) {
            return new __PRIVATE_MemoryPersistence(__PRIVATE_MemoryEagerDelegate.Ei, this.serializer);
        }
        Au(e) {
            return new __PRIVATE_MemorySharedClientState;
        }
        async terminate() {
            var e, t;
            null === (e = this.gcScheduler) || void 0 === e || e.stop(), null === (t = this.indexBackfillerScheduler) || void 0 === t || t.stop(), 
            this.sharedClientState.shutdown(), await this.persistence.shutdown();
        }
    }

    __PRIVATE_MemoryOfflineComponentProvider.provider = {
        build: () => new __PRIVATE_MemoryOfflineComponentProvider
    };

    class __PRIVATE_LruGcMemoryOfflineComponentProvider extends __PRIVATE_MemoryOfflineComponentProvider {
        constructor(e) {
            super(), this.cacheSizeBytes = e;
        }
        mu(e, t) {
            __PRIVATE_hardAssert(this.persistence.referenceDelegate instanceof __PRIVATE_MemoryLruDelegate, 46915);
            const n = this.persistence.referenceDelegate.garbageCollector;
            return new __PRIVATE_LruScheduler(n, e.asyncQueue, t);
        }
        Ru(e) {
            const t = void 0 !== this.cacheSizeBytes ? LruParams.withCacheSize(this.cacheSizeBytes) : LruParams.DEFAULT;
            return new __PRIVATE_MemoryPersistence((e => __PRIVATE_MemoryLruDelegate.Ei(e, t)), this.serializer);
        }
    }

    /**
     * Initializes and wires the components that are needed to interface with the
     * network.
     */ class OnlineComponentProvider {
        async initialize(e, t) {
            this.localStore || (this.localStore = e.localStore, this.sharedClientState = e.sharedClientState, 
            this.datastore = this.createDatastore(t), this.remoteStore = this.createRemoteStore(t), 
            this.eventManager = this.createEventManager(t), this.syncEngine = this.createSyncEngine(t, 
            /* startAsPrimary=*/ !e.synchronizeTabs), this.sharedClientState.onlineStateHandler = e => __PRIVATE_syncEngineApplyOnlineStateChange(this.syncEngine, e, 1 /* OnlineStateSource.SharedClientState */), 
            this.remoteStore.remoteSyncer.handleCredentialChange = __PRIVATE_syncEngineHandleCredentialChange.bind(null, this.syncEngine), 
            await __PRIVATE_remoteStoreApplyPrimaryState(this.remoteStore, this.syncEngine.isPrimaryClient));
        }
        createEventManager(e) {
            return function __PRIVATE_newEventManager() {
                return new __PRIVATE_EventManagerImpl;
            }();
        }
        createDatastore(e) {
            const t = __PRIVATE_newSerializer(e.databaseInfo.databaseId), n = function __PRIVATE_newConnection(e) {
                return new __PRIVATE_WebChannelConnection(e);
            }
            /** Return the Platform-specific connectivity monitor. */ (e.databaseInfo);
            return function __PRIVATE_newDatastore(e, t, n, r) {
                return new __PRIVATE_DatastoreImpl(e, t, n, r);
            }(e.authCredentials, e.appCheckCredentials, n, t);
        }
        createRemoteStore(e) {
            return function __PRIVATE_newRemoteStore(e, t, n, r, i) {
                return new __PRIVATE_RemoteStoreImpl(e, t, n, r, i);
            }
            /** Re-enables the network. Idempotent. */ (this.localStore, this.datastore, e.asyncQueue, (e => __PRIVATE_syncEngineApplyOnlineStateChange(this.syncEngine, e, 0 /* OnlineStateSource.RemoteStore */)), function __PRIVATE_newConnectivityMonitor() {
                return __PRIVATE_BrowserConnectivityMonitor.C() ? new __PRIVATE_BrowserConnectivityMonitor : new __PRIVATE_NoopConnectivityMonitor;
            }());
        }
        createSyncEngine(e, t) {
            return function __PRIVATE_newSyncEngine(e, t, n, 
            // PORTING NOTE: Manages state synchronization in multi-tab environments.
            r, i, s, o) {
                const _ = new __PRIVATE_SyncEngineImpl(e, t, n, r, i, s);
                return o && (_.hu = true), _;
            }(this.localStore, this.remoteStore, this.eventManager, this.sharedClientState, e.initialUser, e.maxConcurrentLimboResolutions, t);
        }
        async terminate() {
            var e, t;
            await async function __PRIVATE_remoteStoreShutdown(e) {
                const t = __PRIVATE_debugCast(e);
                __PRIVATE_logDebug(jt, "RemoteStore shutting down."), t.aa.add(5 /* OfflineCause.Shutdown */), 
                await __PRIVATE_disableNetworkInternal(t), t.ca.shutdown(), 
                // Set the OnlineState to Unknown (rather than Offline) to avoid potentially
                // triggering spurious listener events with cached data, etc.
                t.la.set("Unknown" /* OnlineState.Unknown */);
            }(this.remoteStore), null === (e = this.datastore) || void 0 === e || e.terminate(), 
            null === (t = this.eventManager) || void 0 === t || t.terminate();
        }
    }

    OnlineComponentProvider.provider = {
        build: () => new OnlineComponentProvider
    };

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const Zt = "FirestoreClient";

    /**
     * FirestoreClient is a top-level class that constructs and owns all of the //
     * pieces of the client SDK architecture. It is responsible for creating the //
     * async queue that is shared by all of the other components in the system. //
     */
    class FirestoreClient {
        constructor(e, t, 
        /**
         * Asynchronous queue responsible for all of our internal processing. When
         * we get incoming work from the user (via public API) or the network
         * (incoming GRPC messages), we should always schedule onto this queue.
         * This ensures all of our work is properly serialized (e.g. we don't
         * start processing a new operation while the previous one is waiting for
         * an async I/O to complete).
         */
        n, r, i) {
            this.authCredentials = e, this.appCheckCredentials = t, this.asyncQueue = n, this.databaseInfo = r, 
            this.user = User.UNAUTHENTICATED, this.clientId = __PRIVATE_AutoId.newId(), this.authCredentialListener = () => Promise.resolve(), 
            this.appCheckCredentialListener = () => Promise.resolve(), this._uninitializedComponentsProvider = i, 
            this.authCredentials.start(n, (async e => {
                __PRIVATE_logDebug(Zt, "Received user=", e.uid), await this.authCredentialListener(e), 
                this.user = e;
            })), this.appCheckCredentials.start(n, (e => (__PRIVATE_logDebug(Zt, "Received new app check token=", e), 
            this.appCheckCredentialListener(e, this.user))));
        }
        get configuration() {
            return {
                asyncQueue: this.asyncQueue,
                databaseInfo: this.databaseInfo,
                clientId: this.clientId,
                authCredentials: this.authCredentials,
                appCheckCredentials: this.appCheckCredentials,
                initialUser: this.user,
                maxConcurrentLimboResolutions: 100
            };
        }
        setCredentialChangeListener(e) {
            this.authCredentialListener = e;
        }
        setAppCheckTokenChangeListener(e) {
            this.appCheckCredentialListener = e;
        }
        terminate() {
            this.asyncQueue.enterRestrictedMode();
            const e = new __PRIVATE_Deferred;
            return this.asyncQueue.enqueueAndForgetEvenWhileRestricted((async () => {
                try {
                    this._onlineComponents && await this._onlineComponents.terminate(), this._offlineComponents && await this._offlineComponents.terminate(), 
                    // The credentials provider must be terminated after shutting down the
                    // RemoteStore as it will prevent the RemoteStore from retrieving auth
                    // tokens.
                    this.authCredentials.shutdown(), this.appCheckCredentials.shutdown(), e.resolve();
                } catch (t) {
                    const n = __PRIVATE_wrapInUserErrorIfRecoverable(t, "Failed to shutdown persistence");
                    e.reject(n);
                }
            })), e.promise;
        }
    }

    async function __PRIVATE_setOfflineComponentProvider(e, t) {
        e.asyncQueue.verifyOperationInProgress(), __PRIVATE_logDebug(Zt, "Initializing OfflineComponentProvider");
        const n = e.configuration;
        await t.initialize(n);
        let r = n.initialUser;
        e.setCredentialChangeListener((async e => {
            r.isEqual(e) || (await __PRIVATE_localStoreHandleUserChange(t.localStore, e), r = e);
        })), 
        // When a user calls clearPersistence() in one client, all other clients
        // need to be terminated to allow the delete to succeed.
        t.persistence.setDatabaseDeletedListener((() => e.terminate())), e._offlineComponents = t;
    }

    async function __PRIVATE_setOnlineComponentProvider(e, t) {
        e.asyncQueue.verifyOperationInProgress();
        const n = await __PRIVATE_ensureOfflineComponents(e);
        __PRIVATE_logDebug(Zt, "Initializing OnlineComponentProvider"), await t.initialize(n, e.configuration), 
        // The CredentialChangeListener of the online component provider takes
        // precedence over the offline component provider.
        e.setCredentialChangeListener((e => __PRIVATE_remoteStoreHandleCredentialChange(t.remoteStore, e))), 
        e.setAppCheckTokenChangeListener(((e, n) => __PRIVATE_remoteStoreHandleCredentialChange(t.remoteStore, n))), 
        e._onlineComponents = t;
    }

    /**
     * Decides whether the provided error allows us to gracefully disable
     * persistence (as opposed to crashing the client).
     */ async function __PRIVATE_ensureOfflineComponents(e) {
        if (!e._offlineComponents) if (e._uninitializedComponentsProvider) {
            __PRIVATE_logDebug(Zt, "Using user provided OfflineComponentProvider");
            try {
                await __PRIVATE_setOfflineComponentProvider(e, e._uninitializedComponentsProvider._offline);
            } catch (t) {
                const n = t;
                if (!function __PRIVATE_canFallbackFromIndexedDbError(e) {
                    return "FirebaseError" === e.name ? e.code === F.FAILED_PRECONDITION || e.code === F.UNIMPLEMENTED : !("undefined" != typeof DOMException && e instanceof DOMException) || 
                    // When the browser is out of quota we could get either quota exceeded
                    // or an aborted error depending on whether the error happened during
                    // schema migration.
                    22 === e.code || 20 === e.code || 
                    // Firefox Private Browsing mode disables IndexedDb and returns
                    // INVALID_STATE for any usage.
                    11 === e.code;
                }(n)) throw n;
                __PRIVATE_logWarn("Error using user provided cache. Falling back to memory cache: " + n), 
                await __PRIVATE_setOfflineComponentProvider(e, new __PRIVATE_MemoryOfflineComponentProvider);
            }
        } else __PRIVATE_logDebug(Zt, "Using default OfflineComponentProvider"), await __PRIVATE_setOfflineComponentProvider(e, new __PRIVATE_LruGcMemoryOfflineComponentProvider(void 0));
        return e._offlineComponents;
    }

    async function __PRIVATE_ensureOnlineComponents(e) {
        return e._onlineComponents || (e._uninitializedComponentsProvider ? (__PRIVATE_logDebug(Zt, "Using user provided OnlineComponentProvider"), 
        await __PRIVATE_setOnlineComponentProvider(e, e._uninitializedComponentsProvider._online)) : (__PRIVATE_logDebug(Zt, "Using default OnlineComponentProvider"), 
        await __PRIVATE_setOnlineComponentProvider(e, new OnlineComponentProvider))), e._onlineComponents;
    }

    function __PRIVATE_getSyncEngine(e) {
        return __PRIVATE_ensureOnlineComponents(e).then((e => e.syncEngine));
    }

    /**
     * @license
     * Copyright 2023 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Compares two `ExperimentalLongPollingOptions` objects for equality.
     */
    /**
     * Creates and returns a new `ExperimentalLongPollingOptions` with the same
     * option values as the given instance.
     */
    function __PRIVATE_cloneLongPollingOptions(e) {
        const t = {};
        return void 0 !== e.timeoutSeconds && (t.timeoutSeconds = e.timeoutSeconds), t;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const Xt = new Map;

    /**
     * An instance map that ensures only one Datastore exists per Firestore
     * instance.
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function __PRIVATE_validateNonEmptyArgument(e, t, n) {
        if (!n) throw new FirestoreError(F.INVALID_ARGUMENT, `Function ${e}() cannot be called with an empty ${t}.`);
    }

    /**
     * Validates that two boolean options are not set at the same time.
     * @internal
     */ function __PRIVATE_validateIsNotUsedTogether(e, t, n, r) {
        if (true === t && true === r) throw new FirestoreError(F.INVALID_ARGUMENT, `${e} and ${n} cannot be used together.`);
    }

    /**
     * Validates that `path` refers to a document (indicated by the fact it contains
     * an even numbers of segments).
     */ function __PRIVATE_validateDocumentPath(e) {
        if (!DocumentKey.isDocumentKey(e)) throw new FirestoreError(F.INVALID_ARGUMENT, `Invalid document reference. Document references must have an even number of segments, but ${e} has ${e.length}.`);
    }

    /**
     * Returns true if it's a non-null object without a custom prototype
     * (i.e. excludes Array, Date, etc.).
     */
    /** Returns a string describing the type / value of the provided input. */
    function __PRIVATE_valueDescription(e) {
        if (void 0 === e) return "undefined";
        if (null === e) return "null";
        if ("string" == typeof e) return e.length > 20 && (e = `${e.substring(0, 20)}...`), 
        JSON.stringify(e);
        if ("number" == typeof e || "boolean" == typeof e) return "" + e;
        if ("object" == typeof e) {
            if (e instanceof Array) return "an array";
            {
                const t = 
                /** try to get the constructor name for an object. */
                function __PRIVATE_tryGetCustomObjectType(e) {
                    if (e.constructor) return e.constructor.name;
                    return null;
                }
                /**
     * Casts `obj` to `T`, optionally unwrapping Compat types to expose the
     * underlying instance. Throws if  `obj` is not an instance of `T`.
     *
     * This cast is used in the Lite and Full SDK to verify instance types for
     * arguments passed to the public API.
     * @internal
     */ (e);
                return t ? `a custom ${t} object` : "an object";
            }
        }
        return "function" == typeof e ? "a function" : fail(12329, {
            type: typeof e
        });
    }

    function __PRIVATE_cast(e, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t) {
        if ("_delegate" in e && (
        // Unwrap Compat types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        e = e._delegate), !(e instanceof t)) {
            if (t.name === e.constructor.name) throw new FirestoreError(F.INVALID_ARGUMENT, "Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");
            {
                const n = __PRIVATE_valueDescription(e);
                throw new FirestoreError(F.INVALID_ARGUMENT, `Expected type '${t.name}', but it was: ${n}`);
            }
        }
        return e;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // settings() defaults:
    const en = "firestore.googleapis.com", tn = true;

    /**
     * A concrete type describing all the values that can be applied via a
     * user-supplied `FirestoreSettings` object. This is a separate type so that
     * defaults can be supplied and the value can be checked for equality.
     */
    class FirestoreSettingsImpl {
        constructor(e) {
            var t, n;
            if (void 0 === e.host) {
                if (void 0 !== e.ssl) throw new FirestoreError(F.INVALID_ARGUMENT, "Can't provide ssl option if host option is not set");
                this.host = en, this.ssl = tn;
            } else this.host = e.host, this.ssl = null !== (t = e.ssl) && void 0 !== t ? t : tn;
            if (this.credentials = e.credentials, this.ignoreUndefinedProperties = !!e.ignoreUndefinedProperties, 
            this.localCache = e.localCache, void 0 === e.cacheSizeBytes) this.cacheSizeBytes = St; else {
                if (-1 !== e.cacheSizeBytes && e.cacheSizeBytes < vt) throw new FirestoreError(F.INVALID_ARGUMENT, "cacheSizeBytes must be at least 1048576");
                this.cacheSizeBytes = e.cacheSizeBytes;
            }
            __PRIVATE_validateIsNotUsedTogether("experimentalForceLongPolling", e.experimentalForceLongPolling, "experimentalAutoDetectLongPolling", e.experimentalAutoDetectLongPolling), 
            this.experimentalForceLongPolling = !!e.experimentalForceLongPolling, this.experimentalForceLongPolling ? this.experimentalAutoDetectLongPolling = false : void 0 === e.experimentalAutoDetectLongPolling ? this.experimentalAutoDetectLongPolling = true : 
            // For backwards compatibility, coerce the value to boolean even though
            // the TypeScript compiler has narrowed the type to boolean already.
            // noinspection PointlessBooleanExpressionJS
            this.experimentalAutoDetectLongPolling = !!e.experimentalAutoDetectLongPolling, 
            this.experimentalLongPollingOptions = __PRIVATE_cloneLongPollingOptions(null !== (n = e.experimentalLongPollingOptions) && void 0 !== n ? n : {}), 
            function __PRIVATE_validateLongPollingOptions(e) {
                if (void 0 !== e.timeoutSeconds) {
                    if (isNaN(e.timeoutSeconds)) throw new FirestoreError(F.INVALID_ARGUMENT, `invalid long polling timeout: ${e.timeoutSeconds} (must not be NaN)`);
                    if (e.timeoutSeconds < 5) throw new FirestoreError(F.INVALID_ARGUMENT, `invalid long polling timeout: ${e.timeoutSeconds} (minimum allowed value is 5)`);
                    if (e.timeoutSeconds > 30) throw new FirestoreError(F.INVALID_ARGUMENT, `invalid long polling timeout: ${e.timeoutSeconds} (maximum allowed value is 30)`);
                }
            }
            /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
            /**
     * The Cloud Firestore service interface.
     *
     * Do not call this constructor directly. Instead, use {@link (getFirestore:1)}.
     */ (this.experimentalLongPollingOptions), this.useFetchStreams = !!e.useFetchStreams;
        }
        isEqual(e) {
            return this.host === e.host && this.ssl === e.ssl && this.credentials === e.credentials && this.cacheSizeBytes === e.cacheSizeBytes && this.experimentalForceLongPolling === e.experimentalForceLongPolling && this.experimentalAutoDetectLongPolling === e.experimentalAutoDetectLongPolling && function __PRIVATE_longPollingOptionsEqual(e, t) {
                return e.timeoutSeconds === t.timeoutSeconds;
            }(this.experimentalLongPollingOptions, e.experimentalLongPollingOptions) && this.ignoreUndefinedProperties === e.ignoreUndefinedProperties && this.useFetchStreams === e.useFetchStreams;
        }
    }

    class Firestore$1 {
        /** @hideconstructor */
        constructor(e, t, n, r) {
            this._authCredentials = e, this._appCheckCredentials = t, this._databaseId = n, 
            this._app = r, 
            /**
             * Whether it's a Firestore or Firestore Lite instance.
             */
            this.type = "firestore-lite", this._persistenceKey = "(lite)", this._settings = new FirestoreSettingsImpl({}), 
            this._settingsFrozen = false, this._emulatorOptions = {}, 
            // A task that is assigned when the terminate() is invoked and resolved when
            // all components have shut down. Otherwise, Firestore is not terminated,
            // which can mean either the FirestoreClient is in the process of starting,
            // or restarting.
            this._terminateTask = "notTerminated";
        }
        /**
         * The {@link @firebase/app#FirebaseApp} associated with this `Firestore` service
         * instance.
         */    get app() {
            if (!this._app) throw new FirestoreError(F.FAILED_PRECONDITION, "Firestore was not initialized using the Firebase SDK. 'app' is not available");
            return this._app;
        }
        get _initialized() {
            return this._settingsFrozen;
        }
        get _terminated() {
            return "notTerminated" !== this._terminateTask;
        }
        _setSettings(e) {
            if (this._settingsFrozen) throw new FirestoreError(F.FAILED_PRECONDITION, "Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");
            this._settings = new FirestoreSettingsImpl(e), this._emulatorOptions = e.emulatorOptions || {}, 
            void 0 !== e.credentials && (this._authCredentials = function __PRIVATE_makeAuthCredentialsProvider(e) {
                if (!e) return new __PRIVATE_EmptyAuthCredentialsProvider;
                switch (e.type) {
                  case "firstParty":
                    return new __PRIVATE_FirstPartyAuthCredentialsProvider(e.sessionIndex || "0", e.iamToken || null, e.authTokenFactory || null);

                  case "provider":
                    return e.client;

                  default:
                    throw new FirestoreError(F.INVALID_ARGUMENT, "makeAuthCredentialsProvider failed due to invalid credential type");
                }
            }(e.credentials));
        }
        _getSettings() {
            return this._settings;
        }
        _getEmulatorOptions() {
            return this._emulatorOptions;
        }
        _freezeSettings() {
            return this._settingsFrozen = true, this._settings;
        }
        _delete() {
            // The `_terminateTask` must be assigned future that completes when
            // terminate is complete. The existence of this future puts SDK in state
            // that will not accept further API interaction.
            return "notTerminated" === this._terminateTask && (this._terminateTask = this._terminate()), 
            this._terminateTask;
        }
        async _restart() {
            // The `_terminateTask` must equal 'notTerminated' after restart to
            // signal that client is in a state that accepts API calls.
            "notTerminated" === this._terminateTask ? await this._terminate() : this._terminateTask = "notTerminated";
        }
        /** Returns a JSON-serializable representation of this `Firestore` instance. */    toJSON() {
            return {
                app: this._app,
                databaseId: this._databaseId,
                settings: this._settings
            };
        }
        /**
         * Terminates all components used by this client. Subclasses can override
         * this method to clean up their own dependencies, but must also call this
         * method.
         *
         * Only ever called once.
         */    _terminate() {
            /**
     * Removes all components associated with the provided instance. Must be called
     * when the `Firestore` instance is terminated.
     */
            return function __PRIVATE_removeComponents(e) {
                const t = Xt.get(e);
                t && (__PRIVATE_logDebug("ComponentProvider", "Removing Datastore"), Xt.delete(e), 
                t.terminate());
            }(this), Promise.resolve();
        }
    }

    /**
     * Modify this instance to communicate with the Cloud Firestore emulator.
     *
     * Note: This must be called before this instance has been used to do any
     * operations.
     *
     * @param firestore - The `Firestore` instance to configure to connect to the
     * emulator.
     * @param host - the emulator host (ex: localhost).
     * @param port - the emulator port (ex: 9000).
     * @param options.mockUserToken - the mock auth token to use for unit testing
     * Security Rules.
     */ function connectFirestoreEmulator(e, t, n, r = {}) {
        var i;
        const s = (e = __PRIVATE_cast(e, Firestore$1))._getSettings(), o = Object.assign(Object.assign({}, s), {
            emulatorOptions: e._getEmulatorOptions()
        }), _ = `${t}:${n}`;
        s.host !== en && s.host !== _ && __PRIVATE_logWarn("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");
        const a = Object.assign(Object.assign({}, s), {
            host: _,
            ssl: false,
            emulatorOptions: r
        });
        // No-op if the new configuration matches the current configuration. This supports SSR
        // enviornments which might call `connectFirestoreEmulator` multiple times as a standard practice.
            if (!deepEqual(a, o) && (e._setSettings(a), r.mockUserToken)) {
            let t, n;
            if ("string" == typeof r.mockUserToken) t = r.mockUserToken, n = User.MOCK_USER; else {
                // Let createMockUserToken validate first (catches common mistakes like
                // invalid field "uid" and missing field "sub" / "user_id".)
                t = createMockUserToken(r.mockUserToken, null === (i = e._app) || void 0 === i ? void 0 : i.options.projectId);
                const s = r.mockUserToken.sub || r.mockUserToken.user_id;
                if (!s) throw new FirestoreError(F.INVALID_ARGUMENT, "mockUserToken must contain 'sub' or 'user_id' field!");
                n = new User(s);
            }
            e._authCredentials = new __PRIVATE_EmulatorAuthCredentialsProvider(new __PRIVATE_OAuthToken(t, n));
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A `Query` refers to a query which you can read or listen to. You can also
     * construct refined `Query` objects by adding filters and ordering.
     */ class Query {
        // This is the lite version of the Query class in the main SDK.
        /** @hideconstructor protected */
        constructor(e, 
        /**
         * If provided, the `FirestoreDataConverter` associated with this instance.
         */
        t, n) {
            this.converter = t, this._query = n, 
            /** The type of this Firestore reference. */
            this.type = "query", this.firestore = e;
        }
        withConverter(e) {
            return new Query(this.firestore, e, this._query);
        }
    }

    /**
     * A `DocumentReference` refers to a document location in a Firestore database
     * and can be used to write, read, or listen to the location. The document at
     * the referenced location may or may not exist.
     */ class DocumentReference {
        /** @hideconstructor */
        constructor(e, 
        /**
         * If provided, the `FirestoreDataConverter` associated with this instance.
         */
        t, n) {
            this.converter = t, this._key = n, 
            /** The type of this Firestore reference. */
            this.type = "document", this.firestore = e;
        }
        get _path() {
            return this._key.path;
        }
        /**
         * The document's identifier within its collection.
         */    get id() {
            return this._key.path.lastSegment();
        }
        /**
         * A string representing the path of the referenced document (relative
         * to the root of the database).
         */    get path() {
            return this._key.path.canonicalString();
        }
        /**
         * The collection this `DocumentReference` belongs to.
         */    get parent() {
            return new CollectionReference(this.firestore, this.converter, this._key.path.popLast());
        }
        withConverter(e) {
            return new DocumentReference(this.firestore, e, this._key);
        }
    }

    /**
     * A `CollectionReference` object can be used for adding documents, getting
     * document references, and querying for documents (using {@link (query:1)}).
     */ class CollectionReference extends Query {
        /** @hideconstructor */
        constructor(e, t, n) {
            super(e, t, __PRIVATE_newQueryForPath(n)), this._path = n, 
            /** The type of this Firestore reference. */
            this.type = "collection";
        }
        /** The collection's identifier. */    get id() {
            return this._query.path.lastSegment();
        }
        /**
         * A string representing the path of the referenced collection (relative
         * to the root of the database).
         */    get path() {
            return this._query.path.canonicalString();
        }
        /**
         * A reference to the containing `DocumentReference` if this is a
         * subcollection. If this isn't a subcollection, the reference is null.
         */    get parent() {
            const e = this._path.popLast();
            return e.isEmpty() ? null : new DocumentReference(this.firestore, 
            /* converter= */ null, new DocumentKey(e));
        }
        withConverter(e) {
            return new CollectionReference(this.firestore, e, this._path);
        }
    }

    function doc(e, t, ...n) {
        if (e = getModularInstance(e), 
        // We allow omission of 'pathString' but explicitly prohibit passing in both
        // 'undefined' and 'null'.
        1 === arguments.length && (t = __PRIVATE_AutoId.newId()), __PRIVATE_validateNonEmptyArgument("doc", "path", t), 
        e instanceof Firestore$1) {
            const r = ResourcePath.fromString(t, ...n);
            return __PRIVATE_validateDocumentPath(r), new DocumentReference(e, 
            /* converter= */ null, new DocumentKey(r));
        }
        {
            if (!(e instanceof DocumentReference || e instanceof CollectionReference)) throw new FirestoreError(F.INVALID_ARGUMENT, "Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");
            const r = e._path.child(ResourcePath.fromString(t, ...n));
            return __PRIVATE_validateDocumentPath(r), new DocumentReference(e.firestore, e instanceof CollectionReference ? e.converter : null, new DocumentKey(r));
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const nn = "AsyncQueue";

    class __PRIVATE_AsyncQueueImpl {
        constructor(e = Promise.resolve()) {
            // A list of retryable operations. Retryable operations are run in order and
            // retried with backoff.
            this.Qu = [], 
            // Is this AsyncQueue being shut down? Once it is set to true, it will not
            // be changed again.
            this.$u = false, 
            // Operations scheduled to be queued in the future. Operations are
            // automatically removed after they are run or canceled.
            this.Uu = [], 
            // visible for testing
            this.Ku = null, 
            // Flag set while there's an outstanding AsyncQueue operation, used for
            // assertion sanity-checks.
            this.Wu = false, 
            // Enabled during shutdown on Safari to prevent future access to IndexedDB.
            this.Gu = false, 
            // List of TimerIds to fast-forward delays for.
            this.zu = [], 
            // Backoff timer used to schedule retries for retryable operations
            this.y_ = new __PRIVATE_ExponentialBackoff(this, "async_queue_retry" /* TimerId.AsyncQueueRetry */), 
            // Visibility handler that triggers an immediate retry of all retryable
            // operations. Meant to speed up recovery when we regain file system access
            // after page comes into foreground.
            this.ju = () => {
                const e = getDocument();
                e && __PRIVATE_logDebug(nn, "Visibility state changed to " + e.visibilityState), 
                this.y_.A_();
            }, this.Hu = e;
            const t = getDocument();
            t && "function" == typeof t.addEventListener && t.addEventListener("visibilitychange", this.ju);
        }
        get isShuttingDown() {
            return this.$u;
        }
        /**
         * Adds a new operation to the queue without waiting for it to complete (i.e.
         * we ignore the Promise result).
         */    enqueueAndForget(e) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.enqueue(e);
        }
        enqueueAndForgetEvenWhileRestricted(e) {
            this.Ju(), 
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.Yu(e);
        }
        enterRestrictedMode(e) {
            if (!this.$u) {
                this.$u = true, this.Gu = e || false;
                const t = getDocument();
                t && "function" == typeof t.removeEventListener && t.removeEventListener("visibilitychange", this.ju);
            }
        }
        enqueue(e) {
            if (this.Ju(), this.$u) 
            // Return a Promise which never resolves.
            return new Promise((() => {}));
            // Create a deferred Promise that we can return to the callee. This
            // allows us to return a "hanging Promise" only to the callee and still
            // advance the queue even when the operation is not run.
                    const t = new __PRIVATE_Deferred;
            return this.Yu((() => this.$u && this.Gu ? Promise.resolve() : (e().then(t.resolve, t.reject), 
            t.promise))).then((() => t.promise));
        }
        enqueueRetryable(e) {
            this.enqueueAndForget((() => (this.Qu.push(e), this.Zu())));
        }
        /**
         * Runs the next operation from the retryable queue. If the operation fails,
         * reschedules with backoff.
         */    async Zu() {
            if (0 !== this.Qu.length) {
                try {
                    await this.Qu[0](), this.Qu.shift(), this.y_.reset();
                } catch (e) {
                    if (!__PRIVATE_isIndexedDbTransactionError(e)) throw e;
     // Failure will be handled by AsyncQueue
                                    __PRIVATE_logDebug(nn, "Operation failed with retryable error: " + e);
                }
                this.Qu.length > 0 && 
                // If there are additional operations, we re-schedule `retryNextOp()`.
                // This is necessary to run retryable operations that failed during
                // their initial attempt since we don't know whether they are already
                // enqueued. If, for example, `op1`, `op2`, `op3` are enqueued and `op1`
                // needs to  be re-run, we will run `op1`, `op1`, `op2` using the
                // already enqueued calls to `retryNextOp()`. `op3()` will then run in the
                // call scheduled here.
                // Since `backoffAndRun()` cancels an existing backoff and schedules a
                // new backoff on every call, there is only ever a single additional
                // operation in the queue.
                this.y_.E_((() => this.Zu()));
            }
        }
        Yu(e) {
            const t = this.Hu.then((() => (this.Wu = true, e().catch((e => {
                this.Ku = e, this.Wu = false;
                // Re-throw the error so that this.tail becomes a rejected Promise and
                // all further attempts to chain (via .then) will just short-circuit
                // and return the rejected Promise.
                throw __PRIVATE_logError("INTERNAL UNHANDLED ERROR: ", __PRIVATE_getMessageOrStack(e)), 
                e;
            })).then((e => (this.Wu = false, e))))));
            return this.Hu = t, t;
        }
        enqueueAfterDelay(e, t, n) {
            this.Ju(), 
            // Fast-forward delays for timerIds that have been overridden.
            this.zu.indexOf(e) > -1 && (t = 0);
            const r = DelayedOperation.createAndSchedule(this, e, t, n, (e => this.Xu(e)));
            return this.Uu.push(r), r;
        }
        Ju() {
            this.Ku && fail(47125, {
                ec: __PRIVATE_getMessageOrStack(this.Ku)
            });
        }
        verifyOperationInProgress() {}
        /**
         * Waits until all currently queued tasks are finished executing. Delayed
         * operations are not run.
         */    async tc() {
            // Operations in the queue prior to draining may have enqueued additional
            // operations. Keep draining the queue until the tail is no longer advanced,
            // which indicates that no more new operations were enqueued and that all
            // operations were executed.
            let e;
            do {
                e = this.Hu, await e;
            } while (e !== this.Hu);
        }
        /**
         * For Tests: Determine if a delayed operation with a particular TimerId
         * exists.
         */    nc(e) {
            for (const t of this.Uu) if (t.timerId === e) return true;
            return false;
        }
        /**
         * For Tests: Runs some or all delayed operations early.
         *
         * @param lastTimerId - Delayed operations up to and including this TimerId
         * will be drained. Pass TimerId.All to run all delayed operations.
         * @returns a Promise that resolves once all operations have been run.
         */    rc(e) {
            // Note that draining may generate more delayed ops, so we do that first.
            return this.tc().then((() => {
                // Run ops in the same order they'd run if they ran naturally.
                /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
                this.Uu.sort(((e, t) => e.targetTimeMs - t.targetTimeMs));
                for (const t of this.Uu) if (t.skipDelay(), "all" /* TimerId.All */ !== e && t.timerId === e) break;
                return this.tc();
            }));
        }
        /**
         * For Tests: Skip all subsequent delays for a timer id.
         */    sc(e) {
            this.zu.push(e);
        }
        /** Called once a DelayedOperation is run or canceled. */    Xu(e) {
            // NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
            const t = this.Uu.indexOf(e);
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */        this.Uu.splice(t, 1);
        }
    }

    /**
     * Chrome includes Error.message in Error.stack. Other browsers do not.
     * This returns expected output of message + stack when available.
     * @param error - Error or FirestoreError
     */ function __PRIVATE_getMessageOrStack(e) {
        let t = e.message || "";
        return e.stack && (t = e.stack.includes(e.message) ? e.stack : e.message + "\n" + e.stack), 
        t;
    }

    /**
     * The Cloud Firestore service interface.
     *
     * Do not call this constructor directly. Instead, use {@link (getFirestore:1)}.
     */ class Firestore extends Firestore$1 {
        /** @hideconstructor */
        constructor(e, t, n, r) {
            super(e, t, n, r), 
            /**
             * Whether it's a {@link Firestore} or Firestore Lite instance.
             */
            this.type = "firestore", this._queue = new __PRIVATE_AsyncQueueImpl, this._persistenceKey = (null == r ? void 0 : r.name) || "[DEFAULT]";
        }
        async _terminate() {
            if (this._firestoreClient) {
                const e = this._firestoreClient.terminate();
                this._queue = new __PRIVATE_AsyncQueueImpl(e), this._firestoreClient = void 0, await e;
            }
        }
    }

    function getFirestore(e, n) {
        const r = "object" == typeof e ? e : getApp(), i = "string" == typeof e ? e : it, s = _getProvider(r, "firestore").getImmediate({
            identifier: i
        });
        if (!s._initialized) {
            const e = getDefaultEmulatorHostnameAndPort("firestore");
            e && connectFirestoreEmulator(s, ...e);
        }
        return s;
    }

    /**
     * @internal
     */ function ensureFirestoreConfigured(e) {
        if (e._terminated) throw new FirestoreError(F.FAILED_PRECONDITION, "The client has already been terminated.");
        return e._firestoreClient || __PRIVATE_configureFirestore(e), e._firestoreClient;
    }

    function __PRIVATE_configureFirestore(e) {
        var t, n, r;
        const i = e._freezeSettings(), s = function __PRIVATE_makeDatabaseInfo(e, t, n, r) {
            return new DatabaseInfo(e, t, n, r.host, r.ssl, r.experimentalForceLongPolling, r.experimentalAutoDetectLongPolling, __PRIVATE_cloneLongPollingOptions(r.experimentalLongPollingOptions), r.useFetchStreams);
        }(e._databaseId, (null === (t = e._app) || void 0 === t ? void 0 : t.options.appId) || "", e._persistenceKey, i);
        e._componentsProvider || (null === (n = i.localCache) || void 0 === n ? void 0 : n._offlineComponentProvider) && (null === (r = i.localCache) || void 0 === r ? void 0 : r._onlineComponentProvider) && (e._componentsProvider = {
            _offline: i.localCache._offlineComponentProvider,
            _online: i.localCache._onlineComponentProvider
        }), e._firestoreClient = new FirestoreClient(e._authCredentials, e._appCheckCredentials, e._queue, s, e._componentsProvider && function __PRIVATE_buildComponentProvider(e) {
            const t = null == e ? void 0 : e._online.build();
            return {
                _offline: null == e ? void 0 : e._offline.build(t),
                _online: t
            };
        }
        /**
     * Attempts to enable persistent storage, if possible.
     *
     * On failure, `enableIndexedDbPersistence()` will reject the promise or
     * throw an exception. There are several reasons why this can fail, which can be
     * identified by the `code` on the error.
     *
     *   * failed-precondition: The app is already open in another browser tab.
     *   * unimplemented: The browser is incompatible with the offline persistence
     *     implementation.
     *
     * Note that even after a failure, the {@link Firestore} instance will remain
     * usable, however offline persistence will be disabled.
     *
     * Note: `enableIndexedDbPersistence()` must be called before any other functions
     * (other than {@link initializeFirestore}, {@link (getFirestore:1)} or
     * {@link clearIndexedDbPersistence}.
     *
     * Persistence cannot be used in a Node.js environment.
     *
     * @param firestore - The {@link Firestore} instance to enable persistence for.
     * @param persistenceSettings - Optional settings object to configure
     * persistence.
     * @returns A `Promise` that represents successfully enabling persistent storage.
     * @deprecated This function will be removed in a future major release. Instead, set
     * `FirestoreSettings.localCache` to an instance of `PersistentLocalCache` to
     * turn on IndexedDb cache. Calling this function when `FirestoreSettings.localCache`
     * is already specified will throw an exception.
     */ (e._componentsProvider));
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An immutable object representing an array of bytes.
     */ class Bytes {
        /** @hideconstructor */
        constructor(e) {
            this._byteString = e;
        }
        /**
         * Creates a new `Bytes` object from the given Base64 string, converting it to
         * bytes.
         *
         * @param base64 - The Base64 string used to create the `Bytes` object.
         */    static fromBase64String(e) {
            try {
                return new Bytes(ByteString.fromBase64String(e));
            } catch (e) {
                throw new FirestoreError(F.INVALID_ARGUMENT, "Failed to construct data from Base64 string: " + e);
            }
        }
        /**
         * Creates a new `Bytes` object from the given Uint8Array.
         *
         * @param array - The Uint8Array used to create the `Bytes` object.
         */    static fromUint8Array(e) {
            return new Bytes(ByteString.fromUint8Array(e));
        }
        /**
         * Returns the underlying bytes as a Base64-encoded string.
         *
         * @returns The Base64-encoded string created from the `Bytes` object.
         */    toBase64() {
            return this._byteString.toBase64();
        }
        /**
         * Returns the underlying bytes in a new `Uint8Array`.
         *
         * @returns The Uint8Array created from the `Bytes` object.
         */    toUint8Array() {
            return this._byteString.toUint8Array();
        }
        /**
         * Returns a string representation of the `Bytes` object.
         *
         * @returns A string representation of the `Bytes` object.
         */    toString() {
            return "Bytes(base64: " + this.toBase64() + ")";
        }
        /**
         * Returns true if this `Bytes` object is equal to the provided one.
         *
         * @param other - The `Bytes` object to compare against.
         * @returns true if this `Bytes` object is equal to the provided one.
         */    isEqual(e) {
            return this._byteString.isEqual(e._byteString);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A `FieldPath` refers to a field in a document. The path may consist of a
     * single field name (referring to a top-level field in the document), or a
     * list of field names (referring to a nested field in the document).
     *
     * Create a `FieldPath` by providing field names. If more than one field
     * name is provided, the path will point to a nested field in a document.
     */ class FieldPath {
        /**
         * Creates a `FieldPath` from the provided field names. If more than one field
         * name is provided, the path will point to a nested field in a document.
         *
         * @param fieldNames - A list of field names.
         */
        constructor(...e) {
            for (let t = 0; t < e.length; ++t) if (0 === e[t].length) throw new FirestoreError(F.INVALID_ARGUMENT, "Invalid field name at argument $(i + 1). Field names must not be empty.");
            this._internalPath = new FieldPath$1(e);
        }
        /**
         * Returns true if this `FieldPath` is equal to the provided one.
         *
         * @param other - The `FieldPath` to compare against.
         * @returns true if this `FieldPath` is equal to the provided one.
         */    isEqual(e) {
            return this._internalPath.isEqual(e._internalPath);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Sentinel values that can be used when writing document fields with `set()`
     * or `update()`.
     */ class FieldValue {
        /**
         * @param _methodName - The public API endpoint that returns this class.
         * @hideconstructor
         */
        constructor(e) {
            this._methodName = e;
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An immutable object representing a geographic location in Firestore. The
     * location is represented as latitude/longitude pair.
     *
     * Latitude values are in the range of [-90, 90].
     * Longitude values are in the range of [-180, 180].
     */ class GeoPoint {
        /**
         * Creates a new immutable `GeoPoint` object with the provided latitude and
         * longitude values.
         * @param latitude - The latitude as number between -90 and 90.
         * @param longitude - The longitude as number between -180 and 180.
         */
        constructor(e, t) {
            if (!isFinite(e) || e < -90 || e > 90) throw new FirestoreError(F.INVALID_ARGUMENT, "Latitude must be a number between -90 and 90, but was: " + e);
            if (!isFinite(t) || t < -180 || t > 180) throw new FirestoreError(F.INVALID_ARGUMENT, "Longitude must be a number between -180 and 180, but was: " + t);
            this._lat = e, this._long = t;
        }
        /**
         * The latitude of this `GeoPoint` instance.
         */    get latitude() {
            return this._lat;
        }
        /**
         * The longitude of this `GeoPoint` instance.
         */    get longitude() {
            return this._long;
        }
        /**
         * Returns true if this `GeoPoint` is equal to the provided one.
         *
         * @param other - The `GeoPoint` to compare against.
         * @returns true if this `GeoPoint` is equal to the provided one.
         */    isEqual(e) {
            return this._lat === e._lat && this._long === e._long;
        }
        /** Returns a JSON-serializable representation of this GeoPoint. */    toJSON() {
            return {
                latitude: this._lat,
                longitude: this._long
            };
        }
        /**
         * Actually private to JS consumers of our API, so this function is prefixed
         * with an underscore.
         */    _compareTo(e) {
            return __PRIVATE_primitiveComparator(this._lat, e._lat) || __PRIVATE_primitiveComparator(this._long, e._long);
        }
    }

    /**
     * @license
     * Copyright 2024 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents a vector type in Firestore documents.
     * Create an instance with <code>{@link vector}</code>.
     *
     * @class VectorValue
     */ class VectorValue {
        /**
         * @private
         * @internal
         */
        constructor(e) {
            // Making a copy of the parameter.
            this._values = (e || []).map((e => e));
        }
        /**
         * Returns a copy of the raw number array form of the vector.
         */    toArray() {
            return this._values.map((e => e));
        }
        /**
         * Returns `true` if the two `VectorValue` values have the same raw number arrays, returns `false` otherwise.
         */    isEqual(e) {
            return function __PRIVATE_isPrimitiveArrayEqual(e, t) {
                if (e.length !== t.length) return false;
                for (let n = 0; n < e.length; ++n) if (e[n] !== t[n]) return false;
                return true;
            }(this._values, e._values);
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ const sn = /^__.*__$/;

    /** The result of parsing document data (e.g. for a setData call). */ class ParsedSetData {
        constructor(e, t, n) {
            this.data = e, this.fieldMask = t, this.fieldTransforms = n;
        }
        toMutation(e, t) {
            return null !== this.fieldMask ? new __PRIVATE_PatchMutation(e, this.data, this.fieldMask, t, this.fieldTransforms) : new __PRIVATE_SetMutation(e, this.data, t, this.fieldTransforms);
        }
    }

    function __PRIVATE_isWrite(e) {
        switch (e) {
          case 0 /* UserDataSource.Set */ :
     // fall through
                  case 2 /* UserDataSource.MergeSet */ :
     // fall through
                  case 1 /* UserDataSource.Update */ :
            return true;

          case 3 /* UserDataSource.Argument */ :
          case 4 /* UserDataSource.ArrayArgument */ :
            return false;

          default:
            throw fail(40011, {
                oc: e
            });
        }
    }

    /** A "context" object passed around while parsing user data. */ class __PRIVATE_ParseContextImpl {
        /**
         * Initializes a ParseContext with the given source and path.
         *
         * @param settings - The settings for the parser.
         * @param databaseId - The database ID of the Firestore instance.
         * @param serializer - The serializer to use to generate the Value proto.
         * @param ignoreUndefinedProperties - Whether to ignore undefined properties
         * rather than throw.
         * @param fieldTransforms - A mutable list of field transforms encountered
         * while parsing the data.
         * @param fieldMask - A mutable list of field paths encountered while parsing
         * the data.
         *
         * TODO(b/34871131): We don't support array paths right now, so path can be
         * null to indicate the context represents any location within an array (in
         * which case certain features will not work and errors will be somewhat
         * compromised).
         */
        constructor(e, t, n, r, i, s) {
            this.settings = e, this.databaseId = t, this.serializer = n, this.ignoreUndefinedProperties = r, 
            // Minor hack: If fieldTransforms is undefined, we assume this is an
            // external call and we need to validate the entire path.
            void 0 === i && this._c(), this.fieldTransforms = i || [], this.fieldMask = s || [];
        }
        get path() {
            return this.settings.path;
        }
        get oc() {
            return this.settings.oc;
        }
        /** Returns a new context with the specified settings overwritten. */    ac(e) {
            return new __PRIVATE_ParseContextImpl(Object.assign(Object.assign({}, this.settings), e), this.databaseId, this.serializer, this.ignoreUndefinedProperties, this.fieldTransforms, this.fieldMask);
        }
        uc(e) {
            var t;
            const n = null === (t = this.path) || void 0 === t ? void 0 : t.child(e), r = this.ac({
                path: n,
                cc: false
            });
            return r.lc(e), r;
        }
        hc(e) {
            var t;
            const n = null === (t = this.path) || void 0 === t ? void 0 : t.child(e), r = this.ac({
                path: n,
                cc: false
            });
            return r._c(), r;
        }
        Pc(e) {
            // TODO(b/34871131): We don't support array paths right now; so make path
            // undefined.
            return this.ac({
                path: void 0,
                cc: true
            });
        }
        Tc(e) {
            return __PRIVATE_createError(e, this.settings.methodName, this.settings.Ic || false, this.path, this.settings.Ec);
        }
        /** Returns 'true' if 'fieldPath' was traversed when creating this context. */    contains(e) {
            return void 0 !== this.fieldMask.find((t => e.isPrefixOf(t))) || void 0 !== this.fieldTransforms.find((t => e.isPrefixOf(t.field)));
        }
        _c() {
            // TODO(b/34871131): Remove null check once we have proper paths for fields
            // within arrays.
            if (this.path) for (let e = 0; e < this.path.length; e++) this.lc(this.path.get(e));
        }
        lc(e) {
            if (0 === e.length) throw this.Tc("Document fields must not be empty");
            if (__PRIVATE_isWrite(this.oc) && sn.test(e)) throw this.Tc('Document fields cannot begin and end with "__"');
        }
    }

    /**
     * Helper for parsing raw user input (provided via the API) into internal model
     * classes.
     */ class __PRIVATE_UserDataReader {
        constructor(e, t, n) {
            this.databaseId = e, this.ignoreUndefinedProperties = t, this.serializer = n || __PRIVATE_newSerializer(e);
        }
        /** Creates a new top-level parse context. */    dc(e, t, n, r = false) {
            return new __PRIVATE_ParseContextImpl({
                oc: e,
                methodName: t,
                Ec: n,
                path: FieldPath$1.emptyPath(),
                cc: false,
                Ic: r
            }, this.databaseId, this.serializer, this.ignoreUndefinedProperties);
        }
    }

    function __PRIVATE_newUserDataReader(e) {
        const t = e._freezeSettings(), n = __PRIVATE_newSerializer(e._databaseId);
        return new __PRIVATE_UserDataReader(e._databaseId, !!t.ignoreUndefinedProperties, n);
    }

    /** Parse document data from a set() call. */ function __PRIVATE_parseSetData(e, t, n, r, i, s = {}) {
        const o = e.dc(s.merge || s.mergeFields ? 2 /* UserDataSource.MergeSet */ : 0 /* UserDataSource.Set */ , t, n, i);
        __PRIVATE_validatePlainObject("Data must be an object, but it was:", o, r);
        const _ = __PRIVATE_parseObject(r, o);
        let a, u;
        if (s.merge) a = new FieldMask(o.fieldMask), u = o.fieldTransforms; else if (s.mergeFields) {
            const e = [];
            for (const r of s.mergeFields) {
                const i = __PRIVATE_fieldPathFromArgument$1(t, r, n);
                if (!o.contains(i)) throw new FirestoreError(F.INVALID_ARGUMENT, `Field '${i}' is specified in your field mask but missing from your input data.`);
                __PRIVATE_fieldMaskContains(e, i) || e.push(i);
            }
            a = new FieldMask(e), u = o.fieldTransforms.filter((e => a.covers(e.field)));
        } else a = null, u = o.fieldTransforms;
        return new ParsedSetData(new ObjectValue(_), a, u);
    }

    /**
     * Parses user data to Protobuf Values.
     *
     * @param input - Data to be parsed.
     * @param context - A context object representing the current path being parsed,
     * the source of the data being parsed, etc.
     * @returns The parsed value, or null if the value was a FieldValue sentinel
     * that should not be included in the resulting parsed data.
     */ function __PRIVATE_parseData(e, t) {
        if (__PRIVATE_looksLikeJsonObject(
        // Unwrap the API type from the Compat SDK. This will return the API type
        // from firestore-exp.
        e = getModularInstance(e))) return __PRIVATE_validatePlainObject("Unsupported field value:", t, e), 
        __PRIVATE_parseObject(e, t);
        if (e instanceof FieldValue) 
        // FieldValues usually parse into transforms (except deleteField())
        // in which case we do not want to include this field in our parsed data
        // (as doing so will overwrite the field directly prior to the transform
        // trying to transform it). So we don't add this location to
        // context.fieldMask and we return null as our parsing result.
        /**
     * "Parses" the provided FieldValueImpl, adding any necessary transforms to
     * context.fieldTransforms.
     */
        return function __PRIVATE_parseSentinelFieldValue(e, t) {
            // Sentinels are only supported with writes, and not within arrays.
            if (!__PRIVATE_isWrite(t.oc)) throw t.Tc(`${e._methodName}() can only be used with update() and set()`);
            if (!t.path) throw t.Tc(`${e._methodName}() is not currently supported inside arrays`);
            const n = e._toFieldTransform(t);
            n && t.fieldTransforms.push(n);
        }
        /**
     * Helper to parse a scalar value (i.e. not an Object, Array, or FieldValue)
     *
     * @returns The parsed value
     */ (e, t), null;
        if (void 0 === e && t.ignoreUndefinedProperties) 
        // If the input is undefined it can never participate in the fieldMask, so
        // don't handle this below. If `ignoreUndefinedProperties` is false,
        // `parseScalarValue` will reject an undefined value.
        return null;
        if (
        // If context.path is null we are inside an array and we don't support
        // field mask paths more granular than the top-level array.
        t.path && t.fieldMask.push(t.path), e instanceof Array) {
            // TODO(b/34871131): Include the path containing the array in the error
            // message.
            // In the case of IN queries, the parsed data is an array (representing
            // the set of values to be included for the IN query) that may directly
            // contain additional arrays (each representing an individual field
            // value), so we disable this validation.
            if (t.settings.cc && 4 /* UserDataSource.ArrayArgument */ !== t.oc) throw t.Tc("Nested arrays are not supported");
            return function __PRIVATE_parseArray(e, t) {
                const n = [];
                let r = 0;
                for (const i of e) {
                    let e = __PRIVATE_parseData(i, t.Pc(r));
                    null == e && (
                    // Just include nulls in the array for fields being replaced with a
                    // sentinel.
                    e = {
                        nullValue: "NULL_VALUE"
                    }), n.push(e), r++;
                }
                return {
                    arrayValue: {
                        values: n
                    }
                };
            }(e, t);
        }
        return function __PRIVATE_parseScalarValue(e, t) {
            if (null === (e = getModularInstance(e))) return {
                nullValue: "NULL_VALUE"
            };
            if ("number" == typeof e) return toNumber(t.serializer, e);
            if ("boolean" == typeof e) return {
                booleanValue: e
            };
            if ("string" == typeof e) return {
                stringValue: e
            };
            if (e instanceof Date) {
                const n = Timestamp.fromDate(e);
                return {
                    timestampValue: toTimestamp(t.serializer, n)
                };
            }
            if (e instanceof Timestamp) {
                // Firestore backend truncates precision down to microseconds. To ensure
                // offline mode works the same with regards to truncation, perform the
                // truncation immediately without waiting for the backend to do that.
                const n = new Timestamp(e.seconds, 1e3 * Math.floor(e.nanoseconds / 1e3));
                return {
                    timestampValue: toTimestamp(t.serializer, n)
                };
            }
            if (e instanceof GeoPoint) return {
                geoPointValue: {
                    latitude: e.latitude,
                    longitude: e.longitude
                }
            };
            if (e instanceof Bytes) return {
                bytesValue: __PRIVATE_toBytes(t.serializer, e._byteString)
            };
            if (e instanceof DocumentReference) {
                const n = t.databaseId, r = e.firestore._databaseId;
                if (!r.isEqual(n)) throw t.Tc(`Document reference is for database ${r.projectId}/${r.database} but should be for database ${n.projectId}/${n.database}`);
                return {
                    referenceValue: __PRIVATE_toResourceName(e.firestore._databaseId || t.databaseId, e._key.path)
                };
            }
            if (e instanceof VectorValue) 
            /**
     * Creates a new VectorValue proto value (using the internal format).
     */
            return function __PRIVATE_parseVectorValue(e, t) {
                const n = {
                    fields: {
                        [st]: {
                            stringValue: at
                        },
                        [ut]: {
                            arrayValue: {
                                values: e.toArray().map((e => {
                                    if ("number" != typeof e) throw t.Tc("VectorValues must only contain numeric values.");
                                    return __PRIVATE_toDouble(t.serializer, e);
                                }))
                            }
                        }
                    }
                };
                return {
                    mapValue: n
                };
            }
            /**
     * Checks whether an object looks like a JSON object that should be converted
     * into a struct. Normal class/prototype instances are considered to look like
     * JSON objects since they should be converted to a struct value. Arrays, Dates,
     * GeoPoints, etc. are not considered to look like JSON objects since they map
     * to specific FieldValue types other than ObjectValue.
     */ (e, t);
            throw t.Tc(`Unsupported field value: ${__PRIVATE_valueDescription(e)}`);
        }(e, t);
    }

    function __PRIVATE_parseObject(e, t) {
        const n = {};
        return isEmpty(e) ? 
        // If we encounter an empty object, we explicitly add it to the update
        // mask to ensure that the server creates a map entry.
        t.path && t.path.length > 0 && t.fieldMask.push(t.path) : forEach(e, ((e, r) => {
            const i = __PRIVATE_parseData(r, t.uc(e));
            null != i && (n[e] = i);
        })), {
            mapValue: {
                fields: n
            }
        };
    }

    function __PRIVATE_looksLikeJsonObject(e) {
        return !("object" != typeof e || null === e || e instanceof Array || e instanceof Date || e instanceof Timestamp || e instanceof GeoPoint || e instanceof Bytes || e instanceof DocumentReference || e instanceof FieldValue || e instanceof VectorValue);
    }

    function __PRIVATE_validatePlainObject(e, t, n) {
        if (!__PRIVATE_looksLikeJsonObject(n) || !function __PRIVATE_isPlainObject(e) {
            return "object" == typeof e && null !== e && (Object.getPrototypeOf(e) === Object.prototype || null === Object.getPrototypeOf(e));
        }(n)) {
            const r = __PRIVATE_valueDescription(n);
            throw "an object" === r ? t.Tc(e + " a custom object") : t.Tc(e + " " + r);
        }
    }

    /**
     * Helper that calls fromDotSeparatedString() but wraps any error thrown.
     */ function __PRIVATE_fieldPathFromArgument$1(e, t, n) {
        if ((
        // If required, replace the FieldPath Compat class with the firestore-exp
        // FieldPath.
        t = getModularInstance(t)) instanceof FieldPath) return t._internalPath;
        if ("string" == typeof t) return __PRIVATE_fieldPathFromDotSeparatedString(e, t);
        throw __PRIVATE_createError("Field path arguments must be of type string or ", e, 
        /* hasConverter= */ false, 
        /* path= */ void 0, n);
    }

    /**
     * Matches any characters in a field path string that are reserved.
     */ const on = new RegExp("[~\\*/\\[\\]]");

    /**
     * Wraps fromDotSeparatedString with an error message about the method that
     * was thrown.
     * @param methodName - The publicly visible method name
     * @param path - The dot-separated string form of a field path which will be
     * split on dots.
     * @param targetDoc - The document against which the field path will be
     * evaluated.
     */ function __PRIVATE_fieldPathFromDotSeparatedString(e, t, n) {
        if (t.search(on) >= 0) throw __PRIVATE_createError(`Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`, e, 
        /* hasConverter= */ false, 
        /* path= */ void 0, n);
        try {
            return new FieldPath(...t.split("."))._internalPath;
        } catch (r) {
            throw __PRIVATE_createError(`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`, e, 
            /* hasConverter= */ false, 
            /* path= */ void 0, n);
        }
    }

    function __PRIVATE_createError(e, t, n, r, i) {
        const s = r && !r.isEmpty(), o = void 0 !== i;
        let _ = `Function ${t}() called with invalid data`;
        n && (_ += " (via `toFirestore()`)"), _ += ". ";
        let a = "";
        return (s || o) && (a += " (found", s && (a += ` in field ${r}`), o && (a += ` in document ${i}`), 
        a += ")"), new FirestoreError(F.INVALID_ARGUMENT, _ + e + a);
    }

    /** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */ function __PRIVATE_fieldMaskContains(e, t) {
        return e.some((e => e.isEqual(t)));
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Converts custom model object of type T into `DocumentData` by applying the
     * converter if it exists.
     *
     * This function is used when converting user objects to `DocumentData`
     * because we want to provide the user with a more specific error message if
     * their `set()` or fails due to invalid data originating from a `toFirestore()`
     * call.
     */ function __PRIVATE_applyFirestoreDataConverter(e, t, n) {
        let r;
        // Cast to `any` in order to satisfy the union type constraint on
        // toFirestore().
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return r = e ? e.toFirestore(t) : t, 
        r;
    }

    function setDoc(e, t, n) {
        e = __PRIVATE_cast(e, DocumentReference);
        const r = __PRIVATE_cast(e.firestore, Firestore), i = __PRIVATE_applyFirestoreDataConverter(e.converter, t);
        return executeWrite(r, [ __PRIVATE_parseSetData(__PRIVATE_newUserDataReader(r), "setDoc", e._key, i, null !== e.converter, n).toMutation(e._key, Precondition.none()) ]);
    }

    /**
     * Locally writes `mutations` on the async queue.
     * @internal
     */ function executeWrite(e, t) {
        return function __PRIVATE_firestoreClientWrite(e, t) {
            const n = new __PRIVATE_Deferred;
            return e.asyncQueue.enqueueAndForget((async () => __PRIVATE_syncEngineWrite(await __PRIVATE_getSyncEngine(e), t, n))), 
            n.promise;
        }(ensureFirestoreConfigured(e), t);
    }

    /**
     * Cloud Firestore
     *
     * @packageDocumentation
     */ !function __PRIVATE_registerFirestore(e, t = true) {
        !function __PRIVATE_setSDKVersion(e) {
            v = e;
        }(SDK_VERSION), _registerComponent(new Component("firestore", ((e, {instanceIdentifier: n, options: r}) => {
            const i = e.getProvider("app").getImmediate(), s = new Firestore(new __PRIVATE_FirebaseAuthCredentialsProvider(e.getProvider("auth-internal")), new __PRIVATE_FirebaseAppCheckTokenProvider(i, e.getProvider("app-check-internal")), function __PRIVATE_databaseIdFromApp(e, t) {
                if (!Object.prototype.hasOwnProperty.apply(e.options, [ "projectId" ])) throw new FirestoreError(F.INVALID_ARGUMENT, '"projectId" not provided in firebase.initializeApp.');
                return new DatabaseId(e.options.projectId, t);
            }(i, n), i);
            return r = Object.assign({
                useFetchStreams: t
            }, r), s._setSettings(r), s;
        }), "PUBLIC").setMultipleInstances(true)), registerVersion(S, D, e), 
        // BUILD_TARGET will be replaced by values like esm2017, cjs2017, etc during the compilation
        registerVersion(S, D, "esm2017");
    }();

    // imports

    // firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyCGyK2CUBIsDen5PN6rR8wSV23JQXwcCes",
      authDomain: "phishing-f4a58.firebaseapp.com",
      projectId: "phishing-f4a58",
      storageBucket: "phishing-f4a58.firebasestorage.app",
      messagingSenderId: "789589561947",
      appId: "1:789589561947:web:4bf5306862472c915c257e",
      measurementId: "G-ST9ZKKDMXX"
    };

    // initialize firebase
    const app = initializeApp(firebaseConfig);

    // load DOM first
    document.addEventListener("DOMContentLoaded", function() {
      console.log("DOM fully loaded and parsed");

      // element references from DOM
      const optInCheckbox = document.getElementById("optInCheckbox");
      const signupSubmit = document.getElementById("signupSubmit");
      const signupForm = document.getElementById("signupForm");
      const loginForm = document.getElementById("loginForm");
      const toggleModeBtn = document.getElementById("toggleModeBtn");
      const title = document.getElementById("title");
      const forgotPasswordLink = document.getElementById("forgotPasswordLink");
      const forgotPasswordModal = document.getElementById("forgotPasswordModal");
      const closeModal = document.getElementById("closeModal");
      const forgotPasswordForm = document.getElementById("forgotPasswordForm");
      const sendOtpBtn = document.getElementById("sendOtpBtn");
      const otpField = document.getElementById("otpField");

      // initialize firebase services
      const auth = getAuth(app);
      const db = getFirestore(app);

      optInCheckbox.addEventListener("change", function () {
        signupSubmit.disabled = !this.checked;
      });

      // debug - check for all elements in DOM
      if (!signupForm || !loginForm || !toggleModeBtn || !title) {
        console.error("One or more required DOM elements are missing.");
        return;
      }

      let isOtpVerified = false;
      let isLoginMode = false;

      // switch between log in and sign up
      toggleModeBtn.addEventListener("click", function () {
        console.log("toggleModeBtn clicked");
        isLoginMode = !isLoginMode;
        console.log("New mode:", isLoginMode ? "Login" : "Sign Up");

        // shows or hides fields based on mode
        if (isLoginMode) {
          signupForm.style.display = "none";
          loginForm.style.display = "block";
          title.textContent = "Log In";
          toggleModeBtn.textContent = "Switch to Sign Up";
        } else {
          loginForm.style.display = "none";
          signupForm.style.display = "block";
          title.textContent = "Sign Up";
          toggleModeBtn.textContent = "Switch to Log In";
        }
      });

      // password validation
      function isPasswordValid(password) {
        // regex to ensure pw is at least 8 char with 1 symbol, 1 uppercase, and one number
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
      }

      // phone number validation
      function isPhoneNumberValid(phone) {
        // regex for phone number
        const phoneRegex = /^\+?\d{1,15}$/;
        return phoneRegex.test(phone);
      }

      // sends OTP
      async function sendOtp(phone) {
        console.log("Attempting to send OTP to:", phone);
        try {
          const response = await fetch("http://localhost:3000/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone })
          });
          const result = await response.json();
          console.log("sendOtp response:", result);
          if (result.success) {
            alert("OTP sent to your phone.");
            otpField.style.display = "block";
          } else {
            alert("Failed to send OTP. Please try again.");
          }
        } catch (error) {
          console.error("Error sending OTP:", error);
        }
      }

      // verifies OTP
      async function verifyOtp(phone, otp) {
        console.log("Verifying OTP for phone:", phone, "with OTP:", otp);
        try {
          const response = await fetch("http://localhost:3000/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, otp })
          });
          const result = await response.json();
          console.log("verifyOtp response:", result);
          return result.success;
        } catch (error) {
          console.error("Error verifying OTP:", error);
          return false;
        }
      }

      // handle send OTP button click
      sendOtpBtn.addEventListener("click", () => {
        console.log("Send OTP button clicked");
        const phone = document.getElementById("signupPhone").value.trim();
        console.log("Phone entered:", phone);
        if (phone) {
          if (isPhoneNumberValid(phone)) {
            sendOtp(phone);
          } else {
            alert("Please enter a valid phone number.");
          }
        } else {
          alert("No phone number provided. MFA is optional, but you must enter a valid phone if you want to use it.");
        }
      });

      // sign up form
      signupForm.addEventListener("submit", async (event) => {
        console.log("Signup form submitted");
        event.preventDefault();

        // gets input from user and trims whitespace
        const name = document.getElementById("signupName").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const phone = document.getElementById("signupPhone").value.trim();
        const otp = document.getElementById("otpCode").value.trim();
        const password = document.getElementById("signupPassword").value.trim();

        console.log("User details:", { name, email, phone, password });

        // ensures all fields are filled
        if (!name || !email || !password) {
          alert("Please fill in all required fields.");
          return;
        }

        // message if pw doesn't meet criteria
        if (!isPasswordValid(password)) {
          alert("Password must be at least 8 characters long, include at least one uppercase letter, one number, and one symbol.");
          return;
        }

        if (phone) {
          if (otpField.style.display === "block" && !isOtpVerified) {
            console.log("OTP field visible, verifying OTP");
            isOtpVerified = await verifyOtp(phone, otp);
            if (!isOtpVerified) {
              alert("Invalid OTP. Please try again.");
              return;
            }
            alert("Phone number verified.");
          } else {
            console.log("OTP not required or already verified (phone provided).");
          }
        } else {
          // skip OTP if no phone is provided
          console.log("No phone provided, skipping OTP.");
        }

        // create new user in firebase
        try {
          console.log("Creating user with Firebase...");
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          console.log("User created:", user);

          // send verification email
          await sendEmailVerification(user);
          console.log("Verification email sent to:", user.email);

          // save data in firebase under user's UID
          await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            phone: phone,  // store empty string if no phone
            createdAt: new Date().toISOString()
          });
          console.log("User data saved to Firestore");

          // success or error message upon registering
          alert(`User ${user.email} registered successfully! A verification email has been sent.`);
        } catch (error) {
          console.error("Error during signup:", error);
          alert(`Error: ${error.message}`);
        }
      });

      // sign in form
      loginForm.addEventListener("submit", async (event) => {
        console.log("Login form submitted");
        event.preventDefault();

        // gets input from user and trims whitespace
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        if (!email || !password) {
          alert("Please fill in both email and password.");
          return;
        }

        try {
          console.log("Signing in user with email:", email);

          // sign in using firebase authentication
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          console.log("User signed in:", user);
          alert(`Welcome back, ${user.email}!`);

          // ——— HERE is the new logic ———
          // mark the user as logged in
          chrome.storage.local.set({ isLoggedIn: true }, () => {
            // close this tab (it was opened programmatically)
            window.close();
          });
          // ————————————————————————
        } catch (error) {
          console.error("Login failed:", error);
          alert(`Login failed: ${error.message}`);
        }
      });

      // open forgot password modal
      forgotPasswordLink.addEventListener("click", (event) => {
        console.log("Forgot password link clicked");
        event.preventDefault();
        forgotPasswordModal.style.display = "block";
      });

      // close forgot password modal
      closeModal.addEventListener("click", () => {
        console.log("Close modal clicked");
        forgotPasswordModal.style.display = "none";
      });

      // close forgot password modal if user clicks elsewhere
      window.addEventListener("click", (event) => {
        if (event.target === forgotPasswordModal) {
          console.log("Clicked outside modal; closing modal");
          forgotPasswordModal.style.display = "none";
        }
      });

      // submit forgot password form
      forgotPasswordForm.addEventListener("submit", async (event) => {
        console.log("Forgot password form submitted");
        event.preventDefault();

        // get email address from modal
        const email = document.getElementById("modalEmail").value.trim();

        // ensure email is filled
        if (!email) {
          alert("Email is required.");
          return;
        }
        try {
          // send password reset email
          console.log("Sending password reset email to:", email);
          await sendPasswordResetEmail(auth, email);
          alert("Check email for password reset instructions.");
        } catch (error) {
          console.error("Error sending password reset email:", error);
          alert(`Error: ${error.message}`);
        }
        forgotPasswordModal.style.display = "none";
      });
    });

})();
//# sourceMappingURL=register.bundle.js.map
