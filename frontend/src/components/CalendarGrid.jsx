import React, { useState } from 'react';
import { Calendar as CalendarIcon, LogIn } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

export default function CalendarGrid({ events }) {
    const [googleEmail, setGoogleEmail] = useState(localStorage.getItem('google_email'));
    const [isLoading, setIsLoading] = useState(false);

    const login = useGoogleLogin({
        scope: 'email https://www.googleapis.com/auth/calendar.events',
        onSuccess: async (tokenResponse) => {
            setIsLoading(true);
            try {
                const res = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const email = res.data.email;
                setGoogleEmail(email);
                localStorage.setItem('google_email', email);
            } catch (err) {
                console.error(err);
                alert('Failed to fetch user info from Google.');
            } finally {
                setIsLoading(false);
            }
        },
        onError: () => {
            alert('Google Login Failed');
        }
    });

    if (!googleEmail) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CalendarIcon className="mx-auto h-16 w-16 text-blue-500 mb-6" />
                <h3 className="text-2xl font-bold text-gray-800 mb-4">View Your Google Calendar</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Sign in with your Google account to view your personalized monthly Google Calendar directly within NITK Assist.
                </p>
                <button 
                    onClick={() => login()}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors gap-3 shadow-md hover:shadow-lg disabled:opacity-75"
                >
                    <LogIn size={20} />
                    {isLoading ? 'Signing in...' : 'Sign in with Google'}
                </button>
            </div>
        );
    }

    const embeddedUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(googleEmail)}&ctz=Asia/Kolkata&mode=MONTH&showPrint=0`;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden flex flex-col" style={{ height: '700px' }}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <CalendarIcon className="text-blue-600" size={20} />
                    My Google Calendar
                </h3>
                <button 
                    onClick={() => {
                        localStorage.removeItem('google_email');
                        setGoogleEmail(null);
                    }}
                    className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium"
                >
                    Sign Out of Calendar
                </button>
            </div>
            <div className="flex-1 w-full bg-gray-50 p-2">
                <iframe 
                    src={embeddedUrl}
                    style={{ border: 0, width: '100%', height: '100%', borderRadius: '8px' }}
                    frameBorder="0" 
                    scrolling="no"
                    title="Google Calendar"
                ></iframe>
            </div>
        </div>
    );
}
