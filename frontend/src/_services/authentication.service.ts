// Modified from https://jasonwatmore.com/post/2022/11/15/angular-14-jwt-authentication-example-tutorial#login-component-ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { UServRes } from '../_models/user.service.model';
import { User } from '../_models/user.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthenticationService extends ApiService {
    protected apiPath = 'user';

    private userSubject: BehaviorSubject<User | null>;
    public user$: Observable<User | null>;

    constructor(
        private router: Router,
        private http: HttpClient,
    ) {
        super();
        const userData = localStorage.getItem('user');
        this.userSubject = new BehaviorSubject(userData ? JSON.parse(userData) : null);
        this.user$ = this.userSubject.asObservable();
    }

    public get userValue() {
        return this.userSubject.value;
    }

    login(username: string, password: string) {
        console.log('login', `${this.apiUrl}/auth/login`);
        return this.http
            .post<UServRes>(
                `${this.apiUrl}/auth/login`,
                { username: username, password: password },
                { observe: 'response' },
            )
            .pipe(
                map(response => {
                    // store user details and jwt token in local storage to keep user logged in between page refreshes
                    let user = null;
                    if (response.body) {
                        const { id, username, email, accessToken, isAdmin, createdAt } = response.body.data;
                        user = { id, username, email, accessToken, isAdmin, createdAt };
                    }
                    localStorage.setItem('user', JSON.stringify(user));
                    this.userSubject.next(user);
                    return user;
                }),
            );
    }

    createAccount(username: string, email: string, password: string) {
        return this.http
            .post<UServRes>(
                `${this.apiUrl}/users`,
                { username: username, email: email, password: password },
                { observe: 'response' },
            )
            .pipe(switchMap(() => this.login(username, password))); // auto login after registration
    }

    logout() {
        // remove user from local storage to log user out
        localStorage.removeItem('user');
        this.userSubject.next(null);
        this.router.navigate(['/account/login']);
    }
}