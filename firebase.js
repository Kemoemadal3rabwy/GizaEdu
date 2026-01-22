<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

  const firebaseConfig = {
    apiKey: "AIzaSyBxRliVYmUWELkUrk4g1nbJVJwaeJVMQ3o",
    authDomain: "gizaedu-549d9.firebaseapp.com",
    projectId: "gizaedu-549d9",
    storageBucket: "gizaedu-549d9.firebasestorage.app",
    messagingSenderId: "557538897191",
    appId: "1:557538897191:web:4fae58573bae3683df4d02"
  };

  const app = initializeApp(firebaseConfig);
  window.auth = getAuth(app);
</script>