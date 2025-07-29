const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const session = require('express-session');
const sendDecisionEmail = require('./public/js/sendMail');
require('dotenv').config();


const app = express();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
};

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Database initialization
async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 1. Users table with new roles
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('student', 'admin', 'mentor', 'event_handler') NOT NULL,
        committee_id INT NULL
      )
    `);

    // 2. Committees table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS committees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        school VARCHAR(255),
        section VARCHAR(255)
      )
    `);
    
    // 3. Status table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    
    // 4. Events table with approval tracking
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        committee_id INT NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        date_filled DATE NOT NULL,
        venue VARCHAR(255) NOT NULL,
        date_from DATE NOT NULL,
        date_to DATE NOT NULL,
        time_slot VARCHAR(100),
        duration VARCHAR(100),
        extra_requirements TEXT,
        catering_requirements TEXT,
        status_id INT NOT NULL,
        admin_comment TEXT,
        mentor_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        handler_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        mentor_comment TEXT,
        handler_comment TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (committee_id) REFERENCES committees(id),
        FOREIGN KEY (status_id) REFERENCES status(id)
      )
    `);

    // Event overview view
    await connection.execute(`
      CREATE OR REPLACE VIEW event_overview AS
      SELECT 
        e.id,
        e.event_name,
        u.username as submitted_by,
        c.name as committee_name,
        s.name as status,
        e.mentor_status,
        e.handler_status,
        e.date_from,
        e.date_to,
        CONCAT(e.time_slot, ' (', e.duration, ')') as timing,
        e.admin_comment
      FROM events e
      JOIN users u ON e.user_id = u.id
      JOIN committees c ON e.committee_id = c.id
      JOIN status s ON e.status_id = s.id
    `);

    // Default status values
    await connection.execute(`
      INSERT IGNORE INTO status (name, description) VALUES
      ('Pending', 'Awaiting review'),
      ('Approved', 'Approved by admin'),
      ('Rejected', 'Rejected by admin')
    `);
    
    // Sample committees
    await connection.execute(`
      INSERT IGNORE INTO committees (name, school, section, email) VALUES
        ('Sports Committee', 'Main School', 'Athletics', 'naman.finland@gmail.com'),
        ('Cultural Committee', 'Arts Department', 'Performing Arts', 'krishburla6@gmail.com'),
        ('Colloquium Committee', 'Science Department', 'Research', 'krishburla4@gmail.com')
    ON DUPLICATE KEY UPDATE 
      school = VALUES(school), 
      section = VALUES(section),
      email = VALUES(email)
  `);

    // Sample users including mentors and handler
    const sampleUsers = [
      // Students
      { username: 'SportsCom', password: 'Sports123', role: 'student', committee_id: 1 },
      { username: 'Cultural', password: 'Cult123', role: 'student', committee_id: 2 },
      { username: 'Colloquium', password: 'Collo123', role: 'student', committee_id: 3 },
      // Admins
      { username: 'KrishBurla', password: 'Krish2005$', role: 'admin' },
      { username: 'NamanBhatia', password: 'Naman2005$', role: 'admin' },
      // Mentors
      { username: 'SportsMentor', password: 'Sports123', role: 'mentor', committee_id: 1 },
      { username: 'CulturalMentor', password: 'Cult123', role: 'mentor', committee_id: 2 },
      { username: 'ColloquiumMentor', password: 'Collo123', role: 'mentor', committee_id: 3 },
      // Event Handler
      { username: 'EventHandler', password: 'Event123', role: 'event_handler' }
    ];

    for (const user of sampleUsers) {
      await connection.execute(
        'INSERT IGNORE INTO users (username, password, role, committee_id) VALUES (?, ?, ?, ?)',
        [user.username, user.password, user.role, user.committee_id || null]
      );
    }

    await connection.end();
    console.log('Database initialized with mentor/handler support');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

initializeDatabase();

// Authentication middleware
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/');
  next();
}

function requireMentor(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'mentor') return res.redirect('/');
  next();
}

function requireEventHandler(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'event_handler') return res.redirect('/');
  next();
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/studentHome.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'studentHome.html'));
});

app.get('/admin/dashboard.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'adminDashboard.html'));
});

app.get('/mentor/dashboard.html', requireMentor, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mentorDashboard.html'));
});

app.get('/handler/dashboard.html', requireEventHandler, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'handlerDashboard.html'));
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      error: 'Username and password are required',
      errorType: !username ? 'username' : 'password'
    });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT u.*, c.name as committee_name FROM users u LEFT JOIN committees c ON u.committee_id = c.id WHERE username = ?',
      [username]
    );
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(401).json({ 
        error: 'Username not found',
        errorType: 'username'
      });
    }

    const user = rows[0];
    
    if (user.password !== password) {
      return res.status(401).json({ 
        error: 'Incorrect password',
        errorType: 'password'
      });
    }

    req.session.user = user;
    
    // Redirect based on role
    switch(user.role) {
      case 'admin':
        return res.redirect('/admin/dashboard.html');
      case 'mentor':
        return res.redirect('/mentor/dashboard.html');
      case 'event_handler':
        return res.redirect('/handler/dashboard.html');
      default:
        return res.redirect('/studentHome.html');
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      // Handle error case, e.g., log it and send a server error response
      console.error('Session destruction error:', err);
      return res.status(500).json({ error: 'Could not log out.' });
    }
    // The fetch request from the client expects a JSON response to know it was successful
    // before it redirects. Redirecting here is for non-JS form posts.
    // For our JS fetch, we'll send a success response. The client will handle the redirect.
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Mentor view event data
app.get('/mentor/view-event-data', requireMentor, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [event] = await connection.execute(`
      SELECT 
        e.*, 
        u.username, 
        c.name as committee_name, 
        s.name as status_name,
        e.mentor_status,
        e.handler_status,
        e.mentor_comment,
        e.handler_comment
      FROM events e
      JOIN users u ON e.user_id = u.id
      JOIN committees c ON e.committee_id = c.id
      JOIN status s ON e.status_id = s.id
      WHERE e.id = ? AND c.id = ?
    `, [req.query.id, req.session.user.committee_id]);
    await connection.end();
    
    if (event.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(event[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Handler view event data
app.get('/handler/view-event-data', requireEventHandler, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [event] = await connection.execute(`
      SELECT 
        e.*, 
        u.username, 
        c.name as committee_name, 
        s.name as status_name,
        e.mentor_status,
        e.handler_status,
        e.mentor_comment,
        e.handler_comment
      FROM events e
      JOIN users u ON e.user_id = u.id
      JOIN committees c ON e.committee_id = c.id
      JOIN status s ON e.status_id = s.id
      WHERE e.id = ?
    `, [req.query.id]);
    await connection.end();
    
    if (event.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(event[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Mentor dashboard data
app.get('/mentor/dashboard-data', requireMentor, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [events] = await connection.execute(`
      SELECT e.*, u.username, c.name as committee_name, s.name as status_name
      FROM events e
      JOIN users u ON e.user_id = u.id
      JOIN committees c ON e.committee_id = c.id
      JOIN status s ON e.status_id = s.id
      WHERE c.id = ?
      ORDER BY e.date_filled DESC
    `, [req.session.user.committee_id]);
    await connection.end();
    res.json({ events });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Handler dashboard data
app.get('/handler/dashboard-data', requireEventHandler, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [events] = await connection.execute(`
      SELECT 
        e.*, 
        u.username, 
        c.name as committee_name, 
        s.name as status_name,
        mentor.username as mentor_name
      FROM events e
      JOIN users u ON e.user_id = u.id
      JOIN committees c ON e.committee_id = c.id
      JOIN status s ON e.status_id = s.id
      LEFT JOIN users mentor ON mentor.committee_id = c.id AND mentor.role = 'mentor'
      ORDER BY e.date_filled DESC
    `);
    await connection.end();
    res.json({ events });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Mentor update status 
app.post('/mentor/update-status', requireMentor, async (req, res) => {
  try {
    const { eventId, action, comment } = req.body;
    
    // Validate input
    if (!eventId || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: { received: req.body }
      });
    }

    const validActions = ['approve', 'reject'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ 
        error: 'Invalid action',
        details: { validActions }
      });
    }

    const connection = await mysql.createConnection(dbConfig);
    

    const statusValue = action === 'approve' ? 'approved' : 'rejected';
    
    const [result] = await connection.execute(
      'UPDATE events SET mentor_status = ?, mentor_comment = ? WHERE id = ? AND committee_id = ?',
      [statusValue, comment || null, eventId, req.session.user.committee_id]
    );
    
    await connection.end();
    
    if (result.affectedRows === 1) {
      return res.json({ 
        success: true,
        message: `Event ${statusValue} successfully`
      });
    } else {
      return res.status(404).json({ 
        error: 'No matching event found or you dont have permission',
        details: {
          eventId,
          committeeId: req.session.user.committee_id,
          affectedRows: result.affectedRows
        }
      });
    }
  } catch (error) {
    console.error('Mentor update error:', error);
    return res.status(500).json({ 
      error: 'Update failed',
      detailedError: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Handler update status
app.post('/handler/update-status', requireEventHandler, async (req, res) => {
  try {
    const { eventId, action, comment } = req.body;
    
    // Validate input more thoroughly
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({ 
        error: 'Missing or invalid event ID',
        details: { received: req.body.eventId }
      });
    }

    const numericEventId = Number(eventId);
    
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid action',
        details: { received: req.body.action }
      });
    }

    const validActions = ['approve', 'reject'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ 
        error: 'Invalid action',
        details: { validActions }
      });
    }

    const connection = await mysql.createConnection(dbConfig);
    
    // Convert action to status value
    const statusValue = action === 'approve' ? 'approved' : 'rejected';
    
    // Ensure comment is properly handled
    let sanitizedComment = null;
    if (typeof comment === 'string' && comment.trim() !== '') {
      sanitizedComment = comment.trim();
    }
    
    const [result] = await connection.execute(
      'UPDATE events SET handler_status = ?, handler_comment = ? WHERE id = ?',
      [
        statusValue, 
        sanitizedComment, // This will be either a string or null
        numericEventId
      ]
    );
    
    await connection.end();
    
    if (result.affectedRows === 1) {
      return res.json({ 
        success: true,
        message: `Event ${statusValue} successfully` 
      });
    } else {
      return res.status(404).json({ 
        error: 'No matching event found',
        details: {
          eventId: numericEventId,
          affectedRows: result.affectedRows
        }
      });
    }
  } catch (error) {
    console.error('Handler update error:', error);
    return res.status(500).json({ 
      error: 'Update failed',
      detailedError: error.message,
      sqlError: error.sqlMessage
    });
  }
});

// Admin dashboard data
app.get('/admin/dashboard-data', requireAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [events] = await connection.execute(`
      SELECT 
        e.*, 
        u.username, 
        c.name as committee_name, 
        s.name as status_name,
        e.mentor_status,
        e.handler_status,
        e.mentor_comment,
        e.handler_comment
      FROM events e
      JOIN users u ON e.user_id = u.id
      JOIN committees c ON e.committee_id = c.id
      JOIN status s ON e.status_id = s.id
      ORDER BY e.date_filled DESC
    `);
    await connection.end();
    res.json({ events });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/admin/update-status', requireAdmin, async (req, res) => {
  try {
    const { eventId, status, comment } = req.body;

    const connection = await mysql.createConnection(dbConfig);
    
    // Get event details including committee email
    const [event] = await connection.execute(
      `SELECT e.event_name, e.mentor_status, e.handler_status, c.email as committee_email, 
       s.name AS status_name 
       FROM events e 
       JOIN committees c ON e.committee_id = c.id
       JOIN status s ON e.status_id = s.id 
       WHERE e.id = ?`,
      [eventId]
    );

    if (event.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Event not found' });
    }

    const currentEvent = event[0];

    // If trying to approve, check mentor and handler status
    if (status === 'Approved') {
      if (currentEvent.mentor_status !== 'approved' || currentEvent.handler_status !== 'approved') {
        await connection.end();
        return res.status(400).json({ 
          error: 'Cannot approve event',
          details: {
            mentorStatus: currentEvent.mentor_status,
            handlerStatus: currentEvent.handler_status,
            message: 'Event requires approval from both mentor and handler'
          }
        });
      }
    }

    const [statusRecord] = await connection.execute(
      "SELECT id FROM status WHERE name = ?",
      [status]
    );

    if (statusRecord.length === 0) {
      await connection.end();
      return res.status(400).json({ error: 'Invalid status' });
    }

    await connection.execute(
      'UPDATE events SET status_id = ?, admin_comment = ? WHERE id = ?',
      [statusRecord[0].id, comment || null, eventId]
    );

    // Send email after update if there's a committee email
    if (currentEvent.committee_email) {
      sendDecisionEmail(
        currentEvent.committee_email, 
        currentEvent.event_name, 
        status.toLowerCase(),
        comment
      );
    }

    await connection.end();
    res.json({ success: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// View event details
app.get('/admin/view-event-data', requireAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [event] = await connection.execute(`
      SELECT 
        e.*, 
        u.username, 
        c.name as committee_name, 
        s.name as status_name,
        e.mentor_status,
        e.handler_status,
        e.mentor_comment,
        e.handler_comment
      FROM events e
      JOIN users u ON e.user_id = u.id
      JOIN committees c ON e.committee_id = c.id
      JOIN status s ON e.status_id = s.id
      WHERE e.id = ?
    `, [req.query.id]);
    await connection.end();
    
    if (event.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(event[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// View event routes
app.get('/admin/view-event.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'view-event.html'));
});

app.get('/mentor/view-event.html', requireMentor, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'view-event.html'));
});

// Mentor Dashboard
app.get('/mentorDashboard.html', requireMentor, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mentorDashboard.html'));
});

// Handler Dashboard
app.get('/handlerDashboard.html', requireEventHandler, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'handlerDashboard.html'));
});

app.get('/handler/view-event.html', requireEventHandler, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'view-event.html'));
});

// Student status data
app.get('/student/status-data', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'student') return res.status(403).json({ error: 'Forbidden' });
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [events] = await connection.execute(`
      SELECT 
        e.*, 
        s.name as status_name, 
        e.admin_comment,
        e.mentor_status,
        e.handler_status,
        e.mentor_comment,
        e.handler_comment
      FROM events e
      JOIN status s ON e.status_id = s.id
      WHERE user_id = ?
      ORDER BY date_filled DESC
    `, [req.session.user.id]);
    await connection.end();
    res.json({ events });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Form submission
app.post('/submit-event', requireLogin, async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get the Pending status ID
    const [status] = await connection.execute(
      "SELECT id FROM status WHERE name = 'Pending'"
    );
    
    if (status.length === 0) {
      await connection.end();
      return res.status(500).json({ error: 'Pending status not found' });
    }

    // Insert the event
    const [result] = await connection.execute(
      `INSERT INTO events (
        user_id, committee_id, event_name, date_filled, venue,
        date_from, date_to, time_slot, duration, 
        extra_requirements, catering_requirements, status_id
      ) VALUES (?, ?, ?, STR_TO_DATE(?, '%d-%m-%Y'), ?, STR_TO_DATE(?, '%d-%m-%Y'), 
        STR_TO_DATE(?, '%d-%m-%Y'), ?, ?, ?, ?, ?)`,
      [
        req.session.user.id,
        req.session.user.committee_id || 1,
        req.body.eventName,
        req.body.dateFilled,
        req.body.venue,
        req.body.dateFrom,
        req.body.dateTo,
        req.body.timeSlot,
        req.body.duration,
        req.body.extraRequirements,
        req.body.cateringRequirements,
        status[0].id
      ]
    );

    await connection.end();
    
    if (result.affectedRows === 1) {
      return res.redirect('/status.html');
    } else {
      return res.status(500).json({ error: 'Failed to insert event' });
    }
  } catch (error) {
    console.error('Event submission error:', error);
    return res.status(500).json({ 
      error: 'Database error',
      detailedError: error.message 
    });
  }
});

// Venue availability check
app.post('/check-venue-availability', requireLogin, async (req, res) => {
  try {
    const { venue, dateFrom, dateTo } = req.body;
    
    const formatDateForSQL = (dateStr) => {
      const [day, month, year] = dateStr.split('-');
      return `${year}-${month}-${day}`;
    };

    const connection = await mysql.createConnection(dbConfig);
    
    const [conflicts] = await connection.execute(`
      SELECT e.id, e.event_name, e.date_from, e.date_to, e.time_slot, u.username
      FROM events e
      JOIN users u ON e.user_id = u.id
      JOIN status s ON e.status_id = s.id
      WHERE e.venue = ?
        AND s.name = 'Approved'
        AND (
          (e.date_from <= ? AND e.date_to >= ?) OR
          (e.date_from BETWEEN ? AND ?) OR
          (e.date_to BETWEEN ? AND ?)
        )
    `, [
      venue,
      formatDateForSQL(dateTo), formatDateForSQL(dateFrom),
      formatDateForSQL(dateFrom), formatDateForSQL(dateTo),
      formatDateForSQL(dateFrom), formatDateForSQL(dateTo)
    ]);
    
    await connection.end();
    
    res.json({ 
      available: conflicts.length === 0,
      conflicts 
    });
    
  } catch (error) {
    console.error('Venue check error:', error);
    res.status(500).json({ error: 'Failed to check venue' });
  }
});

// Delete event
app.delete('/admin/delete-event', requireAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      'DELETE FROM events WHERE id = ?',
      [req.query.id]
    );
    await connection.end();
    
    if (result.affectedRows === 1) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Event not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Committee statistics
app.get('/admin/committee-stats', requireAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [stats] = await connection.execute(`
      SELECT 
        c.id,
        c.name as committee_name,
        COUNT(e.id) as event_count,
        IFNULL(SUM(CASE WHEN s.name = 'Approved' THEN 1 ELSE 0 END), 0) as approved_count,
        IFNULL(SUM(CASE WHEN s.name = 'Rejected' THEN 1 ELSE 0 END), 0) as rejected_count,
        IFNULL(AVG(DATEDIFF(e.date_to, e.date_from)), 0) as avg_duration_days
      FROM committees c
      LEFT JOIN events e ON c.id = e.committee_id
      LEFT JOIN status s ON e.status_id = s.id
      GROUP BY c.id
      ORDER BY c.name
    `);
    await connection.end();
    res.json({ stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Events with most requirements
app.get('/admin/events-with-most-requirements', requireAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [events] = await connection.execute(`
      SELECT e.*, u.username, 
        (LENGTH(e.extra_requirements) + LENGTH(e.catering_requirements)) as requirements_length
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE (LENGTH(e.extra_requirements) + LENGTH(e.catering_requirements)) > 
        (SELECT AVG(LENGTH(extra_requirements) + LENGTH(catering_requirements)) FROM events)
      ORDER BY requirements_length DESC
    `);
    await connection.end();
    res.json({ events });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
