import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { Observable, from } from 'rxjs';
declare let solid: any;

// Service
import { RdfService } from './rdf.service';

interface SolidSession {
  accessToken: string;
  clientId: string;
  idToken: string;
  sessionKey: string;
  webId: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  session: Observable<SolidSession>;
  fechInit = {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/sparql-update',
    },
    body: '',
  };

  constructor(private router: Router, private rdf: RdfService) {
    this.isSessionActive();
  }

  /*
   * This will check if current session is active to avoid security problems
  */
  isSessionActive = async () => {
    this.session = from(solid.auth.currentSession());
  }

  solidLoginPopup = async () => {
    try {
      await solid.auth.popupLogin({ popupUri: './login'});
      // Check if session is valid to avoid redirect issues
      await this.isSessionActive();

      // popupLogin success redirect to profile
      this.router.navigate(['/card']);
    } catch (error) {
      console.log(`Error: ${error}`);
    }
  }

  solidSignOut = async () => {
    try {
      await solid.auth.logout();
      // Remove localStorage
      localStorage.removeItem('solid-auth-client');
      // Redirect to home page
      this.router.navigate(['/']);
    } catch (error) {
      console.log(`Error: ${error}`);
    }
  }

  saveOldUserData = (profile: any) => {
    if (!localStorage.getItem('oldProfileData')) {
      localStorage.setItem('oldProfileData', JSON.stringify(profile));
    }
  }

  getOldUserData = () => {
    return JSON.parse(localStorage.getItem('oldProfileData'));
  }

  parseDeleteSparkQL = () => {
  }

  parseUpdateSparkQL = (options: { key: string, value: any, oldValue: any }) => {
    const deleteQuery = `DELETE DATA { <${this.rdf.session.webId}>
    <http://www.w3.org/2006/vcard/ns#${options.key}> "${options.oldValue}" } `;
    const insertQuery = `INSERT DATA{ <${this.rdf.session.webId}> <http://www.w3.org/2006/vcard/ns#${options.key}> "${options.value}". } `;

    if (options.oldValue) {
      return `${deleteQuery} ${insertQuery}`;
    }

    return insertQuery;
  }

  parseInsertDeleteSarkQL = (options: { key: string, value: any, action: string }) => {
    return `${options.action} { <${this.rdf.session.webId}> <http://www.w3.org/2006/vcard/ns#${options.key}> "${options.value}". }`;
  }

  solidAuthForm = (form: NgForm) => {
    const values = form.value;
    const fields = Object.keys(values);
    const getOldUserData = this.getOldUserData();
    let bodyRequest = '';

    fields.map((field, index) => {
      bodyRequest += this.parseUpdateSparkQL({
        key: field,
        value: values[field],
        oldValue: getOldUserData[field],
      });
    });

    return bodyRequest;
  }

  updateProfile = async (form: NgForm) => {
    try {
      this.fechInit.body = this.solidAuthForm(form);
      console.log(this.fechInit.body, 'profile update');
      await solid.auth.fetch(this.rdf.session.webId, this.fechInit);
    } catch (error) {
      console.log(`Error: ${error}`);
    }
  }

  /* updateProfile = async (key: string, value: any) => {
    try {
      this.fechInit.body = this.parseUpdateSparkQL({ key, value });

      await SolidAuthClient.fetch(this.rdf.session.webId, this.fechInit);
    } catch (error) {
      console.log(`Error: ${error}`);
    }
  } */

  insertDeleteProfile = async (key: string, value: any, action: string = 'INSERT') => {
    try {
      this.fechInit.body = this.parseInsertDeleteSarkQL({ key, value, action });

      await solid.auth.fetch(this.rdf.session.webId, this.fechInit);
    } catch (error) {
      console.log(`Error: ${error}`);
    }
  }

  solidLogin = async (idp: string) => {
    await solid.auth.login(idp, {
      callbackUri: `${window.location.href}card`,
      storage: localStorage,
    });
  }

  getIdentityProviders(): object[] {
    return [
      {
        providerName: 'Inrupt',
        providerImage: '/assets/images/Inrupt.png',
        providerLoginUrl: '0',
        providerDesc: 'Lorem ipsum dolor sit amet non ipsom dolor'
      },
      {
        providerName: 'Solid Community',
        providerImage: '/assets/images/SolidAuthClient.png',
        providerLoginUrl: '1',
        providerDesc: 'Lorem ipsum dolor sit non consectetur'
      },
      {
        providerName: 'Janeiro Digital',
        providerImage: '/assets/images/JD.svg',
        providerLoginUrl: 'https://janeirodigital.exchange/authorize/',
        providerDesc: 'Lorem ipsum dolor sit amet non'
      },
      {
        providerName: 'Other (Enter WebID)',
        providerImage: '/assets/images/Generic.png',
        providerLoginUrl: null
      }
    ];
  }
}
