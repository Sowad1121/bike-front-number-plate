const admin=require('firebase-admin');
function dbAndAuth(){if(!admin.apps.length){const raw=process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;if(!raw)throw Error('Missing Firebase service account');const credential=JSON.parse(Buffer.from(raw,'base64').toString('utf8'));admin.initializeApp({credential:admin.credential.cert(credential)});}return {db:admin.firestore(),auth:admin.auth()};}
function json(statusCode,data){return {statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(data)};}
module.exports={dbAndAuth,json};
