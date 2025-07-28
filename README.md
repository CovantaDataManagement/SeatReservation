
**IT Service Desk Guide: Seat Reservation System Support**  
*Last Updated: [Date]* | *System Version: 1.2* | [GitHub Repository](https://github.com/CovantaDataManagement/SeatReservation)

---

### **Table of Contents**
1. **[System Overview](#system-overview)**  
2. **[Common User Issues](#common-user-issues)**  
3. **[Troubleshooting Guide](#troubleshooting-guide)**  
4. **[Maintenance Procedures](#maintenance-procedures)**  
5. **[Escalation Paths](#escalation-paths)**  

---

## **System Overview**
A seat reservation system for office hot-desking, featuring:
- API endpoints for availability checks/bookings
- SQL database backend (Seats/Reservations tables)
- Validation rules:  
  - Max 7-day advance booking  
  - Business day calculation for IT staff

---

## **Common User Issues**

| Issue | Frequency | Symptoms |
|-------|-----------|----------|
| "Ghost Seats" (Available seats that shouldn't exist) | Low | Users report seeing duplicate seat names or unavailable seats appearing available |
| Reservation Errors | Medium | `400 Bad Request` on booking attempts |
| Date Validation Issues | High | "Exceeds 10 business days" error despite valid dates |
| Cancellation Problems | Rare | Reservations persist after cancellation |

---

## **Troubleshooting Guide**

### **1. Ghost Seats / Incorrect Availability**
**Immediate Checks:**
```sql
-- Check for duplicate seats with hidden characters
SELECT 
  name, 
  LENGTH(name) as char_count,
  HEX(name) as hex_code 
FROM Seats;
```

**Expected Output Example:**  
| name    | char_count | hex_code          |
|---------|------------|-------------------|
| Seat A  | 6          | 536561742041      |
| SeatA   | 5          | 5365617441        |

**Resolution:**
- If differing lengths/hex codes appear for same-named seats:
```sql
-- Cleanup script (Run during maintenance window)
WITH duplicates AS (
    SELECT 
        name,
        HEX(TRIM(name)) as clean_name_hex, 
        MIN(rowid) as keep_id
    FROM Seats
    GROUP BY clean_name_hex
    HAVING COUNT(*) > 1
)
DELETE FROM Seats WHERE rowid NOT IN (SELECT keep_id FROM duplicates);
```

### **2. Reservation Errors**
**Diagnostic Steps:**
1. Check API logs for parameters:
   ```bash
   grep "POST /api/reserve" application.log | jq '.params'
   ```
2. Validate seat exists:
   ```sql
   SELECT * FROM Seats WHERE name = '[EXACT_SEAT_NAME]';
   ```

### **3. Date Validation Issues**
**Business Day Calculator Test:**
```python
# Sample validation (Matches production logic)
from workdays import networkdays  # Ensure v2.4.1+ is installed

def validate_days(start, end):
    return networkdays(start, end) <= 10
```

---

## **Maintenance Procedures**

### **Weekly Checks**
1. **Seat Validation Audit:**
   ```sql
   -- Find seats with non-printable characters
   SELECT * FROM Seats WHERE name REGEXP '[^ -~]';
   ```
   
2. **Orphaned Reservations Cleanup:**
   ```sql
   DELETE FROM Reservations 
   WHERE seat_name NOT IN (SELECT name FROM Seats);
   ```

### **Monthly Tasks**
1. Regenerate seat map cache:
   ```bash
   curl -X POST https://api.seatreservation/cache/rebuild
   ```
2. Verify business day configuration matches HR calendar.

---

## **Escalation Paths**

| Issue Type | Contact | Response SLA |
|------------|---------|--------------|
| Data corruption (Seats table) | DBA Team | 1 hour |
| API failure (>5% errors) | DevOps | 30 mins |
| UI/API version mismatch | Frontend Team | 2 hours |

---

**Emergency Contact:**  
[Systems Architect] - ☎️ 555-EXT-1234 | 📧 architect@covanta.com

**Change Management:**  
All database modifications require ticket approval (ID: SEAT-DB-CHG)

---

*Documentation Updated Automatically via GitHub Actions – Verify latest version [here](https://github.com/CovantaDataManagement/SeatReservation/blob/main/docs/service_desk_guide.md)*
