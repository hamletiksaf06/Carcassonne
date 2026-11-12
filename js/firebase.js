import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import{getAuth,signInAnonymously,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import{getFirestore,doc,getDoc,setDoc,onSnapshot,runTransaction,collection,query,where,addDoc}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const app=initializeApp({
  apiKey:"AIzaSyD6KocgJYDhMDcfEe27Belhs8Zjb1tNuVg",authDomain:"carcassonne-9b4fd.firebaseapp.com",projectId:"carcassonne-9b4fd",
  storageBucket:"carcassonne-9b4fd.firebasestorage.app",messagingSenderId:"73563202121",appId:"1:73563202121:web:558cbcda7afffa619e5598"});
const auth=getAuth(app),db=getFirestore(app);
// Small document store used by the game. Paths look like "games/abc".
export async function makeStore(){
  const uid=await new Promise((res,rej)=>{onAuthStateChanged(auth,u=>{if(u)res(u.uid)});signInAnonymously(auth).catch(rej)});
  const ref=p=>doc(db,...p.split("/"));
  return{uid,
    get:async p=>{const s=await getDoc(ref(p));return s.exists()?s.data():null},
    set:(p,d)=>setDoc(ref(p),d,{merge:true}),
    watch:(p,cb,err)=>onSnapshot(ref(p),s=>cb(s.exists()?s.data():null),err),
    query:(coll,field,val,cb,err)=>onSnapshot(query(collection(db,coll),where(field,"==",val)),s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))),err),
    tx:(p,fn)=>runTransaction(db,async t=>{const s=await t.get(ref(p)),nd=fn(s.exists()?s.data():null);if(nd===undefined)return false;t.set(ref(p),nd);return true}),
    add:async(coll,d)=>(await addDoc(collection(db,coll),d)).id};
}
