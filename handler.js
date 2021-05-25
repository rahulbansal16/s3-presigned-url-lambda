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
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'AWS S3 Pre-signed urls generated successfully.',
        url,
      }),
    };
  } catch (err) {
    console.log('Error getting presigned url from AWS S3:', err);
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
      body: JSON.stringify({
        UploadId: res.UploadId
      })
    }

  } catch (err){
    console.log('Error starting the upload request', err);
    return {
      statusCode: err.statusCode || 502,
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
      Key: FileName,
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
      body: JSON.stringify({
        success: false,
        message: "Unable to start the Multipart upload request",
        err
      })
    }
  }
}

module.exports.completeUpload = async events => {
  // try {
  //   const bodyData = JSON.parse(event.body);
  //   const params = {
  //     Bucket: bodyData.bucket, /* Bucket name */
  //     Key: bodyData.fileName, /* File name */
  //     MultipartUpload: {
  //       Parts: bodyData.parts /* Parts uploaded */
  //     },
  //     UploadId: bodyData.uploadId /* UploadId from Endpoint 1 response */
  //   }
  
  //   const data = await s3.completeMultipartUpload(params).promise()

  //   return {
  //     statusCode: 200,
  //     headers: {
  //       'Access-Control-Allow-Origin': '*',
  //       'Access-Control-Allow-Credentials': true,
  //       // 'Access-Control-Allow-Methods': 'OPTIONS,POST',
  //       // 'Access-Control-Allow-Headers': 'Content-Type',
  //     },
  //     body: JSON.stringify(data)
  //   };
  // } catch (err){
  //   console.log('Error starting the upload request', err);
  //   return {
  //     statusCode: err.statusCode || 502,
  //     body: JSON.stringify({
  //       success: false,
  //       message: "Unable to start the Multipart upload request",
  //       err
  //     })
  //   }
  // }
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