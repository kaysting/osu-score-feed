const axios = require('axios');

class OsuAPIv2 {
    /**
     * Create a new osu! API v2 instance.
     * @param {OsuAPIv2Options} opts Configuration options.
     */
    constructor(opts = {}) {
        this.clientId = opts.clientId;
        this.clientSecret = opts.clientSecret;
        this.refreshToken = opts.refreshToken;
        this.scopes = opts.scopes ?? ['public'];
        this.accessToken = null;
        this.baseUrl = opts.baseUrl ?? 'https://osu.ppy.sh/api/v2';
        this.redirectUri = opts.redirectUri ?? 'http://localhost:3000';
        this.rateLimitLimit = opts.rateLimitLimit ?? 1200;
        this.rateLimitRemaining = opts.rateLimitLimit ?? 1200;
        this.rateLimitPerSec = opts.rateLimitPerSec ?? 20;
        this.rateLimitMin = 200;
        this.lastRequestTime = 0;
        this.tokenExpireTime = 0;
        this.timeout = opts.timeout ?? 30;
        this.maxRetries = opts.maxRetries ?? 5;
        this.onTokenRefresh = opts.onTokenRefresh ?? (() => {});
        this.getTokenPromise = null;
    }

    /**
     * Internal: Get the currently active bearer access token, refreshing it if necessary.
     * @param {string} [code] A code from an authorization code grant. If provided, a user access token will be fetched.
     * @returns {string}
     */
    async _getToken(code) {
        if (this.getTokenPromise) return this.getTokenPromise;

        this.getTokenPromise = new Promise(async (resolve, reject) => {
            try {
                const now = Date.now();

                if (now < this.tokenExpireTime && this.accessToken) {
                    resolve(this.accessToken);
                }

                const formData = new URLSearchParams();
                formData.append('client_id', this.clientId);
                formData.append('client_secret', this.clientSecret);
                if (code) {
                    formData.append('grant_type', 'authorization_code');
                    formData.append('redirect_uri', this.redirectUri);
                    formData.append('code', code);
                } else {
                    if (this.refreshToken) {
                        formData.append('grant_type', 'refresh_token');
                        formData.append('refresh_token', this.refreshToken);
                    } else {
                        formData.append('grant_type', 'client_credentials');
                    }
                    formData.append('scope', this.scopes.join(' '));
                }

                let res = await axios.post('https://osu.ppy.sh/oauth/token', formData);

                this.accessToken = res.data.access_token;
                if (res.refresh_token) this.refreshToken = res.refresh_token;
                // Get expire time from returned expires_in and subtract a minute just for safety
                this.tokenExpireTime = now + res.data.expires_in * 1000 - 60 * 1000;

                // Call refresh callback
                this.onTokenRefresh({
                    accessToken: this.accessToken,
                    expiresAt: this.tokenExpireTime,
                    refreshToken: this.refreshToken ?? undefined
                });

                resolve(this.accessToken);
            } catch (error) {
                reject(error);
            } finally {
                this.getTokenPromise = null;
            }
        });

        return this.getTokenPromise;
    }

    /**
     * Get an OAuth user authorization URL.
     *
     * You must have configured `redirect_uri` to ensure the resulting code grant is sent back to your server.
     *
     * Once a request to your `redirect_uri` is received, get the code from the request query (`req.query.code` in express), and pass it to `authorizeWithCode()` to start making requests on behalf of the user.
     *
     * It's important to note that once authorized, this instance of OsuAPIv2 will be tied to the authorized user. You cannot return to client credentials (no user), but you can authorize a different user.
     * @param {string} [state] Optional: A value that will be returned in the code grant response that can be used to verify its authenticity. You are responsible for verifying the state in your request handler.
     * @returns {string}
     */
    getAuthorizationUrl(state) {
        const params = Object.entries({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            ...(state ? { state } : {}),
            scope: this.scopes.join(' ')
        })
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        return `https://osu.ppy.sh/oauth/authorize?${params}`;
    }

    /**
     * Sign in as the user whose code grant you received as a response from `getAuthorizationUrl()` and start making requests on their behalf.
     * @param {string} code The code you received from osu!
     * @returns {this}
     */
    async authorizeWithCode(code) {
        await this._getToken(code);
        return this;
    }

    /**
     * Internal: Get the number of available rate limit credits based on the time of the previous request.
     * @returns {number} Available limit credits.
     */
    _getAvailableRateLimit() {
        const now = Date.now();
        const msSinceLastRequest = now - this.lastRequestTime;
        return Math.min(
            this.rateLimitLimit,
            this.rateLimitRemaining + Math.floor((msSinceLastRequest / 1000) * this.rateLimitPerSec)
        );
    }

    /**
     * Internal: Make a request to osu! API v2.
     * @param {RequestMethod} method Request method.
     * @param {string} path API endpoint path, including leading slash.
     * @param {Object} [query] Request query parameters as an object.
     * @param {any} [body] Request body (Object or UrlSearchParams) (only for `POST` and `PUT` requests).
     * @returns {Object} Response data.
     */
    async _request(method, path, query, body) {
        let waitTime = 3000;
        let tries = 0;

        while (true) {
            try {
                tries++;

                // Throttle if limit remaining is too low
                const limitRemainingNow = this._getAvailableRateLimit();
                if (limitRemainingNow < this.rateLimitMin) {
                    const waitMs = Math.ceil(((this.rateLimitMin - limitRemainingNow) / this.rateLimitPerSec) * 1000);
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                }

                // Pessimistically pay for the request
                this.rateLimitRemaining -= this.rateLimitMin;

                // Get token
                const token = await this._getToken();

                // Make request
                const res = await axios({
                    method: method,
                    url: this.baseUrl + path,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json'
                    },
                    timeout: this.timeout * 1000,
                    params: query,
                    data: body
                });

                // Update rate limit info
                this.lastRequestTime = Date.now();
                const limitRemainingFromHeader = parseInt(res.headers['x-ratelimit-remaining']);
                if (!isNaN(limitRemainingFromHeader)) {
                    this.rateLimitRemaining = limitRemainingFromHeader;
                } else {
                    console.warn(`[OsuAPIv2] Warning: Missing X-RateLimit-Remaining header on ${method} ${path}`);
                }

                // Return data
                return res.data;
            } catch (error) {
                const status = error?.response?.status || null;

                // If status is undefined (network errors), 429 (rate limit), or 500 (server error),
                // wait and retry using exponential backoff and jitter
                // Otherwise, attach data and status to a new error and throw it
                if ((!status || status === 429 || status >= 500) && tries < this.maxRetries) {
                    console.warn(
                        `[OsuAPIv2] ${status || error.code || error.toString()} on ${method} ${path}, trying again (${tries + 1}/${this.maxRetries}) in ${Math.round(waitTime)}ms`
                    );
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    waitTime = Math.min(waitTime * 2 + 0.2 * waitTime * Math.random(), 60 * 1000);
                } else {
                    const e = new Error(
                        `Error making ${method} request to osu! API v2 ${path}: ${error.message || error}`
                    );
                    e.data = error?.response?.data || null;
                    e.status = status;
                    throw e;
                }
            }
        }
    }

    /**
     * Make a GET request to the osu! API.
     * @param {string} path Endpoint path.
     * @param {Object} query Query params.
     */
    async get(path, query) {
        return this._request('GET', path, query || undefined);
    }
}

module.exports = OsuAPIv2;
