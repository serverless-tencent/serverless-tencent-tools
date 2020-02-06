const Capi = require('qcloudapi-sdk');
// const Joi = require('joi');
const os = require('os');
const Api = require('./library/api');
const util = require('util');
const fs = require('fs');
const tencentcloud = require('tencentcloud-sdk-nodejs');
const models = tencentcloud.scf.v20180416.Models;

const { 
  CreateApi,
  DeleteApi,
  CreateService,
  DeleteService,
  ReleaseService,
  UnReleaseService,
  DescribeApi,
  ZipArchive } = require('./library/util');


class Websocket {
  constructor (secret_id, secret_key, token, region) {
    this.region = region;
    this.apig = new Capi({
      SecretId: secret_id,
      SecretKey: secret_key,
      serviceType: 'apigateway',
      Token: token
    });
    this.api = new Api({
      secret_id: secret_id,
      secret_key: secret_key,
      options: {
        token: token,
        region: region
      }
    });
  }


  async createWsScf() {

    const nowTime = new Date();
    let codePath = util.format('%s/example/scf_ws_create', __dirname);
    const functionNameByCreate = util.format('scf_ws_create_%d', parseInt(nowTime.getTime() / 1000))
    let output = util.format('%s/%s.zip', os.tmpdir(), functionNameByCreate);

    await ZipArchive(codePath, output);

    let zipFileContent = fs.readFileSync(output);
    let zipBase64Content = new Buffer.from(zipFileContent).toString('base64');
    const createFuncRequest = {
      Region: this.region,
      FunctionName: functionNameByCreate,
      Code: {
        ZipFile: zipBase64Content,
      },
      Namespace: 'default',
      Runtime: 'Python2.7',
      Handler: 'index.main_handler',
      Role: 'QCS_SCFExcuteRole',
      MemorySize: 128,
      Timeout: 3,
      Description: 'ServerlessFramework Websocket Function'
    }

    const req = new models.CreateFunctionRequest();
    req.from_json_string(JSON.stringify(createFuncRequest));
    let handler = util.promisify(this.api.scfClient.CreateFunction.bind(this.api.scfClient));
    try {
      await handler(req);
      fs.accessSync(output);
      fs.unlinkSync(output);
    } catch (e) {
      throw e
    }

    // data scf 
    codePath = util.format('%s/example/scf_ws_data', __dirname);
    const functionNameByData = util.format('scf_ws_data_%d', parseInt(nowTime.getTime() / 1000))
    output = util.format('%s/%s.zip', os.tmpdir(), functionNameByData);

    await ZipArchive(codePath, output);

    zipFileContent = fs.readFileSync(output);
    zipBase64Content = new Buffer.from(zipFileContent).toString('base64');
    createFuncRequest['FunctionName'] = functionNameByData;
    createFuncRequest['Code']['ZipFile'] = zipBase64Content;

    req.from_json_string(JSON.stringify(createFuncRequest));
    handler = util.promisify(this.api.scfClient.CreateFunction.bind(this.api.scfClient));
    try {
      await handler(req);
      fs.accessSync(output);
      fs.unlinkSync(output);
    } catch (e) {
      throw e
    }
   
    // destroy 
    codePath = util.format('%s/example/scf_ws_destroy', __dirname);
    const functionNameByDestroy = util.format('scf_ws_destroy_%d', parseInt(nowTime.getTime() / 1000))
    output = util.format('%s/%s.zip', os.tmpdir(), functionNameByDestroy);

    await ZipArchive(codePath, output);

    zipFileContent = fs.readFileSync(output);
    zipBase64Content = new Buffer.from(zipFileContent).toString('base64');
    createFuncRequest['FunctionName'] = functionNameByDestroy;
    createFuncRequest['Code']['ZipFile'] = zipBase64Content;

    req.from_json_string(JSON.stringify(createFuncRequest));
    handler = util.promisify(this.api.scfClient.CreateFunction.bind(this.api.scfClient));
    try {
      await handler(req);
      fs.accessSync(output);
      fs.unlinkSync(output);
    } catch (e) {
      throw e
    }

    return {
      'register': {
        'functionName': functionNameByCreate,
        'namspace': 'default',
        'qualifier': '$LATEST'
      },
      'data': {
        'functionName': functionNameByData,
        'namspace': 'default',
        'qualifier': '$LATEST'
      },
      'destroy': {
        'functionName': functionNameByDestroy,
        'namspace': 'default',
        'qualifier': '$LATEST'
      }
    }
  }


