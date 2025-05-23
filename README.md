
# Book Review System Assignment

## 1. Introduction

This project has been developed as part of a **Mini Assignment** and serves as a **simplified backend system for a Book Review Platform**. It enables users to perform key operations such as:

- **User authentication and authorization**
- **Book listing and search**
- **Adding, editing, and deleting reviews**
- **Retrieving book and review data**

The project emphasizes core backend development principles like RESTful API design, JWT-based authentication, SQL-based data management, and secure data handling.

---

## 2. Tech Stack

| Technology     | Purpose                              |
|----------------|--------------------------------------|
| Node.js        | JavaScript runtime for backend logic |
| Express.js     | Framework for building REST APIs     |
| MySQL          | Relational database for storing user and book data |

---

## 3. Node.js Libraries Used

| Library        | Use Case                                                                  |
|----------------|---------------------------------------------------------------------------|
| `mysql2`       | Interacts with MySQL database using promises                              |
| `jsonwebtoken` | Handles JWT token generation and verification for secure authentication   |
| `bcrypt`       | Securely hashes user passwords before storing them in the database        |
| `dotenv`       | Loads environment variables from a `.env` file for configuration          |

---

## 4. SQL Database Schema

### 4.1 `users` Table

| Column     | Type      | Description                          |
|------------|-----------|--------------------------------------|
| user_id    | INT       | Primary key                          |
| username   | VARCHAR   | User’s unique name                   |
| password   | VARCHAR   | Hashed password                      |
| token      | VARCHAR   | JWT token issued at login            |

### 4.2 `books` Table

| Column         | Type      | Description                                |
|----------------|-----------|--------------------------------------------|
| id             | INT       | Primary key                                |
| book_name      | VARCHAR   | Title of the book                          |
| author_name    | VARCHAR   | Author of the book                         |
| total_rating   | INT       | Sum of all ratings                         |
| total_reviews  | INT       | Count of all reviews                       |
| reviews        | TEXT (JSON) | Array of review objects (user_id, review, rating) |

---
## 5. Setup Instructions

### 5.1 Ensure that following are installed
- Node.js
- MySQL Server
- Git
### 5.2 Repository Setup
- Clone this repository into your system.
- Install all dependencies using the following command<br>
`npm install`
- Create the .env file and set it up with following content<br>
```
DB_HOST=localhost <br>
DB_USER=root <br>
DB_PASSWORD=your_password<br>
DB_NAME=book_review_system<br>
JWT_SECRET=your_jwt_secret<br>
```
### 5.3 Database Setup
- Start MySQL and create a database using the below command <br>
`CREATE DATABASE book_review_system`
- Create tables users and books with above mentioned schemas.

### 5.4 Start the server
Start the server using the below command<br>
`node server.js`

### 5.5 Access the API Endpoints
Access the API endpoints by running the given curl commands in the following section on the terminal.

## 6. API Description

### 6.1 `POST /signup`

| Field             | Description |
|------------------|-------------|
| **Method**        | POST |
| **Purpose**       | Registers a new user |
| **Authorization** | Not Required |
| **Sample Input**  | `{ "username" : "Anish100", "name" : "Anish Rathod", "password": "password"}` |
| **Sample Output** | `{"message": "User created successfully", "userID": 4, "username": "Anish100", "name": "Anish Rathod","token": "....."}` |
| **Curl Command**  | `curl -X POST http://localhost:3000/signup -H "Content-Type: application/json" -d '{ "username" : "Anish100", "name" : "Anish Rathod", "password": "password"}'` |

### 6.2 `POST /login`

| Field             | Description |
|------------------|-------------|
| **Method**        | POST |
| **Purpose**       | Authenticates user and returns JWT token |
| **Authorization** | Not required |
| **Sample Input**  | `{"username" : "Bindusara234","password": "password"}` |
| **Sample Output** | `{"message": "Login Successful","userID": 3,"name": "Bindusara Maurya","username": "Bindusara234","token": "..."}` |
| **Curl Command**  | `curl -X POST http://localhost:3000/login -H "Content-Type: application/json" -d '{"username" : "Bindusara234","password": "password"}'` |

### 6.3 `POST /books`

| Field             | Description |
|------------------|-------------|
| **Method**        | POST |
| **Purpose**       | Creates new Entry for books |
| **Authorization** | JWT Token Required|
| **Sample Input**  | `{"user_id": 1,"book_name": "Adventures of Chandragupta","author_name": "Chanakya"}`|
| **Sample Output** | `{"message": "The required entry for book is created"}` |
| **Curl Command**  | `curl -X POST http://localhost:3000/books -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"user_id": 1,"book_name": "Adventures of Chandragupta","author_name": "Chanakya"}'` |

### 6.4 `GET /books` 

| Field             | Description |
|------------------|-------------|
| **Method**        | GET |
| **Purpose**       | Gives a List of all books available |
| **Authorization** | Not Required |
| **Sample Input**  | `{"start_id": 1,"end_id": 5}` These ids define start and end book ids for searching|
| **Sample Output** | `{"books": [{"book_name": "Chanakya Niti","author_name": "Chanakya"},{"book_name": "Adventures of Chandragupta","author_name": "Chanakya"}]}` |
| **Curl Command**  | `curl -X GET http://localhost:3000/books \ -H "Content-Type: application/json" \ -d '{"start_id": 1, "end_id": 5}'` |

### 6.5 `POST /books/:id/reviews`

| Field             | Description |
|------------------|-------------|
| **Method**        | POST |
| **Purpose**       | Adds a new review for a book |
| **Authorization** | JWT token required |
| **Sample Input**  | `{ "user_id": 1, "review": "Excellent!", "rating": 5 }` |
| **Sample Output** | `{ "message": "Review added successfully" }` |
| **Curl Command**  | `curl -X POST http://localhost:3000/books/1/reviews -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"user_id":1,"review":"Excellent!","rating":5}'` |

### 6.6 `PUT /books/:id/reviews/:user_id` 

| Field             | Description |
|------------------|-------------|
| **Method**        | PUT |
| **Purpose**       | Edits a user’s review for a book |
| **Authorization** | JWT token required |
| **Sample Input**  | `{ "review": "Updated review", "rating": 4 }` |
| **Sample Output** | `{ "message": "Review updated successfully" }` |
| **Curl Command**  | `curl -X PUT http://localhost:3000/books/1/reviews/1 -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"review":"Updated review","rating":4}'` |

### 6.7 `DELETE /books/:id/reviews/:user_id` 

| Field             | Description |
|------------------|-------------|
| **Method**        | DELETE |
| **Purpose**       | Deletes a user’s review for a book |
| **Authorization** | JWT token required |
| **Sample Input**  | `N/A` |
| **Sample Output** | `{ "message": "Review deleted successfully" }` |
| **Curl Command**  | `curl -X DELETE http://localhost:3000/books/1/reviews/1 -H "Authorization: Bearer <token>"` |

### 6.8 `GET /user/:user_id/reviews

| Field             | Description |
|------------------|-------------|
| **Method**        | GET |
| **Purpose**       | Fetches all reviews submitted by a user |
| **Authorization** | JWT token required |
| **Sample Input**  | `N/A` |
| **Sample Output** | `[ { "book_id": 1, "review": "Great!", "rating": 5 }, ... ]` |
| **Curl Command**  | `curl -X GET http://localhost:3000/user/1/reviews -H "Authorization: Bearer <token>"` |