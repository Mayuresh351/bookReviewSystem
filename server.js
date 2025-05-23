// Dependencies
const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();


// Connect to database
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect(err => {
    if(err){
        console.log('Error connecting to database', err);
    }
    console.log('Database connected successfully');
});

// Define server and initializing app
const app = express();
app.use(express.json());

// Required APIs

app.post('/test', async(req, res) => {
    const {message} = req.body;

    if(!message){
        return res.status(204).json({message: "Kindly fill required details"});
    }

    try{
        console.log('API request successful', message);
        return res.status(200).json({message: 'API call successful'});
    }catch(err){
        console.error('API call unsuccessful', err);
        return res.status(500).json({message: "Internal server error"});
    }
}); 

// Authentication APIs
// 1. POST /signup 
app.post('/signup', async(req, res)=> {
    // Handle json request and validity of inputs
    const{username, name, password} = req.body;
    if(!username || !name || !password){
        return res.status(400).json({message: "Kindly fill required details"});
    }

    try{
        // Check whether username is available
        const [availability] = await db.promise().query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        )
        if(availability.length > 0){
            return res.status(409).json({message: "The username is unavailable. Try another..."});
        }

        // Hash the password according to SHA256 protocol for better security
        const hashedPassword = await bcrypt.hash(password, 10);

        // Store the values in the database
        const [result] = await db.promise().query(
            'INSERT INTO users (username, name, password) VALUES (?, ?, ?)',
            [username, name, hashedPassword]
        )

        // Retrieve userId
        const userID = result.insertId;

        // Create jsonwebtoken
        const token = jwt.sign({userID}, process.env.JWT_SECRET, {expiresIn: '10d'});

        // Return success status
        return res.status(201).json({message: "User created successfully", userID: userID, username: username, name: name, token: token});
    }catch(err){
        console.error('Signup error:', err);
        return res.status(500).json({ message: "Internal server error" });
    }

});

// 2. POST /login
app.post('/login', async(req, res) => {
    // Request handling
    const {username, password} = req.body;
    if(!username || !password){
        return res.status(400).json({message: "Kindly fill the required details"});
    }

    try{
        // Check if the user is present
        const [user] = await db.promise().query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        )
        
        // No user present condition
        if(user.length == 0){
            return res.status(404).json({message: "User not present"});
        }

        const userID = user[0].user_id;
        const dbPassword = user[0].password;
        const name = user[0].name;

        // Compare with password with password in database 
        const validPassword = await bcrypt.compare(password, dbPassword);
        if(!validPassword){
            return res.status(400).json({message:"Incorrect Password"});
        }

        const token = jwt.sign({ userID }, process.env.JWT_SECRET, { expiresIn: '10d' });
        
        await db.promise().query(
            'UPDATE users SET token = ? WHERE user_id = ?',
            [token, userID]
        );
        
        // Once complete return acknowledgement
        res.json({message: "Login Successful", userID, name, username, token}); // User details and token returned as per requirement

    }catch(err){
        console.log('Failed login', err );
        return res.status(500).json({message: "Server Error"});
    }
});

// Core Functionalities

// 1. POST /books 

app.post('/books', async(req, res) => {
    // Handling request packet
    const { user_id, book_name, author_name } = req.body;

    // Token handling
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header missing' });
    }
    const token = authHeader.split(' ')[1];

    // Check whether necessary info is present
    if (!user_id || !book_name || !author_name ) {
        return res.status(400).json({ error: 'Kindly fill all required details' });
    }
    
    try{
        // Check whether user exists
        const [userInfo] = await db.promise().query(
          'SELECT * FROM users WHERE user_id = ?',
          [user_id]  
        );

        if(userInfo.length == 0){
            return res.status(404).json({message: "User Not Found"});
        }

        // Check for authorized token
        const storedToken = userInfo[0].token;
        if(token !== storedToken){
            return res.status(401).status("Unauthorized access");
        }

        // Check whether the given book is already present
        const [bookCheck] = await db.promise().query(
            'SELECT * FROM books WHERE book_name = ? AND author_name = ?',
            [book_name, author_name]
        );

        if(bookCheck.length > 0){
            return res.status(400).json({message: "The book already exists"});
        }

        // Complete the entry
        await db.promise().query(
            'INSERT INTO books (book_name, author_name) VALUES (?, ?)',
            [book_name, author_name]
        );

        return res.status(201).json({message: "The required entry for book is created"});

    }catch(err){
        console.log('Error encountered while creating entry', err);
        return res.status(500).json({message: "Server Error"});
    }
});

