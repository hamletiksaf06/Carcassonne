import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import{getAuth,signInAnonymously,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import{getFirestore,doc,getDoc,setDoc,updateDoc,onSnapshot,runTransaction,increment,serverTimestamp}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const app=initializeApp({
  apiKey:"AIzaSyD6KocgJYDhMDcfEe27Belhs8Zjb1tNuVg",authDomain:"carcassonne-9b4fd.firebaseapp.com",projectId:"carcassonne-9b4fd",
  storageBucket:"carcassonne-9b4fd.firebasestorage.app",messagingSenderId:"73563202121",appId:"1:73563202121:web:558cbcda7afffa619e5598"});
export const auth=getAuth(app),db=getFirestore(app);
export{signInAnonymously,onAuthStateChanged,doc,getDoc,setDoc,updateDoc,onSnapshot,runTransaction,increment,serverTimestamp};
