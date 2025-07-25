from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import pyodbc
from dotenv import load_dotenv
import os
import datetime

load_dotenv()
app = Flask(__name__)
CORS(app)  # Enable CORS if needed

# Database connection setup
def get_db():
    server = os.getenv('DB_SERVER')
    database = os.getenv('DB_NAME')
    username = os.getenv('DB_USERNAME')
    password = os.getenv('DB_PASSWORD')
    driver = '{ODBC Driver 17 for SQL Server}'
    conn_str = (
        f'DRIVER={driver};'
        f'SERVER={server};'
        f'DATABASE={database};'
        f'UID={username};'
        f'PWD={password};'
        f'Trusted_Connection=no;'
    )
    return pyodbc.connect(conn_str)

# Create global connection object
connection = get_db()

def count_business_days(start, end):
    if start > end:
        return 0
    business_days = 0
    current_day = start
    while current_day <= end:
        if current_day.weekday() < 5:  # Mon-Fri
            business_days += 1
        current_day += datetime.timedelta(days=1)
    return business_days

@app.route('/api/seats/available', methods=['GET'])
def available_seats():
    date_str = request.args.get('date')
    try:
        selected_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except:
        return jsonify({'error': 'Invalid date format (use YYYY-MM-DD)'}), 400

    today = datetime.date.today()

    if (selected_date - today).days > 7 or selected_date < today:
        return jsonify({'error': 'Date must be within the next 7 days'}), 400

    business_days = count_business_days(today, selected_date)
    if business_days > 10:
        return jsonify({'error': 'Exceeds maximum of 10 business days ahead'}), 400

    cursor = connection.cursor()
    cursor.execute("SELECT seat_name FROM Reservations WHERE reservation_date=?", selected_date)
    #cursor.execute("SELECT name as seat_name FROM Seats WHERE NOT EXISTS(SELECT 1 FROM Reservations WHERE Reservations.seat_name = Seats.name and Reservations.reservation_date=?", selected_date)
    reserved_seats = [row.seat_name for row in cursor.fetchall()]

    if reserved_seats:
        placeholders = ','.join(['?'] * len(reserved_seats))
        query = f"SELECT name FROM Seats WHERE name NOT IN ({placeholders})"
        cursor.execute(query, reserved_seats)
    else:
        cursor.execute("SELECT name FROM Seats WHERE NOT EXISTS(SELECT 1 FROM Reservations WHERE Reservations.seat_name = Seats.name and Reservations.reservation_date=?", selected_date)

    available = [row.name for row in cursor.fetchall()]
    return jsonify({'available_seats': available})

@app.route('/api/reservations', methods=['POST'])
def create_reservation():
    data = request.get_json()
    user_email = data.get('user_email')
    seat_name = data.get('seat_name')
    date_str = data.get('reservation_date')

    if not all([user_email, seat_name, date_str]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        selected_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except:
        return jsonify({'error': 'Invalid reservation date format'}), 400

    today = datetime.date.today()

    if (selected_date - today).days > 7 or selected_date < today:
        return jsonify({'error': 'Date outside allowed range'}), 400

    business_days = count_business_days(today, selected_date)
    if business_days > 10:
        return jsonify({'error': 'Exceeds business day limit'}), 400

    cursor = connection.cursor()

    # Check seat exists
    cursor.execute("SELECT name FROM Seats WHERE name=?", seat_name)
    if not cursor.fetchone():
        return jsonify({'error': 'Seat does not exist'}), 404

    # Existing user reservation check
    cursor.execute(
        "SELECT id FROM Reservations WHERE user_email=? AND reservation_date=?",
        (user_email, selected_date)
    )
    if cursor.fetchone():
        return jsonify({'error': 'User already has a reservation on this date'}), 400

    # Seat availability check
    cursor.execute(
        "SELECT id FROM Reservations WHERE seat_name=? AND reservation_date=?",
        (seat_name, selected_date)
    )
    if cursor.fetchone():
        return jsonify({'error': 'Seat is already reserved'}), 409

    # Create new reservation
    try:
        cursor.execute(
            "INSERT INTO Reservations (user_email, seat_name, reservation_date) VALUES (?, ?, ?)",
            (user_email, seat_name, selected_date)
        )
        connection.commit()
        return jsonify({'message': 'Reservation created'}), 201
    except Exception as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500

# DELETE route to cancel a reservation
@app.route('/api/reservations', methods=['DELETE'])
def cancel_reservation():
    data = request.get_json()
    user_email = data.get('user_email')
    seat_name = data.get('seat_name')
    date_str = data.get('reservation_date')

    if not all([user_email, seat_name, date_str]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        selected_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except:
        return jsonify({'error': 'Invalid reservation date format'}), 400

    cursor = connection.cursor()

    cursor.execute(
        "DELETE FROM Reservations WHERE user_email=? AND seat_name=? AND reservation_date=?",
        (user_email, seat_name, selected_date)
    )
    rows_deleted = cursor.rowcount

    if rows_deleted == 0:
        return jsonify({'error': 'No matching reservation found'}), 404

    connection.commit()
    return jsonify({'message': 'Reservation cancelled'}), 200

@app.route('/api/seats/reserved', methods=['GET'])
def reserved_seats():
    date_str = request.args.get('date')
    try:
        selected_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except:
        return jsonify({'error': 'Invalid date format (use YYYY-MM-DD)'}), 400

    cursor = connection.cursor()
    cursor.execute(
        "SELECT seat_name, user_email FROM Reservations WHERE reservation_date = ?",
        (selected_date,)
    )
    reservations = [{'seat_name': row.seat_name, 'user_email': row.user_email} for row in cursor.fetchall()]
    return jsonify({'reserved_seats': reservations})



if __name__ == '__main__':
    app.run(debug=False,host='0.0.0.0', port=5000)
    # For Flask (ensure you're listening on all interfaces)

