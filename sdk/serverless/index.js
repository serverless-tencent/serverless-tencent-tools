'use strict';
const util = require('util');
const assert = require('assert');
const {sls, common} = require('../../library');
const ClientProfile = common.ClientProfile;
const HttpProfile = common.HttpProfile;
const Credential = common.Credential;
const SlsClient = sls.v20200205.Client;
const SlsModels = sls.v20200205.Models;
const { BindRole } = require('../cam');
// const ClientProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/client_profile.js');
// const HttpProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/http_profile.js');
// const { Credential } = Tencentcloud.common;

class Serverless {
    constructor ({appid, secret_id, secret_key, options}) {
        this.appid = appid;
        this.secretKey = secret_key;
        this.secretId = secret_id;
        this.options = options;
        assert(options, 'Options should not is empty');
        this._slsClient = Serverless.createClient(secret_id, secret_key, options);
    }


    static getCredential(secret_id, secret_key, options) {
        const cred = options.token
          ? new Credential(secret_id, secret_key, options.token)
          : new Credential(secret_id, secret_key)
        const httpProfile = new HttpProfile();
        httpProfile.reqTimeout = 30;
        const clientProfile = new ClientProfile('HmacSHA256', httpProfile);
        assert(options.region, 'Region should not is empty');
        return {
            cred: cred,
            region: options.region,
            clientProfile: clientProfile
        }
    }


    static createClient(secret_id, secret_key, options) {
        const info = Serverless.getCredential(secret_id, secret_key, options);
        const scfCli = new SlsClient(info.cred, info.region, info.clientProfile);
        scfCli.sdkVersion = 'ServerlessFramework';
        return scfCli;
    }


    async getComponentAndVersions(name) {
        const compVersion = {
            ComponentName: name
        }
        const req = new SlsModels.GetComponentAndVersionsRequest();
        req.from_json_string(JSON.stringify(compVersion));
        return await this._call('GetComponentAndVersions', req);
    }

    async _call(api, params) {
        const handler = util.promisify(this._slsClient[api].bind(this._slsClient));
        return await handler(params);
    }


    async getComponentVersion(name, version) {
        const componentVersion = {
            ComponentName: name, 
            ComponentVersion: version
        }
        const req = new SlsModels.GetComponentVersionRequest();
        req.from_json_string(JSON.stringify(componentVersion));
        return await this._call('GetComponentVersion', req);
    }


    async prePublishComponent(body) {
        const pubComponent = {
            Body: body
        }

        const req = new SlsModels.PrePublishComponentRequest();
        req.from_json_string(JSON.stringify(pubComponent));
        return await this._call('PrePublishComponent', req);
    }


    async postPublishComponent(body) {
        const pubComponent = {
            Body: body
        }
        const req = new SlsModels.PostPublishComponentRequest();
        req.from_json_string(JSON.stringify(pubComponent));
        return await this._call('PostPublishComponent', req);
    }


    async getInstance(body) {
        const ins = {
            Body: body
        }
        const req = new SlsModels.GetInstanceRequest();
        req.from_json_string(JSON.stringify(ins));
        return await this._call('GetInstance', req);
    }


    async saveInstance(body) {
        const ins = {
            Body: body
        }
        const req = new SlsModels.SaveInstanceRequest();
        req.from_json_string(JSON.stringify(ins));
        return await this._call('SaveInstance', req);
    }


    async listInstances(body) {
        const ins = {
            Body: body
        }
        const req = new SlsModels.ListInstancesRequest();
        req.from_json_string(JSON.stringify(ins));
        return await this._call('ListInstances', req);
    }


    async getUploadUrls(body) {
        const uploadUrl = {
            Body: body
        }
        const req = new SlsModels.GetUploadUrlsRequest();
        req.from_json_string(JSON.stringify(uploadUrl));
        return await this._call('GetUploadUrls', req);
    }


    async runComponent(body) {
        const comp = {
            Body: body
        }
        const req = new SlsModels.RunComponentRequest();
        req.from_json_string(JSON.stringify(comp));
        return await this._call('RunComponent', req);
    }


    async runFinishComponent(body) {
        const comp = {
            Body: body
        }
        const req = new SlsModels.RunFinishComponentRequest();
        req.from_json_string(JSON.stringify(comp));
        return await this._call('RunFinishComponent', req);
    }


    // async unpublishComponentVersion(name, version) {
    //     const componentVersion = {
    //         Name: name, 
    //         ComponentVersion: version
    //     }
    //     const req = new SlsModels.UnpublishComponentVersionRequest();
    //     req.from_json_string(JSON.stringify(componentVersion));
    //     return await this._call('UnpublishComponentVersion', req);
    // }
    

    // async publishComponentVersion({name, componentVersion, org, author, description, keywords, license}) {
        
    //     const camRole = new BindRole.BindRole({
    //         SecretId: this.secret_id, 
    //         SecretKey: this.secret_key,
    //         token: this.options.token
    //     });

    //     camRole.bindSLSQcsRole();

    //     const pubComVersionRequest = {
    //         Name: name,
    //         ComponentVersion: componentVersion,
    //         Org: org,
    //         Author: author,
    //         Description: description,
    //         Keywords: keywords,
    //         License: license
    //     }

    //     const req = new SlsModels.PublishComponentVersionRequest()
    //     req.from_json_string(JSON.stringify(pubComVersionRequest));
    //     return await this._call('PublishComponentVersion', req);
    // }


    // async fetchComponentMetadata(name, version) {
    //     const componentVersion = {
    //         Name: name, 
    //         ComponentVersion: version
    //     }
    //     const req = new SlsModels.FetchComponentMetadataRequest();
    //     req.from_json_string(JSON.stringify(componentVersion));
    //     return await this._call('FetchComponentMetadata', req);
    // }
}

module.exports = Serverless;