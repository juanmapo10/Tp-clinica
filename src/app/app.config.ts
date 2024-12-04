import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http'; 

export const appConfig: ApplicationConfig = {
  providers: 
  [provideZoneChangeDetection({ eventCoalescing: true }),
  provideRouter(routes), 
  provideAnimations(),
  provideFirebaseApp(() => initializeApp({
      "projectId":"clinicaa",
      "appId":"1:397294440823:web:24d72d76a8c3e2dc55d172",
      "storageBucket":"clinicaa.appspot.com",
      "apiKey":"AIzaSyD7fYa-_VWekG91rLoxj24LL-7_pZGNEdg",
      "authDomain":"clinicaa-5539d.firebaseapp.com",
      "messagingSenderId":"397294440823"})), 
      provideAuth(() => getAuth()),
       provideFirestore(() => getFirestore()), 
       provideDatabase(() => getDatabase()), 
       provideStorage(() => getStorage()),
       provideHttpClient(),
       
      ]
};
