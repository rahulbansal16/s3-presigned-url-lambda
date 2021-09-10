const AWS = require('aws-sdk');
const crypto = require('crypto');
const { encode } = require('punycode');
const sha256 = x => crypto.createHash('sha256').update(x, 'utf8').digest('hex');
// const express = require("express");
// const app = express();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const s3 = new AWS.S3(
  {
    apiVersion: '2006-03-01',
	  signatureVersion: 'v4'
  }
);

var iv = new Buffer.from('');   //(null) iv
var algorithm = 'aes-256-ecb';
var password = '5A7234743109217A25432A462D4A614E';      //key password for cryptography

const encrypt = (string) => {
  buffer = Buffer.from(string);
  var cipher = crypto.createCipheriv(algorithm, Buffer.from(password),iv)
  var crypted = Buffer.concat([cipher.update(buffer),cipher.final()]);
  return crypted.toString('hex');
}

const decrypt = (encrypted) => {
  let encryptedText = Buffer.from(encrypted, 'hex');
  let decipher = crypto.createDecipheriv(algorithm, Buffer.from(password), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

module.exports.encrypt = async event => {
  console.log('Encrypting')
  return {
    'hi': encrypt("Hi"),
    'hip': decrypt(encrypt('Hi'))
  }
}

const generateUID = (email, timestamp) => {
  return encrypt(email + '#' + timestamp)
}

const parseUID = (uid) => {
  const decrypt = decrypt(uid)
  const email,timestamp = decrypt.split('#')
  return {
    email,
    timestamp
  }
}

module.exports.signedUrl = async event => {
  try {
    const {FileName} = events['queryStringParameters']
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrlPromise-property
    const url = await s3.getSignedUrlPromise('putObject', {
      Bucket: process.env.S3_BUCKET,
      Key: FileName, // File name could come from queryParameters
    });
    console.log('About to return the result');
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: true,
        message: 'AWS S3 Pre-signed urls generated successfully.',
        url,
      }),
    };
  } catch (err) {
    console.error('Error getting presigned url from AWS S3:', err);
    return {
      statusCode: err.statusCode || 502,
      body: JSON.stringify({
        success: false,
        message: 'Pre-Signed URL error',
        err,
      }),
    };
  }
};

module.exports.startRequest = async event => {
  try {
    const {FileName} = event['queryStringParameters']
    const res = await s3.createMultipartUpload({
      Bucket: process.env.S3_BUCKET,
      Key: FileName
    }).promise()
    console.log('The result is', res);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        UploadId: res.UploadId
      })
    }

  } catch (err){
    console.error('Error starting the upload request', err);
    return {
      statusCode: err.statusCode || 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: false,
        message: "Unable to start the Multipart upload request",
        err
      })
    }
  }
}

module.exports.uploadURL = async events => {
  try {
    const {UploadId, PartNumber, FileName} = events['queryStringParameters']
    let params = {
      Bucket: process.env.S3_BUCKET,
      Key: encodeURIComponent(FileName),
      PartNumber,
      UploadId,
      Body: ''
    };
    const res = await s3.getSignedUrl('uploadPart', params)
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(res)
    };

  } catch (err){
    console.log('Error starting the upload request', err);
    return {
      statusCode: err.statusCode || 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: false,
        message: "Unable to start the Multipart upload request",
        err
      })
    }
  }
}

module.exports.partialUpload = async events => {
  try {
    console.log('The events is', events)
    const {UploadId, PartNumber, FileName} = events['queryStringParameters']
    var params = {
      Body: events.body,
      Bucket: process.env.S3_BUCKET,
      Key: FileName,
      PartNumber: PartNumber,
      UploadId: UploadId
     };
     const res = await s3.uploadPart(params).promise()
     console.log('The result is', res);
     return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(res)
    } } catch (err){
    console.error('Error starting the upload request', err);
    return {
      statusCode: err.statusCode || 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: false,
        message: "Unable to complete the Partial upload request",
        err
      })
    }
  }
}

module.exports.singleUpload = async event  => {
  try {
    console.log('The body is', event.body);
    const {FileName} = event['queryStringParameters']
    var params = {
      Bucket: process.env.S3_BUCKET,
      Key: FileName,
      Body: event.body
    }
    console.log('The params are', params)
    const data = await s3.upload(params).promise()
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(data)
    };
  } catch(err) {
    console.log("There is an error making the upload", err)
    return {
      statusCode: err.statusCode || 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: false,
        message: "Unable to complete the Multipart upload request",
        err
      })
    }
  }
}

const readUrlFromDB = async uuid => {
  console.log("The uuid is", uuid)
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id:uuid,
    },
    ExpressionAttributeNames:{
      "#views": "views"
    },
    UpdateExpression: 'set #views=#views + :inc',
    ExpressionAttributeValues: {
      ":inc": 1,
    },
    ReturnValues: 'ALL_OLD',
  };
  return dynamoDb.update(params).promise()
}

module.exports.saveVideoMetaData = async events => {
  try {
    const json = JSON.parse(events.body)
    console.log('The json is', json)
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        id: json.id,
      },
      UpdateExpression: 'set title=:title, description=:description, updatedAt=:date',
      ExpressionAttributeValues: {
        ":title":json.title,
        ":description":json.description,
        ":date":new Date().getTime(),
      },
      ReturnValues: 'ALL_NEW',
    };

    const res = await dynamoDb.update(params).promise()
    console.log('In the saveVideoMetaData', res)
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(res)
    }
  } catch (e){
    console.log('Error updating the db', e)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(e)
    }
  }
}

