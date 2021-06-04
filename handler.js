const AWS = require('aws-sdk');
// const express = require("express");
// const app = express();
const s3 = new AWS.S3();

module.exports.signedUrl = async event => {
  try {
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrlPromise-property
    const url = await s3.getSignedUrlPromise('putObject', {
      Bucket: process.env.S3_BUCKET,
      Key: 'test-file.jpg', // File name could come from queryParameters
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
      UploadId
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

module.exports.completeUpload = async event => {
  try {
    console.log('The body is', event.body)
    // const bodyData = event.body
    var {FileName, Parts, UploadId} = event.body
    try {
      body = JSON.parse(event.body)
      FileName = body.FileName
      Parts = body.Parts
      UploadId = body.UploadId
    } catch (err){
      console.error('Err',err)
    }
    const params = {
      Bucket: process.env.S3_BUCKET, /* Bucket name */
      Key: FileName, /* File name */
      MultipartUpload: {
        Parts: Parts /* Parts uploaded */
      },
      UploadId: UploadId /* UploadId from Endpoint 1 response */
    }
    console.log('The params is', params);

    const data = await s3.completeMultipartUpload(params).promise()

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(data)
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