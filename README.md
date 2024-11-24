#ExoSpace

This repository contains the full-stack implementation of the ExoSpace application, including the frontend, backend, and automated test cases. The app allows users to interact with spaces, elements, and maps, providing both user and admin roles with different levels of access to manage the space and elements within.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Technologies](#technologies)
- [Project Structure](#project-structure)
- [Installation Instructions](#installation-instructions)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Running Tests](#running-tests)
- [API Endpoints](#api-endpoints)
  - [Arena Endpoints](#arena-endpoints)
  - [Admin Endpoints](#admin-endpoints)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

This application is built to provide a system where users can create, manage, and interact with spaces and elements. There are two types of users in the app: **admin** and **user**.

- **Admins** can create and manage elements, maps, and avatars, as well as perform other administrative actions.
- **Users** can interact with spaces, add or remove elements, and view information related to the spaces they're assigned to.

### Key Features:
- **User Management**: Admins can manage user signups, logins, and roles.
- **Space Management**: Users can create and manage spaces, adding elements to those spaces.
- **Element Management**: Admins can create, update, and delete elements, as well as add them to maps.
- **Map Management**: Admins can create maps and assign elements to them.
- **Test Suite**: The project includes automated tests for verifying the integrity of API endpoints for both user and admin functionalities.

---

## Technologies

The project uses the following technologies:

- **Frontend**: React, JavaScript, CSS
- **Backend**: Node.js, Express.js, Axios for HTTP requests
- **Database**: (Mention if you're using a database like MongoDB, PostgreSQL, etc.)
- **Testing**: Jest, Supertest, and Axios for API testing