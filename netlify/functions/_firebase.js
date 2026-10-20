const admin = require('firebase-admin');
let app;
function dbAndAuth(){
 if(!app){
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if(!raw)throw new Error('Server Firebase credentials missing');
  const credential=JSON.parse(Buffer.from(raw,'base64').toString('utf8'));
  app=admin.initializeApp({credential:admin.credential.cert(credential)});
 }
 return {db:admin.firestore(app),auth:admin.auth(app)};
}
function json(status,data){return {statusCode:status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(data)}}
module.exports={dbAndAuth,json};
