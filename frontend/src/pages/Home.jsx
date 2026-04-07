import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Calendar, Users, MapPin, Clock, PlusCircle, CheckCircle, LayoutGrid } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import CalendarGrid from '../components/CalendarGrid';

export default function Home() {
    const [events, setEvents] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [myClubs, setMyClubs] = useState([]);
    const [activeTab, setActiveTab] = useState('feed'); 
    
    const eventToAddRef = useRef(null);
    const [addingEventId, setAddingEventId] = useState(null);

    const userToken = localStorage.getItem('token');

    const fetchPersonalizedEvents = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/events/personalized', {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setEvents(res.data);
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 404) {
                localStorage.clear();
                window.location.href = '/login';
            }
        }
    };

    const fetchAllClubs = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/clubs');
            setClubs(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMyClubs = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/clubs/my-clubs', {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setMyClubs(res.data.map(c => c.id));
        } catch (err) {
            console.error(err);
        }
    };

    const toggleFollow = async (clubId) => {
        try {
            const res = await axios.post(`http://localhost:5000/api/clubs/${clubId}/follow`, {}, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            
            if (res.data.followed) {
                setMyClubs([...myClubs, clubId]);
            } else {
                setMyClubs(myClubs.filter(id => id !== clubId));
            }
            
            fetchPersonalizedEvents();
        } catch (err) {
            console.error(err);
        }
    };

    const googleLogin = useGoogleLogin({
        scope: 'https://www.googleapis.com/auth/calendar.events',
        onSuccess: async (tokenResponse) => {
            const eventToAdd = eventToAddRef.current;
            if (!eventToAdd) return;
            
            setAddingEventId(eventToAdd.id);
            try {
                const accessToken = tokenResponse.access_token;
                
                let startDateTime = new Date(eventToAdd.date);
                if (isNaN(startDateTime.getTime())) {
                    startDateTime = new Date();
                }
                
                const gEvent = {
                    summary: eventToAdd.title,
                    description: eventToAdd.description || '',
                    location: eventToAdd.venue || '',
                    start: {
                        dateTime: startDateTime.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
                    },
                    end: {
                        dateTime: new Date(startDateTime.getTime() + 60*60*1000).toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
                    }
                };
    
                await axios.post('https://www.googleapis.com/calendar/v3/calendars/primary/events', gEvent, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });
                alert('Event successfully added to your Google Calendar!');
            } catch (error) {
                console.error(error);
                alert('Failed to add event to Google Calendar');
            } finally {
                setAddingEventId(null);
                eventToAddRef.current = null;
            }
        },
        onError: (error) => {
            console.error('Login Failed:', error);
            alert('Google Sign-In Failed');
        }
    });

    const handleAddToCalendar = (event) => {
        eventToAddRef.current = event;
        googleLogin();
    };

    useEffect(() => {
        if (activeTab === 'feed' || activeTab === 'calendar') {
            fetchPersonalizedEvents();
        } 
        if (activeTab === 'clubs' || activeTab === 'calendar') {
            fetchAllClubs();
            fetchMyClubs();
        }
    }, [activeTab]);

    return (
        <div style={{ padding: '0 20px' }}>
            <div className="tabs-container">
                <button 
                    onClick={() => setActiveTab('feed')}
                    className={`tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
                >
                    <Calendar size={18} /> Event Feed
                </button>
                <button 
                    onClick={() => setActiveTab('calendar')}
                    className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
                >
                    <LayoutGrid size={18} /> Visual Calendar
                </button>
                <button 
                    onClick={() => setActiveTab('clubs')}
                    className={`tab-btn ${activeTab === 'clubs' ? 'active' : ''}`}
                >
                    <Users size={18} /> Manage Clubs
                </button>
            </div>

            <div className="tab-content" style={{ animation: 'slideUp 0.4s ease-out' }}>
                {activeTab === 'feed' && (
                    <div>
                        <div className="feed-header">
                            <h2 className="text-gradient">Upcoming in your Feed</h2>
                        </div>
                        
                        {events.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <Calendar size={48} style={{ margin: '0 auto 20px', opacity: 0.5 }} />
                                <h3 style={{ color: '#fff', marginBottom: '10px' }}>No events found</h3>
                                <p>You haven't followed any clubs yet, or your clubs have no upcoming events.</p>
                                <button onClick={() => setActiveTab('clubs')} className="btn-primary" style={{ maxWidth: '250px', marginTop: '20px' }}>
                                    Find Clubs to Follow
                                </button>
                            </div>
                        ) : (
                            <div className="events-list">
                                {events.map((event) => (
                                    <div key={event.id} className="event-card glass-panel">
                                        <div className="event-card-header">
                                            <div>
                                                <span className="club-badge">{event.club.name}</span>
                                                <h3 className="event-title">{event.title}</h3>
                                            </div>
                                            <div className="event-date">
                                                {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                        
                                        <p className="event-desc">{event.description}</p>
                                        
                                        <div className="event-meta">
                                            <div className="meta-item">
                                                <Clock size={16} /> {event.time}
                                            </div>
                                            <div className="meta-item">
                                                <MapPin size={16} /> {event.venue}
                                            </div>
                                        </div>
                                        
                                        <div className="event-actions">
                                            {event.registrationLink && (
                                                <a href={event.registrationLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ width: 'auto', display: 'inline-block' }}>
                                                    Register Now
                                                </a>
                                            )}
                                            <button 
                                                onClick={() => handleAddToCalendar(event)}
                                                disabled={addingEventId === event.id}
                                                className="btn-secondary"
                                            >
                                                <Calendar size={16} />
                                                {addingEventId === event.id ? 'Adding...' : 'Add to Calendar'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <CalendarGrid events={events} />
                    </div>
                )}

                {activeTab === 'clubs' && (
                    <div>
                        <div className="feed-header">
                            <h2 className="text-gradient">Campus Clubs</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Follow clubs to personalize your event feed and calendar.</p>
                        </div>
                        
                        <div className="clubs-grid">
                            {clubs.map(club => {
                                const isFollowing = myClubs.includes(club.id);
                                return (
                                    <div key={club.id} className="club-card glass-panel">
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                            <div className="club-avatar" style={{ flexShrink: 0 }}>{club.name.charAt(0)}</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{club.name}</h4>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{club.handle}</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => toggleFollow(club.id)}
                                            style={{ flexShrink: 0, marginLeft: '12px' }}
                                            className={`btn-follow ${isFollowing ? 'following' : 'unfollowed'}`}
                                        >
                                            {isFollowing ? (
                                                <><CheckCircle size={16} /> Following</>
                                            ) : (
                                                <><PlusCircle size={16} /> Follow</>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
