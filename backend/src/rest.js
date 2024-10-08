const express = require('express');
const bodyParser = require('body-parser');
const InternshipEntryModel = require('./entry-schema.js');
const mongoose = require('mongoose');

const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');
const User = require('./user.js');
const passportConfig = require('./passport.js');
const cors = require('cors');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

const dbUser = process.env.MONGO_DB_USER;
const dbPassword = process.env.MONGO_DB_PASSWORD;

mongoose.connect('mongodb+srv://' + dbUser + ':' + dbPassword + '@internshiptracker.or0zw.mongodb.net/internshipsdb?retryWrites=true&w=majority&appName=internshiptracker')
    .then(() => {
        console.log("connected to mongodb")
    })
    .catch(() =>{
        console.log("failed to connect to mongodb");
    })

const sessionStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${dbUser}:${dbPassword}@internshiptracker.or0zw.mongodb.net/session-store`,
    mongooseConnection: mongoose.connection,
    collectionName: 'sessions'
});
    
// internships = [
//     {id: 1, date: "date1", status: "status1", company: "company1", role: "role1", notes: "notes2"},
//     {id: 2, date: "date11", status: "status11", company: "company11", role: "role11", notes: "notes22"}
// ];

const allowedOrigins = [
    'http://localhost:4200',
    'https://internship-tracker-git-main-parkabs-projects.vercel.app',
    'https://internshiptracker.onrender.com'
];

// app.use(cors({
//     origin: allowedOrigins,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     credentials: true
// }));

const allowedDomain = 'onrender.com';

function isSubdomain(origin) {
    if (!origin) return false;

    const url = new URL(origin);
    const hostname = url.hostname;

    // checking if the hostname matches the allowed domain or its subdomains
    return hostname.endsWith(allowedDomain) && (hostname !== allowedDomain);
}

app.use(cors({
    origin: function (origin, callback) {
        console.log("Origin1: ", origin);
        if (!origin || allowedOrigins.includes(origin) || isSubdomain(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS1'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.options('*', cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
// const isProduction = process.env.NODE_ENV === 'production';

app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        // secure: isProduction,
        // sameSite: isProduction ? 'None' : 'Lax'
        // secure: process.env.NODE_ENV === 'production',
        // sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',

        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        //domain: '.onrender.com',
    }
}));

//app.use(passport.authenticate('session'));

app.use(passport.initialize());
app.use(passport.session());

passportConfig(passport);

// app.use((req, res, next) =>{
//     res.setHeader('Access-Control-Allow-Origin', 'https://internship-tracker-git-main-parkabs-projects.vercel.app');
//     res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//     res.setHeader('Access-Control-Allow-Credentials', 'true');
    
//     console.log('Session:', req.session);
//     console.log('User:', req.user);

//     next();
// })

// app.get('/max-id', (req, res) =>{
//     var max = 0;
//     for (var i = 0; i < internships.length; i++){
//         if (max < internships[i].id){
//             max = internships[i].id;
//         }
//     }
//     res.json({maxId: max});
// })

// app.use((req, res, next) => {
//     console.log('tes2');
//     next();
// })

const scrypt = crypto.scrypt;
const generateSalt = () => crypto.randomBytes(16).toString('hex');

const hashPassword = (password, salt, callback) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return callback(err);
        callback(null, derivedKey.toString('hex'));
    });
};

// const verifyPassword = (password, salt, hashedPassword, callback) => {
//     hashPassword(password, salt, (err, hash) => {
//         if (err) return callback(err);
//         callback(null, hash === hashedPassword);
//     });
// };

const verifyPassword = (password, salt, hashedPassword, callback) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return callback(err);
        callback(null, derivedKey.toString('hex') === hashedPassword);
    });
};

function isAuthenticated(req, res, next) {
    //console.log(req.isAuthenticated())
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
}

// Routes
// app.post('/login', (req, res, next) => {
//     passport.authenticate('local', (err, user, info) => {
//         if (err) {
//             return next(err);
//         }
//         if (!user) {
//             return res.status(400).json({ message: info.message || 'Invalid email or password' });
//         }
//         req.login(user, (err) => {
//             if (err) {
//                 return res.status(500).json({ message: 'Server error', error: err });
//             }
//             // Successful login
//             console.log('login successful!');
//             console.log('User:', req.user);

//             res.cookie('connect.sid', req.sessionID, {
//                 httpOnly: true, // client-side js cannot access cookie
//                 secure: true, // cookie only sent on https
//                 sameSite: 'None', // cross site cookies
//                 //domain: '.onrender.com'
//             });

//             return res.status(200).json({ message: 'Login successful', user: user });
//         });
//     })(req, res, next);
// });

app.post('/login', async (req, res, next) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Verify password using the logic in passport.js
        verifyPassword(password, user.salt, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error during password verification:', err);
                return res.status(500).json({ message: 'Server error', error: err.message });
            }

            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid email or password' });
            }

            // Manually login the user
            req.login(user, (err) => {
                if (err) {
                    console.error('Error during login:', err);
                    return res.status(500).json({ message: 'Server error', error: err.message });
                }

                // Successful login
                console.log('Login successful!');
                console.log('User:', req.user);

                // Set a secure cookie
                res.cookie('connect.sid', req.sessionID, {
                    // httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
                    //domain: '.onrender.com',
                });

                return res.status(200).json({ message: 'Login successful', user: { id: user._id, email: user.email } });
            });
        });

    } catch (err) {
        console.error('Error during login process:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});
    // const { email, password } = req.body;

    // try {
    //     
    //     const user = await User.findOne({ email });
    //     if (!user) {
    //         return res.status(400).json({ message: 'Invalid email or password' });
    //     }
    //     
    //     verifyPassword(password, user.salt, user.password, (err, isMatch) => {
    //         if (err) return res.status(500).json({ message: 'Server error', error: err });
    //         if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    //         res.status(200).json({ message: 'Login successful' });
    //     });
    // } catch (error) {
    //     res.status(500).json({ message: 'Server error', error });
    // }

app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            //return res.status(409).json({ message: 'User already registered' })
            return res.status(400).json({ message: info.message || 'User already registered' });
        }

        const salt = generateSalt();
        hashPassword(password, salt, async (err, hashedPassword) => {
            if (err) return res.status(500).json({ message: 'Server error', error: err });

            const user = new User({
                email,
                password: hashedPassword,
                salt
            });

            await user.save();
            res.status(201).json({ message: 'User registered successfully' });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

app.post('/logout', (req, res) => {
    console.log('logout successful');
    req.logout(err => {
      if (err) {
        return res.status(500).json({ message: 'Failed to logout', error: err });
      }

      res.clearCookie('connect.sid', {
        path:'/', httpOnly: true
      });

      req.session.destroy(function (err){});

      res.status(200).json({ message: 'Logout successful' });
    });
  });

app.post('/add-internship', isAuthenticated, (req, res) =>{

    const userId = req.user._id;

    const internship = new InternshipEntryModel({
        date: req.body.date, 
        status: req.body.status, 
        company: req.body.company, 
        role: req.body.role, 
        notes: req.body.notes, 
        user: userId
    });
    internship.save()
        .then(() => {
            res.status(200).json({
                message: 'Post complete'
            })
        })
        .catch(err => res.status(500).json({ message: 'Error saving entry', error: err }));
    //console.log(internship);
    //internships.push({id: req.body.id, date: req.body.date, status: req.body.status, company: req.body.company, role: req.body.role, notes: req.body.notes});
})

app.delete('/remove-internship/:id', (req, res) =>{

    InternshipEntryModel.deleteOne({_id: req.params.id})
    .then(() => {
        res.status(200).json({
            message: "delete complete"
        })
    })

    // const index = internships.findIndex(el =>{
    //     return el.id == req.params.id;
    // })
    // internships.splice(index, 1);
})

app.put('/update-internship/:id', (req, res) =>{

    const userId = req.user._id;

    const updatedInternship = new InternshipEntryModel({_id: req.body._id, date: req.body.date, status: req.body.status, company: req.body.company, role: req.body.role, notes: req.body.notes, userId})
    InternshipEntryModel.updateOne({_id: req.body._id}, updatedInternship)
        .then(() => {
            res.status(200).json({
                message: 'update complete'
            })
        })

    // const index = internships.findIndex(el =>{
    //     return el.id == req.params.id;
    // })
    // internships[index] = {};
})

app.get('/internships', isAuthenticated, (req, res, next) => {
    if (!req.user) {
        console.error("No user found in request.");
        return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user._id;

    InternshipEntryModel.find({ user: userId })
        .then((data) => {
            if (!data || data.length === 0) {
                console.warn(`No internship entries found for user: ${userId}`);
            }
            res.json({ internships: data });
        })
        .catch((error) => {
            console.error("Failed to retrieve entries:", error);
            res.status(500).json({ message: "Server error while fetching internships" });
        });
});

module.exports = app;