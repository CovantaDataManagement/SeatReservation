CREATE DATABASE SeatReservation;

USE SeatReservation;

CREATE TABLE Seats (
    id INT PRIMARY KEY IDENTITY,
    name NVARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO Seats (name) VALUES 
(‘IT - 1B.441’),

(‘IT - 1B.444’),

(‘IT - 1B.C40’),

(‘IT - 1B.C41’),

(‘IT - 1B.C42’),

(‘IT - 1B.C43’),

(‘IT - 1B.C71’),

(‘IT - 1B.C72’),

(‘IT - 1B.C73’),

(‘IT - 1B.C74’),

(‘IT - 1C.701’),

(‘IT - 1C.702’),

(‘IT - 1C.703’),

(‘IT - 1C.704’),

(‘IT - 1C.705’),

(‘IT - 1C.711’),

(‘IT - 1C.713’),

(‘IT - 1C.715’);

CREATE TABLE Reservations (
    id INT PRIMARY KEY IDENTITY,
    user_email NVARCHAR(255) NOT NULL,
    seat_name NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Seats(name),
    reservation_date DATE NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT UC_UserDate UNIQUE (user_email, reservation_date),
    CONSTRAINT UC_SeatDate UNIQUE (seat_name, reservation_date)
);