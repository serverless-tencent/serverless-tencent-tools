const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const globby = require('globby');
const { contains, isNil, last, split } = require('ramda');
const { createReadStream, createWriteStream } = require('fs-extra');

function HttpError(code, message) {
  this.code = code || 0
  this.message = message || ''
}
HttpError.prototype = Error.prototype

const VALID_FORMATS = ['zip', 'tar']
const isValidFormat = (format) => contains(format, VALID_FORMATS)

const ZipArchive = async function (inputDirPath, outputFilePath, include = [], exclude = [], prefix) {
  const format = last(split('.', outputFilePath))

  if (!isValidFormat(format)) {
    throw new Error('Please provide a valid format. Either a "zip" or a "tar"')
  }

  const patterns = ['**']

  if (!isNil(exclude)) {
    exclude.forEach((excludedItem) => patterns.push(`!${excludedItem}`))
  }

  const files = (await globby(patterns, { cwd: inputDirPath, dot: true }))
    .sort() // we must sort to ensure correct hash
    .map((file) => ({
      input: path.join(inputDirPath, file),
      output: prefix ? path.join(prefix, file) : file
    }))

  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputFilePath)
    const archive = archiver(format, {
      zlib: { level: 9 }
    })

    output.on('open', async () => {
      archive.pipe(output)

      // we must set the date to ensure correct hash
      files.forEach((file) =>
        archive.append(createReadStream(file.input), { name: file.output, date: new Date(0) })
      )

      if (!isNil(include)) {
        for (let i = 0, len = include.length; i < len; i++) {
          const curInclude = include[i]
          if (fs.statSync(curInclude).isDirectory()) {
            // if is relative directory, we should join with process.cwd
            const curPath = path.isAbsolute(curInclude)
              ? curInclude
              : path.join(process.cwd(), curInclude)
            const includeFiles = await globby(patterns, { cwd: curPath, dot: true })
            includeFiles
              .sort()
              .map((file) => ({
                input: path.join(curPath, file),
                output: prefix ? path.join(prefix, file) : file
              }))
              .forEach((file) =>
                archive.append(createReadStream(file.input), {
                  name: file.output,
                  date: new Date(0)
                })
              )
          } else {
            const stream = createReadStream(curInclude)
            archive.append(stream, { name: path.basename(curInclude), date: new Date(0) })
          }
        }
      }

      archive.finalize()
    })

    archive.on('error', (err) => reject(err))
    output.on('close', () => resolve(outputFilePath))
  })
}


const CreateApi = ({ apig, ...inputs }) => {
  return new Promise((resolve, reject) => {
    apig.request(
      {
        Action: 'CreateApi',
        RequestClient: 'ServerlessFramework',
        Token: apig.defaults.Token || null,
        ...inputs
      },
      function(err, data) {
        if (err) {
          return reject(err)
        } else if (data.code !== 0) {
          return reject(new HttpError(data.code, data.message))
        }
        resolve(data)
      }
    )
  })
}


const DeleteApi = ({ apig, ...inputs }) => {
  return new Promise((resolve, reject) => {
    apig.request(
      {
        Action: 'DeleteApi',
        RequestClient: 'ServerlessComponent',
        Token: apig.defaults.Token || null,
        ...inputs
      },
      function(err, data) {
        if (err) {
          return reject(err)
        } else if (data.code !== 0) {
          return reject(new HttpError(data.code, data.message))
        }
        resolve(data)
      }
    )
  })
}


const DescribeApi = ({ apig, ...inputs }) => {
  return new Promise((resolve, reject) => {
    apig.request(
      {
        Action: 'DescribeApi',
        RequestClient: 'ServerlessComponent',
        Token: apig.defaults.Token || null,
        ...inputs
      },
      function(err, data) {
        if (err) {
          return reject(err)
        } else if (data.code !== 0) {
          return reject(new HttpError(data.code, data.message))
        }
        resolve(data)
      }
    )
  })
}


const DeleteService = ({ apig, ...inputs }) => {
  return new Promise((resolve, reject) => {
    apig.request(
      {
        Action: 'DeleteService',
        RequestClient: 'ServerlessComponent',
        Token: apig.defaults.Token || null,
        ...inputs
      },
      function(err, data) {
        if (err) {
          return reject(err)
        } else if (data.code !== 0) {
          return reject(new HttpError(data.code, data.message))
        }
        resolve(data)
      }
    )
  })
}


const UnReleaseService = ({ apig, ...inputs }) => {
  return new Promise((resolve, reject) => {
    apig.request(
      {
        Action: 'UnReleaseService',
        RequestClient: 'ServerlessComponent',
        Token: apig.defaults.Token || null,
        ...inputs
      },
      function(err, data) {
        if (err) {
          return reject(err)
        } else if (data.code !== 0) {
          return reject(new HttpError(data.code, data.message))
        }
        resolve(data)
      }
    )
  })
}


const ReleaseService = ({ apig, ...inputs }) => {
  return new Promise((resolve, reject) => {
    apig.request(
      {
        Action: 'ReleaseService',
        RequestClient: 'ServerlessFramework',
        Token: apig.defaults.Token || null,
        ...inputs
      },
      function(err, data) {
        if (err) {
          return reject(err)
        } else if (data.code !== 0) {
          return reject(new HttpError(data.code, data.message))
        }
        resolve(data)
      }
    )
  })
}


const CreateService = ({ apig, ...inputs }) => {
  return new Promise((resolve, reject) => {
    apig.request(
      {
        Action: 'CreateService',
        RequestClient: 'ServerlessFramework',
        Token: apig.defaults.Token || null,
        ...inputs
      },
      function(err, data) {
        if (err) {
          return reject(err)
        } else if (data.code !== 0) {
          return reject(new HttpError(data.code, data.message))
        }
        resolve(data.data)
      }
    )
  })
}


const isExists = (path)=> {
    try {
        fs.accessSync(path);
    return true;
    } catch (e) {
        return false;
    }
}

module.exports = {
  CreateApi,
  DeleteApi,
  CreateService,
  DeleteService,
  ReleaseService,
  UnReleaseService,
  DescribeApi,
  ZipArchive,
  isExists
}