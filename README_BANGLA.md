# Bike Front Number Plate — সম্পূর্ণ আপডেট (Netlify + Firebase)

## কী আপডেট হয়েছে
- পুরোনো Homepage ডিজাইন অপরিবর্তিত; নতুন Delivery Area, Quantity, Live Plate Preview এবং Live Pricing।
- Admin Settings: Price, Advance %, Inside/Outside Delivery, bKash Number। Firebase `site_settings/public`-এ সংরক্ষিত।
- নতুন Order তৈরি হলে Backend সর্বশেষ Settings ব্যবহার করে মূল্য হিসাব করে Firestore-এ সংরক্ষণ করে। পুরোনো Order-এর মূল্য বদলায় না।
- Admin Invoice/PDF বাটনে ক্লিক করলে সেই Order-এর এক পৃষ্ঠার কালো-সোনালি Invoice Print / Save as PDF করা যায়। Pending payment-কে Paid দেখায় না।
- Default: Plate ৳450, Advance 50%, Dhaka ৳70, Outside ৳120।

## Deploy করার আগে অবশ্যই
1. **আগের Site-এর ব্যাকআপ রাখো।** GitHub-এ existing project-এর ফাইলগুলো নতুন ফাইল দিয়ে Replace করো।
2. **পুরোনো `firebase-config.js` কপি করো** (এখানে দেয়া হয়নি); `firebase-config.js.example` কেবল উদাহরণ।
3. **পুরোনো `bike-front-hero.png` কপি করো**; এখানে দেয়া হয়নি। না দিলে Homepage-এর বাইকের ছবি দেখাবে না।
4. `netlify/functions/` ফোল্ডারের সব ফাইল একই নামে রাখো: `_firebase.js`, `_settings.js`, `settings.js`, `order.js`, `admin.js`।
5. Netlify Environment Variables আগের মতো থাকবে: `FIREBASE_SERVICE_ACCOUNT_BASE64`, `ADMIN_UID`, `RATE_LIMIT_SALT`। গোপন কী কখনো public HTML বা ChatGPT-এ পাঠাবে না।
6. Firebase Authentication admin UID ও verified email ঠিক আছে কি না নিশ্চিত করো। Firestore rules browser access বন্ধ রাখে; server Admin SDK কাজ করে।
7. Deploy-এর পর **নিজের bKash-এ টাকা যাচাই না করে Verified করবে না**।
8. নতুন Settings লোড না হলে public form-এ fallback মূল্য দেখায়; তাই **সফল Settings endpoint এবং test order ছাড়া Live Payment নেবে না**।
9. Test: Admin settings Save → Customer site Reload → Delivery Area switch → Test Order → Admin Load → Payment Pending → Manually Verify → Invoice/PDF → Print/Save।
10. Netlify `npm install` এবং Functions build সফল হয়েছে কি না Logs দেখো।

## সতর্কতা
- পুরোনো অর্ডারে `delivery_charge_bdt` না থাকলে Invoice-এ 0 দেখাবে; পুরোনো অর্ডারের তথ্য অনুমান করে পরিবর্তন করা হয় না।
- Invoice-এ Firestore Document ID থেকে স্থিতিশীল Invoice Reference তৈরি হয়; এটি আলাদা Sequential Invoice Number নয়।
- Print / Save as PDF Browser-এ হয়; স্বয়ংক্রিয় Drive-এ PDF আপলোড হয় না।
- Customer Page খোলা থাকা অবস্থায় Admin Settings বদলালে Reload/Tab focus-এ আপডেট হয়; সার্ভার নতুন অর্ডারে সবসময় সর্বশেষ দাম নেয়।
- এটি live production security audit নয়; abuse protection, business payment terms, backups ও privacy policy পরীক্ষা করতে হবে।