module.exports.fetchUrl = async events => {
  try {
    const {uuid} = events['queryStringParameters']
    const response = await readUrlFromDB(uuid)
    console.log('The fetch Url is', response);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        ...response.Attributes
      })
    }

  } catch(err){
    return {
      statusCode: err.statusCode || 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: false,
        message: "Unable to complete the Multipart upload request",
        err
      })
    }
  }
}

const uuidv4 = ()  => {
  const length  = 15;
  const characters ='abcdefghijklmnopqrstuvwxyz0123456789';
  let result = ' ';
  const charactersLength = characters.length;
  for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result.trim();
}

module.exports.getVideos = async events => {
  try {
    const {count} = events['queryStringParameters']
    const userId = null;
    const start = null;
    const response = await readVideoFromDB(userId, start, count)
    console.log('The fetch Url is', response);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        response
      })
    }

  } catch(err){
    console.error(err);
    return {
      statusCode: err.statusCode || 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: false,
        message: "Unable to fetch the videos",
        err
      })
    }
  }
}


// Make the readFromDB in a sorted Order
// https://stackoverflow.com/questions/56637894/how-can-i-query-dynamodb-with-sort-and-limit-for-a-non-sort-key-parameter
// Some of the keywords like #views #Locations are reserved so they require some ExpressionAttributeNames
const readVideoFromDB = async (userId, start, count) => {
  // console.log("The uuid is", uuid)
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    ProjectionExpression: "id, createdAt, updatedAt, #Location, description, title, #views",
    ExpressionAttributeNames:{
      "#views": "views",
      "#Location": "Location"
    },
    Limit: count
  };
  return dynamoDb.scan(params).promise()
}

module.exports.addToDbTest = async event => {
  try{
    const res = await addUrlToDB({location:'https://test.com'});
    console.log('The result of the addUrlToDb is', res);
    return {
      statusCode: 200,
      body: JSON.stringify(res)
    }

  }
  catch (e){
    console.log("There is an error", e)
    return {
      statusCode: 500,
      body: JSON.stringify(e)
    }
  }
}

const addUrlToDB = async (url) => {
    const timestamp = new Date().getTime();
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        ...url,
        createdAt: timestamp,
        updatedAt: timestamp,
        id: uuidv4(),
        views:0
      },
      ReturnValues: "NONE"
    };
    console.log('The value of the params is', params)
    var p = await dynamoDb.put(params).promise()
    console.log('The value of the p is',p)
    return params.Item
}

module.exports.completeUpload = async event => {
  try {
    console.log('The body is', event.body)
    // const bodyData = event.body
    var {FileName, UploadId} = event.body
    try {
      body = JSON.parse(event.body)
      FileName = body.FileName
      Parts = body.Parts
      UploadId = body.UploadId
    } catch (err){
      console.error('Err',err)
    }
    console.log('The parts is', JSON.stringify(body.Parts))
    // let p = JSON.stringify(body.Parts)
    Parts = []
    console.log('The new Parts array is', Parts);
    const params = {
      Bucket: process.env.S3_BUCKET, /* Bucket name */
      Key: FileName, /* File name */
      MultipartUpload: {
        Parts: JSON.parse(JSON.stringify(body.Parts)) /* Parts uploaded */
      },
      UploadId: UploadId /* UploadId from Endpoint 1 response */
    }
    console.log('The params is', JSON.stringify(params));

    const data = await s3.completeMultipartUpload(params).promise()
    const dbUpload = await addUrlToDB(data)

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(dbUpload)
    };
  } catch (err){
    console.error('Error starting the upload request', err);
    return {
      statusCode: err.statusCode || 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: false,
        message: "Unable to complete the Multipart upload request",
        err
      })
    }
  }
}


// const serverless = require("serverless-http");
// const express = require("express");
// const app = express();

// app.get("/upload/start", (req, res, next) => {
//   return res.status(200).json({
//     message: "Hello from root!",
//   });
// });

// app.get("/upload/url", (req, res, next) => {
//   return res.status(200).json({
//     message: "Hello from path!",
//   });
// });

// app.get("/upload/complete", (req, res, next) => {
//   return res.status(200).json({
//     message: "Hello from upload complete"
//   })
// })

// app.use((req, res, next) => {
//   return res.status(404).json({
//     error: "Not Found",
//   });
// });

// module.exports.signedUrl = serverless(app);


// export const start: APIGatewayProxyHandler = async (event, _context) => {
//   const params = {
//     Bucket: event.queryStringParameters.bucket, /* Bucket name */
//     Key: event.queryStringParameters.fileName /* File name */
//   };

//   const s3 = new AWS.S3(AWSData);

//   const res = await s3.createMultipartUpload(params).promise()

//   return {
//     statusCode: 200,
//     headers: {
//       'Access-Control-Allow-Origin': '*',
//       'Access-Control-Allow-Credentials': true,
//     },
//     body: JSON.stringify({
//       data: {
//         uploadId: res.UploadId
//       }
//     })
//   };
// }