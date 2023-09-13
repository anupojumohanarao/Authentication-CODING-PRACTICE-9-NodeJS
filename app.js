const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
const bcrypt = require("bcrypt");
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//1st POST register API
app.post("/register", async (request, response) => {
  let { username, name, password, gender, location } = request.body;
  let hashedPassword = await bcrypt.hash(password, 10);
  let selectUserQuery = `
  SELECT * FROM user
  WHERE username = '${username}'`;
  let dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    let createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        );`;
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      let mainUserDetails = await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//2nd POST login API
app.post("/login", async (request, response) => {
  let { username, password } = request.body;
  let selectUserQuery = `
  SELECT *
  FROM user
  WHERE username = '${username}'`;
  let dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let newPasswordQuery = await bcrypt.compare(password, dbUser.password);
    if (newPasswordQuery === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//3rd PUT change password API
app.put("/change-password", async (request, response) => {
  let { username, oldPassword, newPassword } = request.body;
  let selectUserQuery = `
  SELECT *
  FROM user
  WHERE username = '${username}'`;
  let dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    let newChangePassword = await bcrypt.compare(oldPassword, dbUser.password);

    if (newChangePassword === true) {
      let newLength = newPassword.length;
      if (newLength < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        let newEncryptedPassword = await bcrypt.hash(newPassword, 10);
        let updateQuery = `
        UPDATE user 
        SET password = '${newEncryptedPassword}'
        WHERE username = '${username}'`;
        await db.run(updateQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