  async getFunction(ns, funcName, showCode) {
    const req = new models.GetFunctionRequest();
    const body = {
      FunctionName: funcName,
      Namespace: ns,
      ShowCode: showCode ? 'TRUE' : 'FALSE'
    }
    req.from_json_string(JSON.stringify(body));
    const handler = util.promisify(this.api.scfClient.GetFunction.bind(this.api.scfClient));
    try {
      return await handler(req);
    } catch (e) {
      if (e.code == 'ResourceNotFound.FunctionName' || e.code == 'ResourceNotFound.Function') {
        return null;
      }
      throw e
    }
  }


  async updateWsScfCode(ws_push_url, ws_scf) {
    const copyAndReplaceCode = function (src_dir, dst_dir, replace_func) {
      const dirs = fs.readdirSync(src_dir);
      const size = dirs.length;
      for (let i = 0; i < size; i++) {
        const srcFileName = util.format('%s/%s', src_dir, dirs[i]);
        const dstFileName = util.format('%s/%s', dst_dir, dirs[i]);
        if (replace_func(srcFileName, dstFileName, dirs[i]))
          continue;
        fs.writeFileSync(dstFileName, fs.readFileSync(srcFileName));
      }
    }

    for (let key in ws_scf) {
      if (key == 'register')
        continue;
      let dirName = ''
      if (key == 'data') 
        dirName = 'scf_ws_data';
      if (key == 'destroy')
        dirName = 'scf_ws_destroy';
      const codePath = util.format('%s/example/%s', __dirname, dirName);
      const tmpPath = util.format('%s/%s', os.tmpdir(), dirName);
      try {
        fs.accessSync(tmpPath);
      } catch (err) {
        fs.mkdirSync(tmpPath)
      }
      copyAndReplaceCode(codePath, tmpPath, function (src_file, dst_file, name) {
        if (name == 'index.py') {
          const oldContent = fs.readFileSync(src_file);
          const newContent = oldContent.toString().replace(/\$PUSH_URL/g, ws_push_url);
          fs.writeFileSync(dst_file, newContent);
          return true;
        }
        return false;
      });

      const output = util.format('%s/%s.zip', os.tmpdir(), dirName);
      await ZipArchive(tmpPath, output);

      const zipFileContent = fs.readFileSync(output);
      const zipBase64Content = new Buffer.from(zipFileContent).toString('base64');

      const item = ws_scf[key];
      const updateArgs = {
        Region: this.region,
        FunctionName: item.functionName,
        Handler: 'index.main_handler',
        Namespace: item.namspace,
        Code: {
          ZipFile: zipBase64Content,
        }
      }

      const funcInfo = await this.getFunction(item.namspace, item.functionName);
      let status = funcInfo.Status;
      let times = 10;
      while (status == 'Updating' || status == 'Creating') {
        const tempFunc = await this.getFunction(item.namspace, item.functionName);
        status = tempFunc.Status;
        await utils.sleep(1000);
        times = times - 1;
        if (times <= 0) {
          throw `Function ${item.functionName} update failed`
        }
      }

      const req = new models.UpdateFunctionCodeRequest();
      req.from_json_string(JSON.stringify(updateArgs));
      const handler = util.promisify(this.api.scfClient.UpdateFunctionCode.bind(this.api.scfClient));
      try {
        await handler(req);
        fs.accessSync(output);
        fs.unlinkSync(output);
      } catch (e) {
        throw e
      }
    }
  }


