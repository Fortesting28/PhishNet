<script type="module">
  
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCGyK2CUBIsDen5PN6rR8wSV23JQXwcCes",
  authDomain: "phishing-f4a58.firebaseapp.com",
  databaseURL: "https://phishing-f4a58-default-rtdb.firebaseio.com",
  projectId: "phishing-f4a58",
  storageBucket: "phishing-f4a58.firebasestorage.app",
  messagingSenderId: "789589561947",
  appId: "1:789589561947:web:4bf5306862472c915c257e",
  measurementId: "G-ST9ZKKDMXX"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app); 
const analytics = getAnalytics(app);
const auth = getAuth(app);
//ZOHA BELOW FUNCTION ADD IT IN YOUR register.js file, i didn't want to mess that up so i didn't edit. it's important to add."
createUserWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // Signed up 
    const user = userCredential.user;
    // ...
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    // ..
  });
</script>
