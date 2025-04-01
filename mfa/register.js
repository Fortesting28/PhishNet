// imports
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import { getFirestore, setDoc, doc } from "firebase/firestore";

// firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGyK2CUBIsDen5PN6rR8wSV23JQXwcCes",
  authDomain: "phishing-f4a58.firebaseapp.com",
  projectId: "phishing-f4a58",
  storageBucket: "phishing-f4a58.firebasestorage.app",
  messagingSenderId: "789589561947",
  appId: "1:789589561947:web:4bf5306862472c915c257e",
  measurementId: "G-ST9ZKKDMXX"
};

// initialize firebase
const app = initializeApp(firebaseConfig);

// load DOM first
document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM fully loaded and parsed");

  // element references from DOM
  const optInCheckbox = document.getElementById("optInCheckbox");
  const signupSubmit = document.getElementById("signupSubmit");
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");
  const toggleModeBtn = document.getElementById("toggleModeBtn");
  const title = document.getElementById("title");
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const forgotPasswordModal = document.getElementById("forgotPasswordModal");
  const closeModal = document.getElementById("closeModal");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const sendOtpBtn = document.getElementById("sendOtpBtn");
  const otpField = document.getElementById("otpField");

  // initialize firebase services
  const auth = getAuth(app);
  const db = getFirestore(app);

  optInCheckbox.addEventListener("change", function () {
    signupSubmit.disabled = !this.checked;
  });

  // debug - check for all elements in DOM
  if (!signupForm || !loginForm || !toggleModeBtn || !title) {
    console.error("One or more required DOM elements are missing.");
    return;
  }

  let isOtpVerified = false;
  let isLoginMode = false;

  // switch between log in and sign up
  toggleModeBtn.addEventListener("click", function () {
    console.log("toggleModeBtn clicked");
    isLoginMode = !isLoginMode;
    console.log("New mode:", isLoginMode ? "Login" : "Sign Up");

    // shows or hides fields based on mode
    if (isLoginMode) {
      signupForm.style.display = "none";
      loginForm.style.display = "block";
      title.textContent = "Log In";
      toggleModeBtn.textContent = "Switch to Sign Up";
    } else {
      loginForm.style.display = "none";
      signupForm.style.display = "block";
      title.textContent = "Sign Up";
      toggleModeBtn.textContent = "Switch to Log In";
    }
  });

  // password validation
  function isPasswordValid(password) {
    // regex to ensure pw is at least 8 char with 1 symbol, 1 uppercase, and one number
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  // phone number validation
  function isPhoneNumberValid(phone) {
    // regex for phone number
    const phoneRegex = /^\+?\d{1,15}$/;
    return phoneRegex.test(phone);
  }

  // sends OTP
  async function sendOtp(phone) {
    console.log("Attempting to send OTP to:", phone);
    try {
      const response = await fetch("http://localhost:3000/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const result = await response.json();
      console.log("sendOtp response:", result);
      if (result.success) {
        alert("OTP sent to your phone.");
        otpField.style.display = "block";
      } else {
        alert("Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
    }
  }

  // verifies OTP
  async function verifyOtp(phone, otp) {
    console.log("Verifying OTP for phone:", phone, "with OTP:", otp);
    try {
      const response = await fetch("http://localhost:3000/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
      });
      const result = await response.json();
      console.log("verifyOtp response:", result);
      return result.success;
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return false;
    }
  }

  // handle send OTP button click
  sendOtpBtn.addEventListener("click", () => {
    console.log("Send OTP button clicked");
    const phone = document.getElementById("signupPhone").value.trim();
    console.log("Phone entered:", phone);
    if (phone) {
        if (isPhoneNumberValid(phone)) {
            sendOtp(phone);
        } else {
            alert("Please enter a valid phone number.");
        }
        } else {
            alert("No phone number provided. MFA is optional, but you must enter a valid phone if you want to use it.");
        }
  });

  // sign up form
  signupForm.addEventListener("submit", async (event) => {
    console.log("Signup form submitted");
    event.preventDefault();

    // gets input from user and trims whitespace
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const phone = document.getElementById("signupPhone").value.trim();
    const otp = document.getElementById("otpCode").value.trim();
    const password = document.getElementById("signupPassword").value.trim();

    console.log("User details:", { name, email, phone, password });

    // ensures all fields are filled
    if (!name || !email || !password) {
        alert("Please fill in all required fields.");
        return;
    }

    // message if pw doesn't meet criteria
    if (!isPasswordValid(password)) {
        alert("Password must be at least 8 characters long, include at least one uppercase letter, one number, and one symbol.");
        return;
    }

    if (phone) {
        if (otpField.style.display === "block" && !isOtpVerified) {
          console.log("OTP field visible, verifying OTP");
          isOtpVerified = await verifyOtp(phone, otp);
          if (!isOtpVerified) {
            alert("Invalid OTP. Please try again.");
            return;
          }
          alert("Phone number verified.");
        } else {
          console.log("OTP not required or already verified (phone provided).");
        }
      } else {
        // skip OTP if no phone is provided
        console.log("No phone provided, skipping OTP.");
      }
  
      // create new user in firebase
      try {
        console.log("Creating user with Firebase...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("User created:", user);
  
        // send verification email
        await sendEmailVerification(user);
        console.log("Verification email sent to:", user.email);
  
        // save data in firebase under user's UID
        await setDoc(doc(db, "users", user.uid), {
          name: name,
          email: email,
          phone: phone,  // store empty string if no phone
          createdAt: new Date().toISOString()
        });
        console.log("User data saved to Firestore");
  
        // success or error message upon registering
        alert(`User ${user.email} registered successfully! A verification email has been sent.`);
      } catch (error) {
        console.error("Error during signup:", error);
        alert(`Error: ${error.message}`);
      }
    });

  // sign in form
  loginForm.addEventListener("submit", async (event) => {
    console.log("Login form submitted");
    event.preventDefault();

    // gets input from user and trims whitespace
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      alert("Please fill in both email and password.");
      return;
    }

    try {
      console.log("Signing in user with email:", email);

      // sign in using firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log("User signed in:", user);
      alert(`Welcome back, ${user.email}!`);
    } catch (error) {
      console.error("Login failed:", error);
      alert(`Login failed: ${error.message}`);
    }
  });

  // open forgot password modal
  forgotPasswordLink.addEventListener("click", (event) => {
    console.log("Forgot password link clicked");
    event.preventDefault();
    forgotPasswordModal.style.display = "block";
  });

  // close forgot password modal
  closeModal.addEventListener("click", () => {
    console.log("Close modal clicked");
    forgotPasswordModal.style.display = "none";
  });

  // close forgot password modal if user clicks elsewhere
  window.addEventListener("click", (event) => {
    if (event.target === forgotPasswordModal) {
      console.log("Clicked outside modal; closing modal");
      forgotPasswordModal.style.display = "none";
    }
  });

  // submit forgot password form
  forgotPasswordForm.addEventListener("submit", async (event) => {
    console.log("Forgot password form submitted");
    event.preventDefault();

    // get email address from modal
    const email = document.getElementById("modalEmail").value.trim();
    
    // ensure email is filled
    if (!email) {
      alert("Email is required.");
      return;
    }
    try {
        // send password reset email
      console.log("Sending password reset email to:", email);
      await sendPasswordResetEmail(auth, email);
      alert("Check email for password reset instructions.");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      alert(`Error: ${error.message}`);
    }
    forgotPasswordModal.style.display = "none";
  });
});
