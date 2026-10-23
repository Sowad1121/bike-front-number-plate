const {dbAndAuth,json}=require('./_firebase');
const SHEET_ID='1BYhfwDeczKTH7E6Q5p9L3zexmBygzAAb8IFUsLvTewA';
const STATES=['confirmed','ready_to_ship','shipped','in_transit','delivered','returned','cancelled'];
const COURIERS=['','Steadfast','Pathao','RedX','Sundarban','Other'];
function clean(v,n=200){return String(v??'').trim().slice(0,n)}
async function sheetRows(token){
 const url=`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent("'Confirmed Invoices'!A2:Q")}`;
 const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
 const d=await r.json();if(!r.ok)throw Error(d.error?.message||'Google Sheets read failed');
 return (d.values||[]).filter(x=>/^BNP-\d+$/.test(clean(x[0]))).map(x=>({invoice_no:cellText(x,0),confirmed_at:cellText(x,1),response_row:cellText(x,2),full_name:cellText(x,3),delivery_address:cellText(x,4),registration_number:cellText(x,5),brand_model:cellText(x,6),manufacturing_year:cellText(x,7),mobile:cellText(x,8),alternative_mobile:cellText(x,9),quantity:cellText(x,10),total_bdt:cellText(x,11),advance_paid_bdt:cellText(x,12),due_bdt:cellText(x,13),transaction_id:cellText(x,14),pdf_url:cellText(x,15),advance_percent:cellText(x,16)}));
}
function cellText(row,i){return clean(row[i],1000)}
exports.handler=async event=>{
 if(!['GET','POST'].includes(event.httpMethod))return json(405,{error:'Method not allowed'});
 try{
  const {db,auth}=dbAndAuth();const bearer=event.headers.authorization||event.headers.Authorization||'';
  if(!bearer.startsWith('Bearer '))return json(401,{error:'Login required'});
  const decoded=await auth.verifyIdToken(bearer.slice(7),true);
  if(!process.env.ADMIN_UID||decoded.uid!==process.env.ADMIN_UID||!decoded.email_verified)return json(403,{error:'Not authorized as admin'});
  if(event.httpMethod==='GET'){
   // OAuth service account needs read-only permission to the spreadsheet.
   const {GoogleAuth}=require('google-auth-library');
   const credentials=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON||'null');
   if(!credentials) return json(503,{error:'GOOGLE_SERVICE_ACCOUNT_JSON not configured'});
   const googleAuth=new GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
   const client=await googleAuth.getClient();const tokenResult=await client.getAccessToken();
   const invoices=await sheetRows(tokenResult.token);
   const ids=invoices.map(x=>x.invoice_no);
   const delivery={};
   for(let i=0;i<ids.length;i+=30){const batch=ids.slice(i,i+30);const docs=await db.getAll(...batch.map(id=>db.collection('invoice_deliveries').doc(id)));docs.forEach(doc=>{if(doc.exists)delivery[doc.id]=doc.data()})}
   return json(200,{invoices:invoices.map(x=>({...x,delivery:delivery[x.invoice_no]||{status:'confirmed',courier:'',tracking_id:'',notes:''}}))});
  }
  const body=JSON.parse(event.body||'{}');const invoice_no=clean(body.invoice_no,40),status=clean(body.status,40),courier=clean(body.courier,50),tracking_id=clean(body.tracking_id,100),notes=clean(body.notes,500);
  if(!/^BNP-\d{1,12}$/.test(invoice_no)||!STATES.includes(status)||!COURIERS.includes(courier))return json(400,{error:'Invalid delivery update'});
  if(['shipped','in_transit'].includes(status)&&(!courier||!tracking_id))return json(400,{error:'Courier and tracking ID required'});
  // Verify that this invoice exists in the source sheet before accepting an update.
  const {GoogleAuth}=require('google-auth-library');
  const credentials=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON||'null');
  if(!credentials)return json(503,{error:'Google Sheets service account not configured'});
  const googleAuth=new GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
  const client=await googleAuth.getClient();const tokenResult=await client.getAccessToken();
  const existing=await sheetRows(tokenResult.token);
  if(!existing.some(x=>x.invoice_no===invoice_no))return json(404,{error:'Invoice not found in Confirmed Invoices'});
  // Server-side Firestore status only; the invoice sheet remains untouched.
  await db.collection('invoice_deliveries').doc(invoice_no).set({status,courier,tracking_id,notes,updated_at:new Date(),updated_by:decoded.uid},{merge:true});
  return json(200,{success:true});
 }catch(e){if(e instanceof SyntaxError)return json(400,{error:'Invalid JSON'});if(/auth\//.test(e.code||''))return json(401,{error:'Session expired. Sign in again.'});console.error('Confirmed invoice error',e.message);return json(500,{error:'Invoice service failed: '+e.message});}
};
