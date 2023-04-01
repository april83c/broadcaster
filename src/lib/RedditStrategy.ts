// this strategy comes from https://github.com/oralekin/oth-verification/blob/place/server/lib/RedditStrategyBad.js

import * as OAuth2 from 'passport-oauth2';
import * as passport from 'passport';
import { oauth2tokenCallback } from 'oauth';
import { OutgoingHttpHeaders } from 'http';
import { StateStore } from 'passport-oauth2';
const InternalOAuthError = OAuth2.Strategy.InternalOAuthError;

interface RedditStrategyOptions {
    authorizationURL?: string;
    tokenURL?: string;
    clientID: string;
    clientSecret: string;
    callbackURL?: string | undefined;
    customHeaders?: OutgoingHttpHeaders | undefined;
    scope?: string | string[] | undefined;
    scopeSeparator?: string | undefined;
    sessionKey?: string | undefined;
    store?: StateStore | undefined;
    state?: any;
    skipUserProfile?: any;
    pkce?: boolean | undefined;
    proxy?: any;
}

class RedditStrategy extends OAuth2.Strategy {
    constructor(options: RedditStrategyOptions, verify: OAuth2.VerifyFunction) {
        options = options;
        options.customHeaders = options.customHeaders || {};
        options.authorizationURL = options.authorizationURL || 'https://www.reddit.com/api/v1/authorize';
        options.tokenURL = options.tokenURL || 'https://www.reddit.com/api/v1/access_token';
        options.scopeSeparator = options.scopeSeparator || ' ';

        super(options as OAuth2.StrategyOptions, verify)

        this._oauth2.useAuthorizationHeaderforGET(true); 
        this.name = "reddit";
        
        function getAccessToken(code: string, callback: oauth2tokenCallback): void;
        function getAccessToken(code: string, params: any, callback: oauth2tokenCallback): void;
        function getAccessToken(code: string, paramsOrCallback: any | oauth2tokenCallback, callback?: oauth2tokenCallback): void {
            var params: any;
            if (!callback) { // I don't actually have any idea whether this is necessary or not. But I think it is from looking at docs
                callback = paramsOrCallback;
                params = {};
            } else {
                params = params || {};
            }
            params.type = 'web_server';
            params.grant_type = 'authorization_code';
            params.redirect_uri = options.callbackURL;

            var codeParam = (params.grant_type === 'refresh_token') ? 'refresh_token' : 'code';
            params[codeParam]= code;

            var post_data= (new URLSearchParams(params)).toString();
            var authorization = "Basic " + Buffer.from("" + this._clientId + ":" + this._clientSecret).toString('base64');
            var post_headers= {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization' : authorization
            };
    
            this._request("POST", this._getAccessTokenUrl(), post_headers, post_data, null, (error: any, data: any, response: any) => { // FIXME: all of this is any ;-;
                if (error) {
                    callback(error, null, null, null);
                } else {
                    var results = JSON.parse( data );
                    var access_token = results.access_token;
                    var refresh_token = results.refresh_token;
                    delete results.refresh_token;
                    callback(null, access_token, refresh_token, results); // callback results =^.^=
                }
            });
        }

        this._oauth2.getOAuthAccessToken = getAccessToken;
    }

    userProfile(accessToken: string, done: passport.DoneCallback) {
        this._oauth2.get('https://oauth.reddit.com/api/v1/me', accessToken, (err: any, body: any) => {
            if (err || body instanceof Buffer || body === undefined) 
                return done(new InternalOAuthError('Failed to fetch the user profile.', err))
            try {
                const json = JSON.parse(body);
                if (!json.id || !json.name) { return done(new InternalOAuthError('Failed to get user profile (response does not contain id and/or name)', null)) };
                const parsedData = {
                    _raw: body,
                    _json: json,
                    provider: "reddit",
                    id: json.id,
                    name: json.name
                }
                return done(null, parsedData);
            }
            catch (e) {
                return done(new InternalOAuthError('Failed to parse the user profile.', e));
            }
        });
    }

    authorizationParams(options: any) {
        return { duration: "temporary", state: "meow" };
    }
}

export { RedditStrategy };