# ExamHub Admin Panel

ExamHub is a comprehensive admin panel for managing exams, students, results, announcements, and support for IIT and NEET aspirants. The frontend is built with React, Vite, and Tailwind CSS, while the backend uses Node.js, Express.js, and MySQL for data management. Authentication is handled via JWT for admin users.

## Features
- **Dashboard**: Overview of key metrics like total students, upcoming exams, and recent announcements.
- **Exam Management**: Create, edit, and manage exams, including adding questions (MCQ, descriptive, numerical) and bulk uploads via Excel.
- **Student Management**: View and manage student profiles, performance, and status.
- **Results Analysis**: Analyze exam results, top performers, subject-wise scores, and export data.
- **Announcements & Media**: Create and manage announcements, posters, and videos for students.
- **Settings**: Configure general, notification, security, backup, and subject management settings.
- **Help & Support**: FAQs, guides, video tutorials, and support ticket submission.
- **Authentication**: Secure login/logout for admins using JWT.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router.
- **Backend**: Node.js, Express.js, MySQL (mysql2), bcryptjs (password hashing), jsonwebtoken (JWT).
- **Database**: MySQL with schema for users, exams, questions, announcements, etc.
- **Tools**: dotenv for environment variables, cors for cross-origin requests.

## Folder Structure
```
etc_mentors-main/
├── examhub-backend/          # Backend source
│   ├── config/               # DB connection (db.js)
│   │   └── db.js
│   ├── controllers/          # Controllers for routes
│   │   └── authController.js # Login logic
│   ├── middleware/           # Middleware
│   │   └── auth.js           # JWT auth middleware
│   ├── routes/               # API routes
│   │   ├── auth.js           # Auth routes (/api/auth/login)
│   │   └── dashboard.js      # Dashboard routes
│   ├── db/                   # DB scripts
│   │   └── iteration1_exam_hub_db_creation.sql  # SQL for DB setup
│   ├── .env                  # Environment variables (JWT_SECRET, DB creds)
│   ├── server.js             # Express server entry
│   └── package.json          # Backend dependencies
├── src/                      # Frontend source
│   ├── components/           # React components
│   │   ├── Sidebar.tsx
│   │   ├── Login.tsx
│   │   ├── ProtectedLayout.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ExamManagement.tsx
│   │   ├── StudentManagement.tsx
│   │   ├── ResultsAnalysis.tsx
│   │   ├── AnnouncementsMedia.tsx
│   │   ├── Settings.tsx
│   │   └── HelpSupport.tsx
│   └── App.tsx               # Main app with routes
├── .env                      # Frontend env (if needed, e.g., API_URL)
├── vite.config.ts            # Vite config (with proxy for /api to backend)
├── tailwind.config.js        # Tailwind CSS config
├── package.json              # Frontend dependencies
└── README.md                 # This file
```

## Installation

### Prerequisites
- Node.js (v18+)
- MySQL (v8+)
- Git

### 1. Clone the Repository
```
git clone <repo-url>
cd etc_mentors-main
```

### 2. Setup Database
- Install MySQL and create a database named `ExamHubDB`.
- Run the SQL script to create tables and insert sample data:
  ```
  mysql -u root -p ExamHubDB < examhub-backend/db/iteration1_exam_hub_db_creation.sql
  ```
- Update passwords in the script if needed (e.g., admin password hash for 'adminpass').

### 3. Setup Backend
```
cd examhub-backend
npm install
```
- Create `.env` in `examhub-backend/`:
  ```
  PORT=5000
  JWT_SECRET=your-strong-secret-key  # Generate a strong key
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=your-mysql-password
  DB_NAME=ExamHubDB
  ```
- Start backend:
  ```
  node server.js
  ```
- Test: Visit `http://localhost:5000/api/auth/login` (POST with {email: "admin1@examhub.com", password: "adminpass"}).

### 4. Setup Frontend
```
cd ..  # Back to root
npm install
```
- (Optional) Add proxy in `vite.config.ts` for API calls:
  ```ts
  export default {
    server: {
      proxy: {
        '/api': 'http://localhost:5000'
      }
    }
  };
  ```
- Start frontend:
  ```
  npm run dev
  ```
- Open `http://localhost:5173/login` (default Vite port).

## Usage
- Backend runs on port 5000.
- Frontend on port 5173 (proxies /api to backend).
- Login as admin: Email `admin1@examhub.com`, Password `adminpass`.
- Navigate via sidebar to components.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Development Notes
- **Authentication**: Only admins can access protected routes. Tokens are stored in localStorage.
- **API Protection**: All backend routes (e.g., /api/dashboard) use auth middleware.
- **DB Reference**: Use `db/iteration1_exam_hub_db_creation.sql` to reset/test DB.
- **Extensions**: Add more routes/controllers as needed (e.g., for students login in a separate app).

## Troubleshooting
- **404 on API**: Check route mounts in `server.js` and token in headers.
- **DB Errors**: Verify MySQL connection in `config/db.js` and env vars.
- **CORS**: Handled by cors middleware in backend.

## License
For open source projects, say how it is licensed.

## Project Status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.