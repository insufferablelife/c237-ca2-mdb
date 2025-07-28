const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer');


const app = express();

// DB connection
const db = mysql.createConnection({
  host: '45-zxi.h.filess.io',
  user: 'c237ca2mdb_parentfirm',
  password: '31dd640ff0e2f511ec52c95260c99c4725c046b3',
  database: 'c237ca2mdb_parentfirm',
  port: '3307'
});

db.connect(err => {
  if (err) {
    console.error('DB connection error:', err);
  } else {
    console.log('DB connected');
  }
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'your_secret_key',
  resave: false,               
  saveUninitialized: true
}));

app.use(require('connect-flash')());


app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



// Routes
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

app.get('/movieList', (req, res) => {
  db.query('SELECT * FROM movies', (err, results) => {
    if (err) {
      return res.status(500).send("Database error");
    }
    res.render('movieList', { movies: results });
  });
});

//Login and Register-Yizhe

const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

const checkAdmin = (req, res, next) => {
    if (req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/dashboard');
    }
};

// yow sun - terminated screen
const checkTermed = (req, res, next) => {
    if (req.session.user.isBanned === '0') {
        return next();
    } else {
        req.flash('error', 'Your account has been terminated.');
        res.redirect('/banned');
    }
};

const validateRegistration = (req, res, next) => {
    const { name, username, password, email, birthday, gender} = req.body;

    if (!name || !username || !email || !password || !birthday || !gender) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};


app.get('/', (req, res) => {
  res.render('index');
});

// Register page
app.get('/register', (req, res) => {
  res.render('register');
});
// Handle register
app.post('/register', validateRegistration, (req, res) => {
  const { name, username, password, email, birthday, gender } = req.body;
  const query = 'INSERT INTO users (name, username, password, email, birthday, gender) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [name, username, email, password, birthday, gender], (err) => {
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
  res.render('login');
});

// Handle login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM users WHERE username = ? AND password = SHA1(?)';

  db.query(query, [username, password], (err, results) => {
    if (err || results.length === 0) {
      req.flash('error', 'Invalid username or password.');
      return res.redirect('/login');
    }

    const user = results[0];
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    // Redirect based on role
    if (user.role === 'admin') {
      res.redirect('/admin');
    } else {
      res.redirect('/dashboard');
    }
  });
});


// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/admin', checkAuthenticated, checkAdmin, (req, res) => {
  res.render('admin', {user : req.session.user });
});



// Movie List page (protected)
app.get('/movieList', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('movieList', { user: req.session.user });
});

const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });
//
// Add Movie
app.get('/addMovie', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addMovie', {user: req.session.user } ); 
});

app.post('/addMovie', upload.single('image'),  (req, res) => {
    const { name, rating, date} = req.body;
    let image;
    if (req.file) {
        image = req.file.filename;
    } else {
        image = null;
    }

    const sql = 'INSERT INTO movies (name, rating, date, image) VALUES (?, ?, ?, ?)';
    connection.query(sql , [name, rating, date, image], (error, results) => {
        if (error) {
            console.error("Error adding movie:", error);
            res.status(500).send('Error adding movie');
        } else {
            res.redirect('/movieList');
        }
    });
});

// Update
app.get('/updateMovie/:id',checkAuthenticated, checkAdmin, (req,res) => {
    const movieId = req.params.id;
    const sql = 'SELECT * FROM movies WHERE movieId = ?';
    connection.query(sql , [movieId], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            res.render('updateMovie', { movie: results[0] });
        } else {
            res.status(404).send('Movie not found');
        }
    });
});
app.post('/updateMovie/:id', upload.single('image'), (req, res) => {
    const movieId = req.params.id;
    const { name, year, rating } = req.body;
    let image  = req.body.currentImage; 
    if (req.file) { 
        image = req.file.filename; 
    };

    const sql = 'UPDATE movies SET name = ? , year = ?, rating = ?, image =? WHERE movieId = ?';
    connection.query(sql, [name, year, rating, image, movieId], (error, results) => {
        if (error) {
            console.error("Error updating Movie:", error);
            res.status(500).send('Error updating Movie');
        } else {
            res.redirect('/MovieList');
        }
    });
});

//Delete
app.get('/deleteMovie/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const movieId = req.params.id;

    connection.query('DELETE FROM movies WHERE movieId = ?', [movieId], (error, results) => {
        if (error) {
            console.error("Error deleting Movie:", error);
            res.status(500).send('Error deleting Movie');
        } else {
            res.redirect('/MovieList');
        }
    });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
