const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer'); 
const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'images')); // Directory to save uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// DB connection
const db = mysql.createConnection({
  host: 'c237-all.mysql.database.azure.com',
  user: 'c237admin',
  password: 'c2372025!',
  database: 'c237_e65l_md',
  port: 3306
});

db.connect((err) => {
  if (err) {
    console.error('DB connection error:', err);
  } else {
    console.log('DB connected');
  }
});

//  Set up view engine
app.set('view engine', 'ejs');
//  enable static files
app.use(express.static(path.join(__dirname, 'public')));
// enable form processing
app.use(express.urlencoded({ extended: false }));

// Session Middleware
app.use(session({
  secret: 'your_secret_key',
  resave: false,               
  saveUninitialized: true,
  // Session expires after 1 week of inactivity
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));

// Middleware to make flash msg available
app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});



// yow sun - terminated screen
const checkTermed = (req, res, next) => {
    if (req.session.user.isBanned == 0) {
        return next();
    } else {
        req.flash('error', 'Your account has been terminated.');
        res.redirect('/banned');
    }
};

//Check Whether is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/movieList');
    }
};

//Login and Register - Yizhe
// See User Logged in ornot
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};


// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { name, username, password, email, birthday, gender} = req.body;

    if (!name || !username || !password || !email || !birthday || !gender) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// Define Routes
// Register page
app.get('/register', (req, res) => {
  res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});

// Handle registration
app.post('/register', validateRegistration, (req, res) => {
  const { name, username, password, email, birthday, gender } = req.body;
  const query = 'INSERT INTO users (name, username, password, email, birthday, gender) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [name, username, password, email, birthday, gender], (err, result) => {
    if (err) {
        throw err;
    }
    console.log(result); 
    req.flash('success', 'Registration successful! Please log in.');
    res.redirect('/login');
  });
});

// Login page
app.get('/login', (req, res) => {
  res.render('login', { messages: req.flash('success'), errors: req.flash('error') });
});

// Handle login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Validate username and password
  if (!username || !password) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/login'); 
  }

  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
    // Error logging in OR Invalid login credentials
    if (err || results.length === 0) {
      req.flash('error', 'Failed login, invalid username or password.');
      return res.redirect('/login');
    }

    // Creation of user.id, user.username, user.role for redirecting after login
    const user = results[0];
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      isBanned: user.isBanned
    };

    // Successful login
    if (results.length > 0) {
      req.flash('success', 'Login successful!');
    // Redirect based on role
      if (user.role === 'admin') {
      res.redirect('/admin');
      } else {
      res.redirect('/movieList');
      }
    }
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Home/Base Start page
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('index', { user: req.session.user });
});

// Admin Start page
app.get('/admin', checkAuthenticated, checkAdmin, checkTermed, (req, res) => {
  res.render('admin', {user : req.session.user });
});

// userList - Yow Sun (AI was used)
app.get('/userList', checkAuthenticated, checkAdmin, checkTermed, (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) {
      req.flash('error', 'Database error');
      return res.redirect('/');
    }
    res.render('userList', { user: req.session.user, users: results });
  });
});

// Termed page - Yow Sun
app.get('/banned', (req, res) => {
  res.render('banned', { message: req.flash('error') });
});

// Search/Filter Function - Jing Xiang + // User Start page
app.get('/movieList', checkAuthenticated, checkTermed, (req, res) => {
  const search = req.query.search || ''; //get search input from query string
  const ratingFilter = req.query.rating || ''; // optional dropdown filter

  let sql = 'SELECT * FROM movies WHERE 1=1'; // base query (true/false)
  let params = [];

  if (search) {
    sql += ' AND name LIKE ?';
    params.push(`%${search}%`); 
  }

  if (ratingFilter) {
    sql += ' AND rating = ?';
    params.push(ratingFilter);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).send("Database error");
    }
    res.render('movieList', { 
      movies: results,
      user: req.session.user,
      search,
      ratingFilter
    });
  });
});
//