  async destroyWsScf(ws_scf){
    for (let key in ws_scf) {
      const item = ws_scf[key];
      const req = new models.DeleteFunctionRequest();
      const params = {
        FunctionName: item.functionName,
        Namespace: item.namspace
      }
      req.from_json_string(JSON.stringify(params));
      const handler = util.promisify(this.api.scfClient.DeleteFunction.bind(this.api.scfClient));
      try {
        await handler(req);
      } catch (e) {
        throw e
      }
    }
  }


  async create () {

    // create websocket scf function
    const scfResult = await this.createWsScf();

    const apiParams = {
      apig: this.apig,
      Region: this.region,

      apiName: '',
      apiDesc: 'ServerlessFramework Websocket Api',
      serviceType: 'SCF',
      protocol: 'WEBSOCKET',
      serviceTimeout: 60,
      requestConfig: {
        path: "/websocket",
        method: "GET"
      },
      serviceWebsocketRegisterFunctionName: scfResult.register.functionName,
      serviceWebsocketRegisterFunctionNamespace: scfResult.register.namspace,
      serviceWebsocketRegisterFunctionQualifier: scfResult.register.qualifier,
      serviceWebsocketTransportFunctionName: scfResult.data.functionName,
      serviceWebsocketTransportFunctionNamespace: scfResult.data.namspace,
      serviceWebsocketTransportFunctionQualifier: scfResult.data.qualifier,
      serviceWebsocketCleanupFunctionName: scfResult.destroy.functionName,
      serviceWebsocketCleanupFunctionNamespace: scfResult.destroy.namspace,
      serviceWebsocketCleanupFunctionQualifier: scfResult.destroy.qualifier
    }

    const serviceParams = {
      apig: this.apig,
      Region: this.region,
      protocol: 'http'
    }
    const serviceResult = await CreateService(serviceParams);
    if (serviceResult.serviceId) 
      apiParams.serviceId = serviceResult.serviceId;

    const apiResult = await CreateApi(apiParams);

    const releaseServiceParams = {
      apig: this.apig,
      Region: this.region,
      serviceId: serviceResult.serviceId,
      environmentName: 'release',
      releaseDesc: 'Serverless Framework Release'
    }
    const releaseServiceResult = await ReleaseService(releaseServiceParams);

    // update scf push address
    const describeApiParams = {
      apig: this.apig,
      Region: this.region,

      serviceId: serviceResult.serviceId,
      apiId: apiResult.apiId
    }

    const describeApiResult = await DescribeApi(describeApiParams);
    await this.updateWsScfCode(describeApiResult.internalDomain, scfResult);

    return {
      address: util.format('ws://%s/%s%s', serviceResult.subDomain, releaseServiceParams.environmentName, apiParams.requestConfig.path),
      serviceId: serviceResult.serviceId,
      apiId: apiResult.apiId,
      scf: scfResult
    };
  }


  async destroy(service_id, api_id, ws_scf) {
    const apiParams = {
      apig: this.apig,
      Region: this.region,

      serviceId: service_id,
      apiId: api_id
    }
    if (api_id) 
      await DeleteApi(apiParams);
    
    const unreleaseServiceParams = {
      apig: this.apig,
      Region: this.region,

      serviceId: service_id,
      environmentName: 'release',
      releaseDesc: 'Serverless Framework unRelease'
    }
    if (service_id) {
      await UnReleaseService(unreleaseServiceParams);
    
      const deleteServiceParams = {
        apig: this.apig,
        Region: this.region,

        serviceId: service_id,
      }
      await DeleteService(deleteServiceParams);

    }
    if (ws_scf) 
      this.destroyWsScf(ws_scf);
  }
}

module.exports = Websocket;
