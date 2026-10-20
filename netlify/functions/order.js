const crypto=require('node:crypto');
const {dbAndAuth,json}=require('./_firebase');
const str=(v,max=120)=>typeof v==='string'?v.trim().slice(0,max+1):'';
const phone=v=>/^01[0-9]{9}$/.test(v);
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 if(Buffer.byteLength(event.body||'','utf8')>12000)return json(413,{error:'Request too large'});
 try{
  const x=JSON.parse(event.body||'{}');
  if(x.website)return json(400,{error:'Invalid submission'});
  const token=str(x.turnstile_token,4096),secret=process.env.TURNSTILE_SECRET_KEY;
  if(!secret||!token)return json(400,{error:'Human verification required'});
  const ip=(event.headers['x-nf-client-connection-ip']||event.headers['client-ip']||'').split(',')[0].trim();
  const form=new URLSearchParams({secret,response:token});if(ip)form.set('remoteip',ip);
  const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form});
  const result=await verify.json();if(!result.success)return json(400,{error:'Human verification failed. Please retry.'});
  const data={full_name:str(x.full_name),mobile:str(x.mobile),alternative_mobile:str(x.alternative_mobile),registration_number:str(x.registration_number,80),brand_model:str(x.brand_model),manufacture_year:str(x.manufacture_year,4),delivery_address:str(x.delivery_address,600),bkash_sender:str(x.bkash_sender),transaction_id:str(x.transaction_id,60)};
  if(data.full_name.length<2||data.full_name.length>120||!phone(data.mobile)||(data.alternative_mobile&&!phone(data.alternative_mobile))||!data.registration_number||data.registration_number.length>80||!data.brand_model||data.brand_model.length>120||!/^(19|20)\d{2}$/.test(data.manufacture_year)||Number(data.manufacture_year)>new Date().getUTCFullYear()+1||data.delivery_address.length<10||data.delivery_address.length>600||!phone(data.bkash_sender)||!(/^[A-Za-z0-9]{6,60}$/.test(data.transaction_id)))return json(400,{error:'Please check all order fields.'});
  const {db}=dbAndAuth();
  // Rate limit by hashed IP in Firestore (privacy preserving, not a complete abuse defense).
  const salt=process.env.RATE_LIMIT_SALT;if(!salt)throw Error('Rate limit salt missing');
  const key=crypto.createHash('sha256').update(salt+'|'+ip).digest('hex');
  const limitRef=db.collection('order_rate_limits').doc(key);
  const now=Date.now();
  const orderRef=db.collection('orders').doc();
  await db.runTransaction(async t=>{
    const old=await t.get(limitRef);
    if(old.exists&&now-(old.data().last||0)<60000)throw Object.assign(new Error('Please wait 60 seconds before another order.'),{status:429});
    t.set(limitRef,{last:now,expires_at:new Date(now+86400000)});
    t.create(orderRef,{...data,price_bdt:550,advance_bdt:165,due_bdt:385,advance_percent:30,delivery_working_days:'4-7',payment_status:'pending',order_status:'new',created_at:new Date(),updated_at:new Date()});
  });
  return json(201,{order_id:orderRef.id,status:'pending'});
 }catch(e){if(e.status===429)return json(429,{error:e.message});console.error('Order processing failed',e.message);return json(500,{error:'Order could not be submitted. Please try again.'})}
};
