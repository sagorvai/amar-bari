const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {

const list = document.getElementById('chat-list-panel');
const header = document.getElementById('chat-header');
const box = document.getElementById('chat-messages');
const input = document.getElementById('message-input');
const btn = document.getElementById('send-button');

let currentChat = null;
let receiver = null;

auth.onAuthStateChanged(user => {

 if (!user) return location.href="auth.html";

 loadChats(user.uid);

});

function loadChats(uid){

 db.collection("chats")
 .where("users","array-contains",uid)
 .orderBy("lastUpdated","desc")
 .onSnapshot(snap=>{

 list.innerHTML="";

 snap.forEach(doc=>{
   const c = doc.data();

   const div = document.createElement("div");
   div.className="post-group";

   const unread = c.unread?.[uid]||0;
   if(unread>0) div.classList.add("unread");

   div.innerHTML=`${c.postTitle} (${unread})`;

   div.onclick=()=>openChat(doc.id,uid,c);

   list.appendChild(div);
 });

 });

}

function openChat(id,uid,data){

 currentChat=id;
 receiver=data.users.find(u=>u!==uid);

 header.textContent=data.postTitle;

 db.collection("chats").doc(id)
 .update({[`unread.${uid}`]:0});

 db.collection("chats").doc(id)
 .collection("messages")
 .orderBy("createdAt")
 .onSnapshot(snap=>{

 box.innerHTML="";

 snap.forEach(d=>{
   const m=d.data();

   const div=document.createElement("div");
   div.className="message-bubble "+(m.sender===uid?"sent":"received");

   div.textContent=m.text;

   box.appendChild(div);
 });

 });

}

btn.onclick=send;
input.onkeypress=e=>{if(e.key==="Enter") send();};

async function send(){

 const text=input.value.trim();
 if(!text||!currentChat) return;

 const uid=auth.currentUser.uid;

 await db.collection("chats").doc(currentChat)
 .collection("messages")
 .add({
   text,
   sender:uid,
   createdAt:firebase.firestore.FieldValue.serverTimestamp()
 });

 await db.collection("chats").doc(currentChat)
 .update({
   lastMessage:text,
   lastUpdated:firebase.firestore.FieldValue.serverTimestamp(),
   [`unread.${receiver}`]:firebase.firestore.FieldValue.increment(1)
 });

 input.value="";
}

});
