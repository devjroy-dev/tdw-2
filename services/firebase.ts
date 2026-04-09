import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDA78KQVB_96wSrjMMJx-Jc4TCCzS-9Rk8",
  authDomain: "dream-wedding-f4814.firebaseapp.com",
  projectId: "dream-wedding-f4814",
  storageBucket: "dream-wedding-f4814.firebasestorage.app",
  messagingSenderId: "313911929264",
  appId: "1:313911929264:web:8674b85da3b0eef146ce75"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
