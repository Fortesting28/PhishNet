type PartialURL = {
    host?: string;
    path?: string;
    protocol?: string;
    relative?: string;
    search?: string;
    hash?: string;
};
type RelativeURL = {
    isRelative: true;
    pathname: URL['pathname'];
    search: URL['search'];
    hash: URL['hash'];
};
type URLObject = RelativeURL | URL;
/**
 * Checks if the URL object is relative
 *
 * @param url - The URL object to check
 * @returns True if the URL object is relative, false otherwise
 */
export declare function isURLObjectRelative(url: URLObject): url is RelativeURL;
/**
 * Parses string to a URL object
 *
 * @param url - The URL to parse
 * @returns The parsed URL object or undefined if the URL is invalid
 */
export declare function parseStringToURLObject(url: string, urlBase?: string | URL | undefined): URLObject | undefined;
/**
 * Takes a URL object and returns a sanitized string which is safe to use as span name
 * see: https://develop.sentry.dev/sdk/data-handling/#structuring-data
 */
export declare function getSanitizedUrlStringFromUrlObject(url: URLObject): string;
/**
 * Parses string form of URL into an object
 * // borrowed from https://tools.ietf.org/html/rfc3986#appendix-B
 * // intentionally using regex and not <a/> href parsing trick because React Native and other
 * // environments where DOM might not be available
 * @returns parsed URL object
 */
export declare function parseUrl(url: string): PartialURL;
/**
 * Strip the query string and fragment off of a given URL or path (if present)
 *
 * @param urlPath Full URL or path, including possible query string and/or fragment
 * @returns URL or path without query string or fragment
 */
export declare function stripUrlQueryAndFragment(urlPath: string): string;
/**
 * Takes a URL object and returns a sanitized string which is safe to use as span name
 * see: https://develop.sentry.dev/sdk/data-handling/#structuring-data
 */
export declare function getSanitizedUrlString(url: PartialURL): string;
export {};
//# sourceMappingURL=url.d.ts.map