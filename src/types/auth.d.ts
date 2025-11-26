/* src/types/auth.d.ts */

export interface User {
    id: number;
    username: string;
    role: 'Admin' | 'User';
    zona: string;
}

export interface LoginResponse {
    success: boolean;
    data: {
        token: string;
        user: User;
    };
    message?: string;
}