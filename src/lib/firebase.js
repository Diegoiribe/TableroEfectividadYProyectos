import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyATYwIgaB9E4HFj1WXK_dhe-FdWvxrWJyU',
  authDomain: 'tablerointerno2.firebaseapp.com',
  projectId: 'tablerointerno2',
  storageBucket: 'tablerointerno2.firebasestorage.app',
  messagingSenderId: '390536143038',
  appId: '1:390536143038:web:481d2ddf21473943043eef'
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
