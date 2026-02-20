import { useState } from 'react';
import { useMapStore } from '../../store/useStore';
import { loginUser, registerUser } from '../../services/api';

export const AuthModal = () => {
    const { setAuth } = useMapStore();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const data = await loginUser({ email, password });
                setAuth(data.token, data.user);
            } else {
                await registerUser({ email, password });
                // Automatically log them in after registration by calling login
                const loginData = await loginUser({ email, password });
                setAuth(loginData.token, loginData.user);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: '#343a40', padding: '2rem', borderRadius: '8px',
                width: '350px', color: 'white', display: 'flex', flexDirection: 'column'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    {isLogin ? 'UTM Login' : 'Pilot Registration'}
                </h2>

                {error && <div style={{ color: '#ff4d4f', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid #495057', background: '#212529', color: 'white' }}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid #495057', background: '#212529', color: 'white' }}
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.8rem', background: '#339af0', color: 'white',
                            border: 'none', borderRadius: '4px', fontWeight: 'bold',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <span
                        style={{ color: '#adb5bd', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
                    </span>
                </div>
            </div>
        </div>
    );
};
