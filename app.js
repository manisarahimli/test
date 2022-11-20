require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const session = require('express-session');
const {body, validationResult} = require('express-validator');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 30000}
}));

const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'usersDB'
});

conn.connect((err) => {
    if (err) throw err;
});

conn.query(`create table if not exists users(
    id int auto_increment primary key,
    username varchar(50) not null,
    password varchar(255),
    email varchar(255) not null
)`);

app.get('/', function (req,res) {
    if (req.session.isAuth) {
        const user_data = req.cookies.user_data;
        res.render('home', {username: user_data.username});
    } else {
        res.redirect('/login');
    }
});

app.get('/register', function (req,res) {
    res.render('register', {errors: null});
});

app.get('/login', function (req,res) {
    res.render('login', {errors: null});
});

app.get('/change_password', function (req,res) {
    res.render('change_password', {errors: null});
});

app.post('/register', 
    body('username').trim().escape().isLength({min: 5, max: 15}).withMessage('Username must be between 5 and 15 characters'),
    body('password').isLength({min:5}).withMessage('Paasword must be minimum 5 characters')
    .matches('[A-Z]').withMessage('Password must contain upper case letters')
    .matches('[0-9]').withMessage('Password must contain numbers'),
    body('email').isEmail().withMessage('Wrong email format'),
    async function (req,res) {
        const validationErrors = validationResult(req);
        if (validationErrors.isEmpty()) {
            const {username, password, email} = req.body;
            const hashedPassword = await bcrypt.hash(password, 10);
            const insert_sql = `insert into users(username, password, email) values("${username}", "${hashedPassword}", "${email}")`;
            const find_sql = `select * from users where username = "${username}"`;
            conn.query(find_sql, async function (err, result) {
                if (result.length !== 0) {
                    res.render('register', {errors: ['Username is already in use']});
                } else {
                    conn.query(insert_sql, async function (err) {
                        if (err) throw err;
                    });
                    console.log('Data inserted succesfully');
                    res.redirect('/login');
                }
            })
        } else {
            const errorsArray = [];
            validationErrors.array().forEach(elem =>{
                errorsArray.push(elem.msg);
            });
            res.render('register', {errors: errorsArray});
        }
});

app.post('/login', async function (req,res) {
    const {username, password} = req.body;
    const sql = `select * from users where username = "${username}"`;
    conn.query(sql, async function (err, results) {
        if (results.length === 1) {
            const result = results[0];
            await bcrypt.compare(password, result.password, async function (err, match) {
                if (match) {
                    req.session.isAuth = true;
                    res.cookie('user_data', {username: result.username}, {maxAge: 30000});
                    res.redirect('/');
                } else {
                    res.render('login', {errors: ['Incorrect password']});
                }
            })
        } else {
            res.render('login', {errors: ['User doesnt exist']});
        }
    });
});

app.post('/change_password', 
    body('new_password').isLength({min:5}).withMessage('Password must be minimum 5 characters long')
    .matches('[A-Z]').withMessage('Password must contain upper case letters')
    .matches('[0-9]').withMessage('Password must contain numbers'),
    async function (req,res) {
        const validationErrors = validationResult(req);
        if (validationErrors.isEmpty()) {
            const {username, password, new_password, confirm_new_password} = req.body;
            const sql = `select * from users where username = "${username}"`;
            conn.query(sql, async function (err, results) {
                if (results.length === 1) {
                    const result = results[0];
                    await bcrypt.compare(password, result.password, async function (err, match) {
                        if (match) {
                            if (new_password !== password) {
                                if (confirm_new_password === new_password) {
                                    const hashed_new_password = await bcrypt.hash(new_password, 10);
                                    const update_sql = `update users set password = "${hashed_new_password}" where username = "${username}"`;
                                    conn.query(update_sql, async function (err) {
                                        if (err) throw err;
                                    });
                                    res.redirect('/login');
                                } else {
                                    res.render('change_password', {errors: ['Passwords dont match']});
                                }
                            } else {
                                res.render('change_password', {errors: ['New password is the same as the old one']});
                            }
                        } else {
                            res.render('change_password', {errors: ['Incorrect password']});
                        }
                    })
                } else {
                    res.render('change_password', {errors: ['This user doesnt exist']});
                }
            })
        } else {
            const errorsArray = [];
            validationErrors.array().forEach(elem =>{
                errorsArray.push(elem.msg);
            });
            res.render('change_password', {errors: errorsArray});
        }
});

app.post('/logout', function (req,res) {
    if (req.session.isAuth) {
        req.session.isAuth = false;
        res.clearCookie('user_data');
        res.redirect('/login');
    } else {
        res.end('You hacked the system');
    }
});

app.listen(3000, function () {
    console.log('Server started on pot 3000');
});