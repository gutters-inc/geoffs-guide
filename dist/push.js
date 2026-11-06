const pushDialog=()=>document.getElementById('pushDialog');
function pushStatus(text){document.getElementById('pushStatus').textContent=text;updateAlertStatus(text)}
function pushBytes(value){return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))}
async function pushRequest(path,body){const r=await fetch('/api/push/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),v=await r.json();if(!r.ok)throw Error(v.error||'Push request failed');return v}
async function currentPush(){const reg=await navigator.serviceWorker.getRegistration('/');return reg?await reg.pushManager.getSubscription():null}
async function refreshPushControls(){try{const sub=await currentPush();document.getElementById('pushSubscribe').hidden=!!sub;document.getElementById('pushTest').hidden=!sub;document.getElementById('pushUnsubscribe').hidden=!sub;document.getElementById('enableRaceAlerts').textContent=sub?'Push alerts ✓':'Enable push';return sub}catch{return null}}
function enableGuidePush(){const dialog=pushDialog();if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');refreshPushControls()}
async function subscribeGuidePush(){
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent||''),installed=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
 if(ios&&!installed){pushStatus('On iPhone: open this in Safari → Share → Add to Home Screen. Open the saved guide, then enable push. Requires iOS 16.4 or later.');return}
 if(!('Notification' in window)||!navigator.serviceWorker||!('PushManager' in window)){pushStatus('Web push is unavailable in this browser. Open the guide in Safari or Chrome rather than an in-app browser.');return}
 // Permission is requested directly from this button gesture, before asynchronous setup.
 const permission=await Notification.requestPermission();if(permission!=='granted'){pushStatus('Notifications are not allowed. You can change this in your browser settings.');return}
 const button=document.getElementById('pushSubscribe');button.disabled=true;pushStatus('Connecting server push…');let sub=null;
 try{
  const config=await fetch('/api/push/config',{cache:'no-store'}).then(r=>r.json());if(!config.enabled)throw Error('Push setup is not ready yet. Please try again shortly.');
  const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushBytes(config.publicKey)});
  await pushRequest('subscribe',sub.toJSON());await refreshPushControls();pushStatus('Subscribed. Sending a real server test…');await testGuidePush();
 }catch(e){pushStatus(e.message||'Could not subscribe. Try again.')}finally{button.disabled=false}
}
async function testGuidePush(){const button=document.getElementById('pushTest');button.disabled=true;try{const sub=await currentPush();if(!sub)throw Error('Enable push first.');const r=await pushRequest('test',{endpoint:sub.endpoint});pushStatus(r.accepted?'Test accepted by your push service. Look for the notification; device display cannot be confirmed here.':r.expired?'Subscription expired. Disable push, then enable it again.':'The push service did not accept the test. Please try later.')}catch(e){pushStatus(e.message)}finally{button.disabled=false}}
async function unsubscribeGuidePush(){try{const sub=await currentPush();if(sub){await pushRequest('unsubscribe',{endpoint:sub.endpoint});await sub.unsubscribe()}await refreshPushControls();pushStatus('Unsubscribed. No more Geoff’s Guide pushes on this device.')}catch(e){pushStatus(e.message)}}
document.getElementById('pushSubscribe').onclick=subscribeGuidePush;document.getElementById('pushTest').onclick=testGuidePush;document.getElementById('pushUnsubscribe').onclick=unsubscribeGuidePush;document.getElementById('closePush').onclick=()=>{const d=pushDialog();if(d.close)d.close();else d.removeAttribute('open')};
if(typeof navigator!=='undefined'&&navigator.serviceWorker)refreshPushControls();
