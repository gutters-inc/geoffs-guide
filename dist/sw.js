self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=event.notification.data?.url||'/#race-1/race-day';
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
  const existing=list.find(client=>new URL(client.url).origin===self.location.origin);
  if(existing){existing.navigate(target);return existing.focus()}
  return clients.openWindow(target);
 }));
});