// movieAdmin 
app.get('/movieAdmin', checkAuthenticated, checkAdmin, checkTermed, (req, res) => {
  const search = req.query.search || ''; //get search input from query string
  const ratingFilter = req.query.rating || ''; // optional dropdown filter

  let sql = 'SELECT * FROM movies WHERE 1=1'; // base query (true/false)
  let params = [];

  if (search) {
    sql += ' AND name LIKE ?';
    params.push(`%${search}%`); 
  }

  if (ratingFilter) {
    sql += ' AND rating = ?';
    params.push(ratingFilter);
  }

  db.query('SELECT * FROM movies', (err, results) => {
    if (err) {
      return res.status(500).send("Database error");
    }
    res.render('movieAdmin', { 
      movies: results,
      user: req.session.user,
      search,
      ratingFilter
    });
  });
});
//


// Add Movie ~Raeann
app.get('/addMovie', checkAuthenticated, checkTermed, (req, res) => {
    res.render('addMovie', {user: req.session.user } ); 
});

app.post('/addMovie', upload.single('image'),  (req, res) => {
    const { name, rating, releaseDate} = req.body;
    let image;
    if (req.file) {
        image = req.file.filename;
    } else {
        image = null;
    }

    const sql = 'INSERT INTO movies (name, rating, releaseDate, image) VALUES (?, ?, ?, ?)';
    db.query(sql , [name, rating, releaseDate, image], (error, results) => {
        if (error) {
            console.error("Error adding movie:", error);
            res.status(500).send('Error adding movie');
        } else {
            res.redirect('/movieList');
        }
    });
});
//



// Update -Zhafran
app.get('/updateMovie/:id',checkAuthenticated, checkAdmin, checkTermed,(req,res) => {
    const movieID = req.params.id;
    const sql = 'SELECT * FROM movies WHERE movieID = ?';
    db.query(sql , [movieID], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            res.render('updateMovie', { movies: results[0] });
        } else {
            res.status(404).send('Movie not found');
        }
    });
});
app.post('/updateMovie/:id', upload.single('image'), checkAuthenticated, checkAdmin, checkTermed,  (req, res) => {
    const movieID = req.params.id;
    const { name, releaseDate, rating } = req.body;
    let image  = req.body.currentImage; 
    if (req.file) { 
        image = req.file.filename; 
    };

    const sql = 'UPDATE movies SET name = ? , releaseDate = ?, rating = ?, image =? WHERE movieID = ?';
    db.query(sql, [name, releaseDate, rating, image, movieID], (error, results) => {
        if (error) {
            console.error("Error updating Movie:", error);
            res.status(500).send('Error updating Movie');
        } else {
            res.redirect('/movieList');
        }
    });
});
//



//Delete -Zhafran
app.get('/deleteMovie/:id', checkAuthenticated, checkAdmin, checkTermed, (req, res) => {
    const movieID = req.params.id;
    db.query('DELETE FROM movies WHERE movieID = ?', [movieID], (error, results) => {
        if (error) {
            console.error("Error deleting Movie:", error);
            res.status(500).send('Error deleting Movie');
        } else {
            res.redirect('/movieList');
        }
    });
});
//



// yow sun - ban user
app.get('/banUser/:id', checkAuthenticated, checkAdmin, checkTermed, (req, res) => {
    const userID = req.params.id;

    const sql = 'UPDATE users SET isBanned = 1 WHERE userId = ?';
    db.query(sql, [userID], (error, results) => {
        if (error) {
            console.error("Error banning user:", error);
            res.status(500).send('Error banning user');
        } else {
            res.redirect('/userList');
        }
    });
});

// yow sun - unban user
app.get('/unbanUser/:id', checkAuthenticated, checkAdmin, checkTermed, (req, res) => {
    const userID = req.params.id;

    const sql = 'UPDATE users SET isBanned = 0 WHERE userId = ?';
    db.query(sql, [userID], (error, results) => {
        if (error) {
            console.error("Error unbanning user:", error);
            res.status(500).send('Error unbanning user');
        } else {
            res.redirect('/userList');
        }
    });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
