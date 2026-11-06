self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  let message={title:'Geoffs Guide update',body:'Open the guide for the latest saved late mail.',url:'/',tag:'geoffs-guide-update'};
  try{
   const sub=await self.registration.pushManager.getSubscription();if(sub){
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sub.endpoint)),id=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
    const response=await fetch('/api/push/message?id='+id,{cache:'no-store'});if(response.ok)message=await response.json();
   }
  }catch{}
  const target=new URL(message.url||'/',self.location.origin);if(target.origin!==self.location.origin)target.href=self.location.origin+'/';
  await self.registration.showNotification(message.title||'Geoffs Guide',{body:message.body,tag:message.tag,icon:'/assets/push-icon-192.png',data:{url:target.href}});
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();let target=new URL(event.notification.data?.url||'/',self.location.origin);if(target.origin!==self.location.origin)target=new URL('/',self.location.origin);
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{const existing=list.find(client=>new URL(client.url).origin===self.location.origin);if(existing){await existing.navigate(target.href);return existing.focus()}return clients.openWindow(target.href)}));
});