// 2. GET /books
app.get('/books', async (req, res) => {
    // Request handling
    const {start_id, end_id} = req.body;
    if(!start_id || !end_id){
        return res.status(400).json({message: 'Kindly fill the required details'});
    }

    try{
        const [books] = await db.promise().query(
            'SELECT book_name, author_name  FROM books WHERE id >= ? AND id <= ?',
            [start_id, end_id]
        );

        return res.json({books});
    }catch(err){
        console.error('Error fetching books:', error);
        res.status(500).json({ error: 'Server error' })
    }
});

// 3. GET /books/:id
app.get('/books/:id', async (req, res) => {
    // Request handling
    const bookId = req.params.id;

    try {
        // Check whether given book id is present or not
        const [bookInfo] = await db.promise().query(
            'SELECT book_name, author_name, total_rating, total_reviews, reviews FROM books WHERE id = ?',
            [bookId]
        );

        if (bookInfo.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const book = bookInfo[0];

        // Retreive Reviews and Ratings and evaluate average rating
        const totalReviews = book.total_reviews || 0;
        const totalRating = book.total_rating || 0;

        const average_rating = totalReviews > 0
            ? (totalRating / totalReviews).toFixed(2)
            : "0";

       let parsedReviews = bookInfo[0].reviews || [];

       // Return required information
        res.json({
            book_name: book.book_name,
            author_name: book.author_name,
            average_rating,
            reviews: parsedReviews
        });

    } catch (error) {
        console.error('Error fetching book details:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 4. POST /books/:id/reviews
app.post('/books/:id/reviews', async(req, res) => {
    // Request handling
    const bookId = req.params.id;
    const {user_id, review, rating} = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if(!token){
        return res.status(400).json({message: "Token missing"});
    }
    if(!user_id || ! review || !rating){
        return res.status(400).json({message: "Required fields missing"});
    }

    try{

        // Check whether the user exists
        const [userDetail] = await db.promise().query(
            'SELECT * FROM users WHERE user_id = ?',
            [user_id]
        );
        if(userDetail.length === 0){
            return res.status(400).json({message: "User doesn't exist"});
        }

        // Validate authorization token
        const storedToken = userDetail[0].token;
        if(token !== storedToken){
            return res.status(401).json({message: "Unauthorized access"});
        }

        // Retreive book information
        const [bookInfo] = await db.promise().query(
            'SELECT * FROM books WHERE id = ?',
            [bookId]
        );
        if(bookInfo.length === 0){
            return res.status(404).json({message: "Book not found"});
        }

        // Retreive all the reviews. If not available return empty array
        let reviews = bookInfo[0].reviews || [];

        // If review for the user_id already exists decline the operation
        if (reviews.some(r => r.user_id === user_id)) {
            return res.status(400).json({ error: 'Review already exists. Use edit instead.' });
        }

        // Update the Total Ratings and Reviews section
        reviews.push({ user_id, review, rating });
        const updatedTotalRating = bookInfo[0].total_rating + rating;
        const updatedTotalReviews = bookInfo[0].total_reviews + 1;

        await db.promise().query(
            'UPDATE books SET reviews = ?, total_rating = ?, total_reviews = ? WHERE id = ?',
            [JSON.stringify(reviews), updatedTotalRating, updatedTotalReviews, bookId]
        );

        res.json({ message: 'Review added successfully' });

    }catch(err){
        console.log('POST /books/:id/reviews error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 5. PUT /reviews/:id
app.put('/reviews/:id', async(req, res)=>{
    // Request Handling
    const bookId = req.params.id;
    const { user_id, review, rating } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if(!token){
        return res.status(400).json({message: "Token missing"});
    }

    if(!user_id || !review || !rating){
        return res.status(400).json({message: "Kindly fill required details"});
    }

    try{
        // Check whether the user is authorized
        const [userInfo] = await db.promise().query(
            'SELECT * FROM users WHERE user_id = ?',
            [user_id]
        );

        if (userInfo.length === 0 || userInfo[0].token !== token) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get book and reviews
        const [bookInfo] = await db.promise().query('SELECT reviews, total_rating FROM books WHERE id = ?', [bookId]);
        if (bookInfo.length === 0) return res.status(404).json({ error: 'Book not found' });

        let reviews = bookInfo[0].reviews || [];

        if (!Array.isArray(reviews)) reviews = [];

        const index = reviews.findIndex(r => r.user_id === user_id);
        if (index === -1) return res.status(404).json({ error: 'Review not found' });

        const oldRating = reviews[index].rating;

        // Update the review
        reviews[index] = { user_id, review, rating };
        const updatedTotalRating = bookInfo[0].total_rating - oldRating + rating;

        // Update DB and acknowledge
        await db.promise().query(
            'UPDATE books SET reviews = ?, total_rating = ? WHERE id = ?',
            [JSON.stringify(reviews), updatedTotalRating, bookId]
        );

        res.json({ message: 'Review updated successfully' });
    }catch(err){
        console.log("Error while editing review", err);
        return res.status(500).json({message: "Server Error"});
    }
});

// 6. Delete Review API
app.delete('/reviews/:id', async (req, res) => {
    // Request handling
    const bookId = req.params.id;
    const { user_id } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token || !user_id) {
        return res.status(400).json({ error: 'Missing token or user_id' });
    }

    try {
        // Check token authorization
        const [userInfo] = await db.promise().query('SELECT token FROM users WHERE user_id = ?', [user_id]);
        if (userInfo.length === 0 || userInfo[0].token !== token) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Fetch book with reviews
        const [bookInfo] = await db.promise().query('SELECT reviews, total_rating, total_reviews FROM books WHERE id = ?', [bookId]);
        if (bookInfo.length === 0) return res.status(404).json({ error: 'Book not found' });

        let reviews = bookInfo[0].reviews || [];
        if (!Array.isArray(reviews)) reviews = [];

        const index = reviews.findIndex(r => r.user_id === user_id);
        if (index === -1) return res.status(404).json({ error: 'Review not found' });

        const userRating = reviews[index].rating;

        // Remove review
        reviews.splice(index, 1);
        const updatedTotalRating = bookInfo[0].total_rating - userRating;
        const updatedTotalReviews = Math.max(bookInfo[0].total_reviews - 1, 0); 

        // Update DB
        await db.promise().query(
            'UPDATE books SET reviews = ?, total_rating = ?, total_reviews = ? WHERE id = ?',
            [JSON.stringify(reviews), updatedTotalRating, updatedTotalReviews, bookId]
        );

        res.json({ message: 'Review deleted successfully' });

    } catch (error) {
        console.error('DELETE /reviews/:id error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 7. GET search
app.get('/books/search', async (req, res) => {
    console.log("Query is called");
    const searchQuery = req.query.query;
    console.log("Here is searchQuery", searchQuery);

    if (!searchQuery) {
        return res.status(400).json({ error: 'Missing search query' });
    }

    try {
        
        const [results] = await db.promise().query(
            `SELECT id, book_name, author_name 
             FROM books 
             WHERE book_name LIKE ? OR author_name LIKE ?`,
            [`%${searchQuery}%`, `%${searchQuery}%`]
        );

        res.json({ results });
    } catch (error) {
        console.error('GET /books/search error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/books/searchagain', async (req, res) => {
    const {searchQuery} = req.body;
    if(searchQuery){
        return res.status(400).json({message: 'Missing search query'});
    }

    try{
        const [results] = await db.promise().query(
            'SELECT * FROM books WHERE book_name LIKE ? OR author_name LIKE ?',
            ['%${searchQuery}%', '%${searchQuery}%']
        );
        res.json({results});

    }catch(err){
        console.log('Error finding', err);
        res.status(500).json({error: "Server Error"});
    }
});

// Main
const PORT = process.env.PORT;
app.listen(PORT, () =>{
    console.log(`Server running on port ${PORT}`);
});