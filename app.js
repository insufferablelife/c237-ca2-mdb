const express = require('express');
const session = require('express-session');
const mysql = require('mysql2');
const path = require('path');

const app = express();

// DB connection
const db = mysql.createConnection({
  host: '45-zxi.h.filess.io',
  user: 'c237ca2mdb_parentfirm',
  password: '31dd640ff0e2f511ec52c95260c99c4725c046b3',
  database: '`c237ca2mdb_parentfirm`',
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
app.use(session({
  secret: 'your_secret_key',
  saveUninitialized: true,
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// Register page
app.get('/register', (req, res) => {
  res.render('register');
});

// Handle register
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
  db.query(query, [username, password], (err) => {
    if (err) {
      return res.send('Registration failed — username might exist.');
    }
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
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
    if (err || results.length === 0) {
      return res.send('Invalid username or password.');
    }
    req.session.user = results[0];
    res.redirect('/dashboard');
  });
});

// Dashboard page (protected)
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('dashboard', { user: req.session.user });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Add Movie
app.get('/addMovie', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addProduct', {user: req.session.user } ); 
});

app.post('/addMovie', upload.single('image'),  (req, res) => {
    const { name, rating, date} = req.body;
    let image;
    if (req.file) {
        image = req.file.filename;
    } else {
        image = null;
    }

    const sql = 'INSERT INTO movie (name, rating, date, image) VALUES (?, ?, ?, ?)';
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
    const movietId = req.params.id;
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
app.get('/deleteMovie/:id', (req, res) => {
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
