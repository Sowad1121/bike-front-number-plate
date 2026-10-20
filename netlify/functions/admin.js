const {dbAndAuth,json}=require('./_firebase');
const payStates=['pending','verified','rejected'];const orderStates=['new','processing','shipped','delivered','cancelled'];
exports.handler=async event=>{
 if(!['GET','POST'].includes(event.httpMethod))return json(405,{error:'Method not allowed'});
 try{
  const {db,auth}=dbAndAuth();const bearer=event.headers.authorization||event.headers.Authorization||'';
  if(!bearer.startsWith('Bearer '))return json(401,{error:'Login required'});
  const decoded=await auth.verifyIdToken(bearer.slice(7),true);
  if(!process.env.ADMIN_UID||decoded.uid!==process.env.ADMIN_UID||!decoded.email_verified)return json(403,{error:'Not authorized as admin'});
  if(event.httpMethod==='GET'){
   const snap=await db.collection('orders').orderBy('created_at','desc').limit(100).get();
   return json(200,{orders:snap.docs.map(d=>({id:d.id,...d.data(),created_at:d.data().created_at?.toDate?.()?.toISOString()||null,updated_at:d.data().updated_at?.toDate?.()?.toISOString()||null}))});
  }
  const body=JSON.parse(event.body||'{}');
  if(typeof body.id!=='string'||!/^[A-Za-z0-9]{10,40}$/.test(body.id)||!payStates.includes(body.payment_status)||!orderStates.includes(body.order_status))return json(400,{error:'Invalid update'});
  const ref=db.collection('orders').doc(body.id);
  await db.runTransaction(async t=>{const doc=await t.get(ref);if(!doc.exists)throw Object.assign(new Error('Order not found'),{status:404});if(body.order_status==='delivered'&&body.payment_status!=='verified')throw Object.assign(new Error('Verify payment before delivery status'),{status:400});t.update(ref,{payment_status:body.payment_status,order_status:body.order_status,updated_at:new Date(),updated_by:decoded.uid})});
  return json(200,{success:true});
 }catch(e){if(e.status)return json(e.status,{error:e.message});if(/auth\//.test(e.code||''))return json(401,{error:'Session expired. Sign in again.'});console.error('Admin request failed',e.message);return json(500,{error:'Server error'})}
};
