import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

describe('Auth API', () => {
    const email = 'sph3233382025@students.uonbi.ac.ke';
    let cookie: string;

    // Mock Math.random to return a predictable OTP '100000'
    // Math.floor(100000 + 0 * 900000) = 100000
    vi.spyOn(Math, 'random').mockReturnValue(0);

    it('should send OTP successfully', async () => {
        const res = await request(app)
            .post('/api/auth/send-otp')
            .send({ email });
        expect(res.status).toBe(200);
        expect(res.body.message).toBeTruthy();
    });

    it('should reject invalid OTP', async () => {
        const res = await request(app)
            .post('/api/auth/verify-otp')
            .send({ email, otp: '999999' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid OTP');
    });

    it('should verify valid OTP and set cookie', async () => {
        const res = await request(app)
            .post('/api/auth/verify-otp')
            .send({ email, otp: '100000' });

        expect(res.status).toBe(200);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toBe(email);
        expect(res.headers['set-cookie']).toBeDefined();

        // Save cookie for next test
        cookie = res.headers['set-cookie'];
    });

    it('should get current user with valid session', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe(email);
    });

    it('should reject unauthenticated request', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });
});
