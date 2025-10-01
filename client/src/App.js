import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import cantdoMp3 from './assets/cantdo.mp3'; // Import the sound playing function

function App() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [seats, setSeats] = useState({ available: [] });
    const [reservedSeats, setReservedSeats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedSeat, setSelectedSeat] = useState(null);
    const [email, setEmail] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [audioElement] = useState(() => {
        // Create new audio element with imported files
        const audio = document.createElement('audio');

        // Clear existing sources and add validated ones
        [
            { src: cantdoMp3, type: 'audio/mpeg' },
        ].forEach(({ src, type }) => {
            const source = document.createElement('source');
            source.src = src;
            source.type = type;
            audio.appendChild(source);
        });

        // Configure audio settings
        audio.preload = 'auto';
        return audio;
    });

    const errorAudioRef = useRef(null); // Audio ref

    const handleError = (errMsg) => {
        console.log("Error occurred:", errMsg);
        setError(errMsg);
        playErrorSound();
    };
    useEffect(() => {
        const audio = errorAudioRef.current;

        const handleCanPlay = () => {
            console.log("Audio is ready to play");
        };

        if (audio) {
            audio.addEventListener("canplaythrough", handleCanPlay);
        }

        return () => {
            if (audio) {
                audio.removeEventListener("canplaythrough", handleCanPlay);
            }
        };
    }, []);


    useEffect(() => {
        const unlockAudio = () => {
            if (errorAudioRef.current) {
                errorAudioRef.current.play().then(() => {
                    errorAudioRef.current.pause();
                    errorAudioRef.current.currentTime = 0;
                    window.removeEventListener('click', unlockAudio);
                }).catch(err => {
                    console.warn('Initial audio unlock failed:', err);
                });
            }
        };
        window.addEventListener('click', unlockAudio);
    }, []);


    useEffect(() => {
        const storedEmail = window.localStorage.getItem('user_email');
        if (storedEmail) setEmail(storedEmail);
    }, []);

    const playErrorSound = () => {
        const audio = errorAudioRef.current;

        if (!audio) return;

        if (audio.readyState >= 2) {
            audio.currentTime = 0;
            audio.play().catch(err => console.error("Audio play failed:", err));
        } else {
            console.warn("Audio not ready, waiting for canplaythrough...");
            const onCanPlay = () => {
                audio.removeEventListener("canplaythrough", onCanPlay);
                audio.currentTime = 0;
                audio.play().catch(err => console.error("Audio play failed after ready:", err));
            };
            audio.addEventListener("canplaythrough", onCanPlay);
        }
    };





    const fetchSeats = async () => {
        setLoading(true);
        setError(null);
        try {
            const availableRes = await fetch(`http://10.99.2.143:5000/api/seats/available?date=${encodeURIComponent(date)}`);
            const reservedRes = await fetch(`http://10.99.2.143:5000/api/seats/reserved?date=${encodeURIComponent(date)}`);

            if (!availableRes.ok || !reservedRes.ok) {
                throw new Error('Failed to load seat data');
            }

            const availableData = await availableRes.json();
            const reservedData = await reservedRes.json();

            setSeats({
                available: Array.isArray(availableData.available_seats) ? availableData.available_seats : []
            });

            setReservedSeats(
                Array.isArray(reservedData.reserved_seats) ? reservedData.reserved_seats : []
            );
        } catch (err) {
            console.error('Fetch error:', err);
            handleError(err.message || 'Failed to load seat data');
            setSeats({ available: [] });
            setReservedSeats([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSeats();
    }, [date]);

    const handleReservation = async (e) => {
        e.preventDefault();
        if (!selectedSeat || !email) return;

        try {
            window.localStorage.setItem('user_email', email);
            const response = await fetch('http://10.99.2.143:5000/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_email: email,
                    seat_name: selectedSeat,
                    reservation_date: date
                }),
            });

            if (!response.ok) {
                throw new Error('Reservation failed. Seat might already be taken or you have an existing reservation.');
            }

            await fetchSeats();
            setSuccessMessage(`Reservation for ${selectedSeat} confirmed!`);
            setSelectedSeat(null);
        } catch (err) {
            handleError(err.message);
        }
    };

    const handleCancel = async (seatNumber) => {
        if (!email) {
            handleError("Enter your email before cancelling.");
            return;
        }

        try {
            const response = await fetch('http://10.99.2.143:5000/api/reservations', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_email: email,
                    seat_name: seatNumber,
                    reservation_date: date
                }),
            });

            if (!response.ok) {
                throw new Error('Cancellation failed. You may only cancel your own reservations.');
            }

            await fetchSeats();
            setSuccessMessage(`Reservation for ${seatNumber} cancelled.`);
        } catch (err) {
            handleError(err.message);
        }
    };

    return (
        <div className="App" style={{ maxWidth: '800px', margin: 'auto', padding: '20px' }}>
            <h1>Seat Reservation System - Courtesy of CAL9000</h1>

            {/* Audio element hidden in UI */}
            <audio ref={errorAudioRef}>
                {/*<source src="/cantdo.ogg" type="audio/ogg" />*/}
                <source src="/cantdo.mp3" type="audio/mpeg" />
                {/*<source src="/cantdo.wav" type="audio/wav" />*/}
                Your browser does not support the audio element.
            </audio>

            {successMessage && (
                <div className="success-message">
                    {successMessage}
                    <button onClick={() => setSuccessMessage('')}>×</button>
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            <div className="user-info-form" style={{ marginBottom: '15px' }}>
                <label htmlFor="email">Your Email:</label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    placeholder="Enter your email"
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    disabled={loading}
                />
            </div>

            <div className="date-picker" style={{ marginBottom: '15px' }}>
                <label htmlFor="date">Select Date:</label>
                <input
                    type="date"
                    id="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
            </div>

            <div className="available-seats" style={{ marginBottom: '20px' }}>
                <h3>Available Seats:</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {seats.available.length > 0 ? (
                        seats.available.map(seat => (
                            <button
                                key={seat}
                                className={`seat ${selectedSeat === seat ? 'selected' : ''}`}
                                onClick={() => setSelectedSeat(seat)}
                                disabled={loading}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid #ccc',
                                    background: selectedSeat === seat ? '#007bff' : '#f8f8f8',
                                    color: selectedSeat === seat ? '#fff' : '#333',
                                    cursor: 'pointer'
                                }}
                            >
                                {seat}
                            </button>
                        ))
                    ) : (
                        <p>No available seats for this date.</p>
                    )}
                </div>
            </div>

            <div className="reservation-form" style={{ marginBottom: '30px' }}>
                <h2>Confirm Reservation</h2>
                <form onSubmit={handleReservation}>
                    {selectedSeat && (
                        <div className="seat-selection" style={{ marginBottom: '10px' }}>
                            Selected Seat: <strong>{selectedSeat}</strong>
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={!selectedSeat || loading || !email}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        Reserve Now
                    </button>
                </form>
            </div>

            <div className="booked-seats">
                <h3>Reserved Seats:</h3>
                {reservedSeats.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {reservedSeats.map(({ seat_name, user_email }) => (
                            <li
                                key={seat_name}
                                className="booked-seat"
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px',
                                    borderBottom: '1px solid #ddd'
                                }}
                            >
                                <div>
                                    <strong>{seat_name}</strong> — {user_email}
                                </div>
                                {user_email === email && (
                                    <button
                                        onClick={() => handleCancel(seat_name)}
                                        style={{
                                            backgroundColor: '#dc3545',
                                            color: 'white',
                                            border: 'none',
                                            padding: '6px 12px',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No reservations for this date.</p>
                )}
            </div>
        </div>
    );
}

export default App;
